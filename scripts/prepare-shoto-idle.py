"""Prepare the idle with the rake in both qualities, with the background separation of `prepare-shoto-actions.py`."""
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import json
import sys
from PIL import Image

sys.dont_write_bytecode = True
spec = spec_from_file_location('prepare_shoto_actions', Path(__file__).with_name('prepare-shoto-actions.py'))
actions = module_from_spec(spec); spec.loader.exec_module(actions)

# Keep the rake shaft at the same horizontal position throughout the idle.
ANCHORS = [215, 562, 910, 1258, 1608, 1955]
WIDTH = 480

poses = actions.poses('espera.png', tuple(ANCHORS))
height = Image.open(actions.SOURCES / 'espera.png').height
for quality, target in ((1, actions.TARGET), (2, actions.TARGET / 'high')):
    width = WIDTH * quality
    sheet = Image.new('RGBA', (width * len(poses), height * quality))
    frames = {}
    for index, (data, top, left) in enumerate(poses):
        drawing = actions.resized(data, quality)
        x = index * width + quality * (WIDTH // 2 - (ANCHORS[index] - left))
        if x < index * width or x + drawing.width > (index + 1) * width:
            raise ValueError(f'idle: frame {index} exceeds its cell')
        sheet.paste(drawing, (x, top * quality))
        frames[str(index)] = {
            'frame': {'x': index * width, 'y': 0, 'w': width, 'h': height * quality},
            'rotated': False, 'trimmed': False,
            'spriteSourceSize': {'x': 0, 'y': 0, 'w': width, 'h': height * quality},
            'sourceSize': {'w': width, 'h': height * quality},
        }
    target.mkdir(parents=True, exist_ok=True)
    sheet.save(target / 'idle.png')
    (target / 'idle.atlas.json').write_text(json.dumps({'frames': frames}, indent=2) + '\n')
