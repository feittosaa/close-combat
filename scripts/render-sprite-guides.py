"""Draw every sprite frame as the game places it, over its hurtbox, floor line and idle head line.

Run through `npm run guides:sprites`; `python3 scripts/render-sprite-guides.py walk hurt` draws only
those sheets, for every fighter that has them, into `focus.png`. Reads `review/sprite-guides/layout.json` (written by
`scripts/export-sprite-layout.ts` from the same code the game uses) and writes one PNG page per
fighter and group of sheets in `review/sprite-guides/`. The pages are generated for visual review
and are not versioned. Colours: green floor, yellow standing hurtbox top (idle head line), red
hurtbox of the posture the sheet is judged as.
"""
from pathlib import Path
import json
import sys

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
CHARACTERS = ROOT / 'src/assets/sprites/characters'
OUTPUT = ROOT / 'review/sprite-guides'
ZOOM, CELL_W, CELL_H, LABEL, SHEETS_PER_PAGE = .55, 230, 250, 18, 10
HURTBOX = {'standing': 'standing', 'crouching': 'crouching', 'airborne': 'airborne', 'lying': 'knockdown', None: 'standing'}


def frames_of(fighter, name):
    image = Image.open(CHARACTERS / fighter / f'{name}.png').convert('RGBA')
    frames = json.loads((CHARACTERS / fighter / f'{name}.atlas.json').read_text())['frames']
    for key in sorted(frames, key=int):
        rect = frames[key]['frame']
        yield image.crop((rect['x'], rect['y'], rect['x'] + rect['w'], rect['y'] + rect['h']))


def draw_cell(page, draw, origin, fighter, sheet, frame, image):
    left, top = origin
    feet_x, floor_y = left + CELL_W / 2, top + CELL_H - 22
    standing = fighter['hurtboxes']['standing']
    draw.line((left, floor_y, left + CELL_W, floor_y), fill=(40, 170, 60), width=1)
    head_y = floor_y + standing['offsetY'] * ZOOM
    draw.line((left, head_y, left + CELL_W, head_y), fill=(230, 200, 30), width=1)
    box = fighter['hurtboxes'][HURTBOX[sheet['kind']]]
    x0 = feet_x + (box['offsetX'] - box['width'] / 2) * ZOOM
    y0 = floor_y + box['offsetY'] * ZOOM
    side = fighter['frameWorld'] * frame['scale'] * ZOOM
    sprite = image.resize((max(1, round(side * image.width / image.height)), max(1, round(side))))
    x = feet_x - sprite.width / 2 + frame['shift'] * sprite.width
    y = floor_y - frame['anchor'] * sprite.height
    page.alpha_composite(sprite, (round(x), round(y)))
    draw.rectangle((x0, y0, x0 + box['width'] * ZOOM, y0 + box['height'] * ZOOM), outline=(220, 40, 40), width=2)


def render(names, target):
    page = Image.new('RGBA', (CELL_W * 6, (CELL_H + LABEL) * len(names)), (250, 250, 250, 255))
    draw = ImageDraw.Draw(page)
    for row, (owner, name) in enumerate(names):
        sheet = owner['sheets'][name]
        top = row * (CELL_H + LABEL)
        scales = '/'.join(f"{frame['scale']:g}" for frame in sheet['frames'])
        status = 'validada' if sheet['validated'] else 'modelo por postura'
        draw.text((4, top + 3), f"{owner['name']} · {name} · {sheet['kind'] or 'nao julgada'} · {status} · escala {scales}", fill=(20, 20, 20))
        for column, image in enumerate(frames_of(owner['id'], name)):
            if column < len(sheet['frames']):
                draw_cell(page, draw, (column * CELL_W, top + LABEL), owner, sheet, sheet['frames'][column], image)
    page.convert('RGB').save(target)
    print(target.relative_to(ROOT))


def main():
    layout = json.loads((OUTPUT / 'layout.json').read_text())
    if focus := sys.argv[1:]:
        render([(fighter, name) for name in focus for fighter in layout if name in fighter['sheets']], OUTPUT / 'focus.png')
        return
    for fighter in layout:
        names = [(fighter, name) for name in fighter['sheets']]
        for start in range(0, len(names), SHEETS_PER_PAGE):
            render(names[start:start + SHEETS_PER_PAGE], OUTPUT / f"{fighter['id']}-{start // SHEETS_PER_PAGE + 1:02d}.png")


if __name__ == '__main__':
    main()
