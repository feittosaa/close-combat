"""Measure the visible silhouette of every character spritesheet.

Run with `npm run measure:sprites` after adding or replacing a sheet. Two files are written beside
each fighter's sheets, holding only facts: `measurements.json` (silhouette height range and
body size, both as a fraction of the frame height; the engine derives the display scale from
them and from the fighter's hurtboxes) and `hues.json` (share of coloured pixels per 10-degree hue bin,
for the highlight-colour checks). Source images are never modified.
"""
from pathlib import Path
import colorsys
import json
import statistics

import numpy as np
from PIL import Image

CHARACTERS = Path(__file__).resolve().parents[1] / 'src/assets/sprites/characters'
ALPHA_THRESHOLD = 24
HUE_SHEETS = ('idle-normal', 'idle', 'walk', 'guard', 'light-punch', 'hurt')
MIN_CHROMA, HUE_BINS = .12, 36
# Body colours are the idle's own (in steps of COLOUR_STEP per channel, present in at least BODY_COLOUR_SHARE
# of its pixels); flames, magic, trails and props drawn with the body are left out of `cleanBodies`.
REFERENCE_SHEETS, COLOUR_STEP, BODY_COLOUR_SHARE = ('idle-normal', 'idle'), 24, .0005


def colour_keys(pixels):
    steps = pixels[:, :3].astype(int) // COLOUR_STEP
    return steps[:, 0] * 10000 + steps[:, 1] * 100 + steps[:, 2]


def frames_of(fighter, name):
    image = np.array(Image.open(fighter / f'{name}.png').convert('RGBA'))
    frames = json.loads((fighter / f'{name}.atlas.json').read_text())['frames']
    for key in sorted(frames, key=int):
        rect = frames[key]['frame']
        yield image[rect['y']:rect['y'] + rect['h'], rect['x']:rect['x'] + rect['w']]


def body_palette(fighter):
    reference = next(name for name in REFERENCE_SHEETS if (fighter / f'{name}.png').exists())
    keys, counts = np.unique(np.concatenate([colour_keys(frame[frame[:, :, 3] > 200]) for frame in frames_of(fighter, reference)]), return_counts=True)
    return keys[counts / counts.sum() >= BODY_COLOUR_SHARE]


def clean_bodies(fighter, name, palette):
    """Square root of the opaque area drawn in the idle's colours, per frame, as a fraction of the frame height."""
    return [round(float(np.isin(colour_keys(frame[frame[:, :, 3] > 200]), palette).sum()) ** .5 / frame.shape[0], 4)
            for frame in frames_of(fighter, name)]


def measure_sheet(fighter, name):
    """Silhouette height range, body size and, per frame, body size, body length and lowest opaque row.

    `body` is the square root of the opaque area: it stays about the same whether the fighter is
    upright, arched, crouched or lying, so it tells a drawing made too large from one that merely
    shows another posture. `lengths` (longest side of the silhouette) bounds a lying body by the
    standing height, `bottoms` lets lying poses rest on the floor line and `centers` (horizontal centre
    of mass, as a fraction of the frame width) lets loose poses sit centred on the hurtbox.
    """
    image = Image.open(fighter / f'{name}.png').convert('RGBA')
    frames = json.loads((fighter / f'{name}.atlas.json').read_text())['frames']
    heights, bodies, lengths, bottoms, centers = [], [], [], [], []
    for key in sorted(frames, key=int):
        rect = frames[key]['frame']
        mask = image.crop((rect['x'], rect['y'], rect['x'] + rect['w'], rect['y'] + rect['h'])) \
            .getchannel('A').point(lambda value: 255 if value > ALPHA_THRESHOLD else 0)
        box = mask.getbbox()
        pixels = mask.load()
        heights.append((box[3] - box[1]) / rect['h'] if box else 0)
        bodies.append(round((mask.histogram()[255] / rect['h'] ** 2) ** .5, 4))
        lengths.append(round(max(box[2] - box[0], box[3] - box[1]) / rect['h'], 4) if box else 0)
        bottoms.append(round(box[3] / rect['h'], 4) if box else 0)
        columns = [sum(1 for y in range(0, rect['h'], 2) if pixels[x, y]) for x in range(0, rect['w'], 2)] if box else []
        mass = sum(columns)
        centers.append(round(sum(index * 2 * count for index, count in enumerate(columns)) / mass / rect['w'], 4) if mass else .5)
    if not any(heights):
        return None
    visible = [height for height in heights if height]
    return {'minHeight': round(min(visible), 4), 'maxHeight': round(max(visible), 4),
            'body': round(statistics.median(body for body in bodies if body), 4), 'heights': [round(height, 4) for height in heights], 'bodies': bodies, 'lengths': lengths, 'bottoms': bottoms, 'centers': centers}


def hue_shares(fighter):
    counts = [0] * HUE_BINS
    for name in HUE_SHEETS:
        if not (fighter / f'{name}.png').exists():
            continue
        for r, g, b, a in Image.open(fighter / f'{name}.png').convert('RGBA').getdata():
            hue, light, _ = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            if a > 200 and (max(r, g, b) - min(r, g, b)) / 255 >= MIN_CHROMA and .08 < light < .92:
                counts[int(hue * HUE_BINS) % HUE_BINS] += 1
    total = sum(counts) or 1
    return [round(count / total, 4) for count in counts]


def main():
    for fighter in sorted(path for path in CHARACTERS.iterdir() if path.is_dir()):
        sheets, palette = {}, body_palette(fighter)
        for atlas in sorted(fighter.glob('*.atlas.json')):
            name = atlas.name.removesuffix('.atlas.json')
            if (fighter / f'{name}.png').exists() and (measured := measure_sheet(fighter, name)):
                measured['cleanBodies'] = clean_bodies(fighter, name, palette)
                measured['cleanBody'] = round(statistics.median(body for body in measured['cleanBodies'] if body) if any(measured['cleanBodies']) else 0, 4)
                sheets[name] = measured
        (fighter / 'measurements.json').write_text(json.dumps(sheets, indent=1) + '\n')
        (fighter / 'hues.json').write_text(json.dumps(hue_shares(fighter)) + '\n')
        print(f'{fighter.name}: {len(sheets)} sheets')


if __name__ == '__main__':
    main()
