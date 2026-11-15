"""Measures how light each stage is behind the fighters, column by column, and writes it to `lightmap.json` beside the stage.

The layers are composited in drawing order (first frame of the animated ones) and the luminance of the band where the
fighters stand is averaged per column; the fighters' light follows that profile (`characterColor.ts`).
"""
import json
from pathlib import Path
from PIL import Image

SCENES = Path('src/assets/scenes')
COLUMNS = 64
BAND = (320, 20)  # px above the floor: from the top of a standing fighter down to just above the feet
SMOOTH = 2        # columns on each side

for manifest in sorted(SCENES.glob('*/stage.json')):
    stage = json.loads(manifest.read_text())
    width, height = stage['referenceSize']['width'], stage['referenceSize']['height']
    canvas = Image.new('RGBA', (width, height), (0, 0, 0, 255))
    for layer in sorted(stage['layers'], key=lambda item: item['depth']):
        if layer['id'] == 'sombra' or layer['depth'] >= 0:
            continue
        image = Image.open(SCENES / layer.get('sourceStage', stage['id']) / layer['file']).convert('RGBA')
        size = layer.get('size')
        if size:
            image = image.resize((size['width'], size['height']))
        canvas.alpha_composite(image, (int(layer['x']), int(layer['y']))) if layer['x'] >= 0 and layer['y'] >= 0 else canvas.paste(image, (int(layer['x']), int(layer['y'])), image)
    top, bottom = stage['groundY'] - BAND[0], stage['groundY'] - BAND[1]
    gray = canvas.convert('L').crop((0, top, width, bottom)).resize((COLUMNS, 1), Image.BOX)
    raw = [value / 255 for value in gray.getdata()]
    smooth = [sum(raw[max(0, i - SMOOTH):i + SMOOTH + 1]) / len(raw[max(0, i - SMOOTH):i + SMOOTH + 1]) for i in range(COLUMNS)]
    (manifest.parent / 'lightmap.json').write_text(json.dumps({'luma': [round(value, 3) for value in smooth]}) + '\n')
    print(stage['id'], f'{min(smooth):.2f}–{max(smooth):.2f}')
