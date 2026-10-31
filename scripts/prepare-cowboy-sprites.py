"""Prepare approved preview sheets as fixed-cell atlases without recoloring their pixels."""
from pathlib import Path
import json
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1] / 'src/assets/sprites/characters/cowboy'
SIZE = 640
FOOT = 465
ALIGNMENT = json.loads((ROOT / 'alignment.json').read_text())['clips']
for source in sorted((ROOT / 'source').glob('*.png')):
    magic = source.stem.startswith('magic-')
    effect = source.stem.startswith('effect-') or magic
    keyed = ALIGNMENT[source.stem].get('background') == 'magenta'
    raw = Image.open(source).convert('RGBA')
    width, height = raw.size
    sheet = Image.new('RGBA', (SIZE * 6, SIZE))
    records = {}
    if not effect:
        config = ALIGNMENT[source.stem]
        row_y = config.get('rowY', round(height / 2))
        widths = [b - a for row in config['seams'] for a, b in zip([0, *row], [*row, width])]
        # A single scale for both rows prevents the fighter from breathing in size.
        factor = min(0.9 * config['scale'], (SIZE - 8) / max(widths),
                     (SIZE - 8) / max(row_y, height - row_y))
    for i in range(6):
        nominal_left, nominal_right = round((i % 3) * width / 3), round((i % 3 + 1) * width / 3)
        if effect:
            left, right = nominal_left, nominal_right
        else:
            seams = [0, *ALIGNMENT[source.stem]['seams'][i // 3], width]
            left, right = seams[i % 3], seams[i % 3 + 1]
        row_y = ALIGNMENT[source.stem].get('rowY', round(height / 2))
        top, bottom = (0, row_y) if i < 3 else (row_y, height)
        inset = ALIGNMENT[source.stem].get('inset', 0)
        left, right, top, bottom = left + inset, right - inset, top + inset, bottom - inset
        cell = np.array(raw.crop((left, top, right, bottom)))
        if not effect or keyed:
            rgb = cell[:,:,:3].astype(int)
            # Remove connected paper background; preserve every non-background RGB value.
            bg = np.median(np.concatenate([rgb[:5,:].reshape(-1,3), rgb[-5:,:].reshape(-1,3), rgb[:,:5].reshape(-1,3), rgb[:,-5:].reshape(-1,3)]),axis=0)
            candidate = np.max(np.abs(rgb-bg),axis=2) < 24
            if ALIGNMENT[source.stem].get('background') == 'magenta':
                # Discard magenta key spill as transparency without changing retained RGB.
                r, g, b = rgb[:,:,0], rgb[:,:,1], rgb[:,:,2]
                candidate |= (r > 120) & (b > 120) & (r * 10 > g * 13) & (b * 10 > g * 13)
            seed = np.zeros(candidate.shape, bool)
            seed[0,:] = seed[-1,:] = True
            seed[:,0] = seed[:,-1] = True
            background = candidate if ALIGNMENT[source.stem].get('background') == 'magenta' else ndimage.binary_propagation(seed & candidate, mask=candidate)
            # Large enclosed areas of the same paper, such as the gap between
            # walking legs, are background too; keep small light costume regions.
            paper_labels, _ = ndimage.label(candidate & ~background)
            paper_sizes = np.bincount(paper_labels.ravel()); paper_sizes[0] = 0
            enclosed_paper = paper_sizes[paper_labels] > 4000
            # Reviewed seed coordinates identify smaller enclosed paper areas.
            for x, y in ALIGNMENT[source.stem].get('backgroundSeeds', {}).get(str(i), []):
                component = paper_labels[y, x]
                if component:
                    enclosed_paper |= paper_labels == component
            cell[:,:,3][background | enclosed_paper] = 0
            # Ground reference strokes are not part of the sprite.
            mask = cell[:,:,3] > 0
            labels, count = ndimage.label(mask)
            objects = ndimage.find_objects(labels)
            for label_id, box in enumerate(objects, 1):
                if box is None: continue
                h, w = box[0].stop-box[0].start, box[1].stop-box[1].start
                # Loose paper strokes and pieces of the next row are not part of this pose.
                floor_stroke = h <= 12 and w > 25 and (box[0].start < 24 or box[0].stop > cell.shape[0] - 80)
                row_fragment = box[0].start > cell.shape[0] * .92 and np.count_nonzero(labels[box] == label_id) < 4000
                if not magic and (floor_stroke or row_fragment):
                    cell[:,:,3][labels == label_id] = 0
        alpha = cell[:,:,3]
        if magic:
            # The approved arms are a separate layer, anchored behind the torso.
            crop = Image.fromarray(cell).resize((282, 282), Image.Resampling.LANCZOS)
            x, y = 179, 58
        elif effect:
            # True alpha comes from source; frame's authored composition is kept.
            crop = Image.fromarray(cell)
            crop.thumbnail((SIZE,SIZE),Image.Resampling.LANCZOS)
            x, y = (SIZE-crop.width)//2, (SIZE-crop.height)//2
        else:
            # Grid coordinates define a fixed origin; moving limbs never recenter a frame.
            components, _ = ndimage.label(alpha > 0)
            counts = np.bincount(components.ravel()); counts[0] = 0
            cell[:,:,3][counts[components] < 100] = 0
            crop = Image.fromarray(cell)
            crop = crop.resize((round(crop.width*factor),round(crop.height*factor)),Image.Resampling.LANCZOS)
            center = ALIGNMENT[source.stem].get('anchorX', [(nominal_left + nominal_right) / 2] * 6)[i]
            x = round(SIZE / 2 - (center-left) * factor)
            y = FOOT-round(ALIGNMENT[source.stem]['roots'][i]*factor)
        # Reviewed detached fragments belong to an adjacent source cell, not this pose.
        discarded = ALIGNMENT[source.stem].get('discardComponents', {}).get(str(i), [])
        if discarded:
            data = np.array(crop)
            labels, _ = ndimage.label(data[:,:,3] > 100)
            for label, box in enumerate(ndimage.find_objects(labels), 1):
                if box is None: continue
                yy, xx = box
                for x0, y0, x1, y1 in discarded:
                    if x0 <= xx.start+x and xx.stop+x <= x1 and y0 <= yy.start+y and yy.stop+y <= y1:
                        data[:,:,3][labels == label] = 0
                        break
            crop = Image.fromarray(data)
        # Clip to this frame before composing the sheet: a long effect from one
        # source cell must never spill into the next animation frame.
        frame = Image.new('RGBA', (SIZE, SIZE))
        frame.alpha_composite(crop, (x, y))
        sheet.alpha_composite(frame, (i * SIZE, 0))
        records[str(i)] = {'frame':{'x':i*SIZE,'y':0,'w':SIZE,'h':SIZE},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':SIZE,'h':SIZE},'sourceSize':{'w':SIZE,'h':SIZE}}
    sheet.save(ROOT / f'{source.stem}.png',optimize=True)
    (ROOT / f'{source.stem}.atlas.json').write_text(json.dumps({'frames':records,'meta':{'image':f'{source.stem}.png','size':{'w':SIZE*6,'h':SIZE},'scale':'1'}},indent=2)+'\n')
