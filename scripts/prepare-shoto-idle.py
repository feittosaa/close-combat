"""Prepare the current idle source for the game without changing its colors."""
from pathlib import Path
import json
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = root / 'assets/art/characters/shoto/revisao/espera.png'
target = root / 'src/assets/sprites/characters/shoto'
image = np.asarray(Image.open(source).convert('RGBA')).copy()
rgb = image[:, :, :3].astype(np.int16)
magenta = np.minimum(rgb[:, :, 0], rgb[:, :, 2])
background = (magenta > 70) & (magenta > rgb[:, :, 1] * 1.5)
image[background, 3] = 0
bounds = [(30, 378), (379, 723), (727, 1072), (1076, 1421), (1424, 1770), (1772, 2117)]
# Keep the rake shaft at the same horizontal position throughout the idle.
anchors = [215, 562, 910, 1258, 1608, 1955]
width, height = 480, image.shape[0]
sheet = Image.new('RGBA', (width * len(bounds), height))
frames = {}
for index, (left, right) in enumerate(bounds):
    frame = Image.fromarray(image[:, left:right])
    sheet.paste(frame, (index * width + width // 2 - (anchors[index] - left), 0))
    frames[str(index)] = {
        'frame': {'x': index * width, 'y': 0, 'w': width, 'h': height},
        'rotated': False, 'trimmed': False,
        'spriteSourceSize': {'x': 0, 'y': 0, 'w': width, 'h': height},
        'sourceSize': {'w': width, 'h': height},
    }
target.mkdir(parents=True, exist_ok=True)
sheet.save(target / 'idle.png')
(target / 'idle.atlas.json').write_text(json.dumps({'frames': frames}, indent=2) + '\n')
