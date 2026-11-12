"""Prepara efeitos aprovados: recorta seis quadros, ajusta à grade 362×724 e remove magenta.
Uso: python3 scripts/prepare-grappler-trails.py [nome ...] (sem argumentos prepara todos)."""
from hashlib import sha256
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import json
import sys

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.dont_write_bytecode = True

def sibling(name):
    spec = spec_from_file_location(name.replace('-', '_'), ROOT / 'scripts' / f'{name}.py')
    module = module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main():
    cut, key = sibling('prepare-character-sheets'), sibling('key-magenta')
    registry_path = ROOT / 'src/assets/sprites/prepared.json'
    registry = json.loads(registry_path.read_text())
    names = ('grappler-trail-throw', 'grappler-trail-slam', 'grappler-trail-launcher', 'grappler-ultimate-soco')
    selected = sys.argv[1:] or names
    if unknown := set(selected) - set(names): raise SystemExit(f'Efeitos desconhecidos: {sorted(unknown)}')
    for name in selected:
        source = ROOT / f'assets/art/effects/contact/{name}.png'
        target = ROOT / f'src/assets/sprites/effects/contact/{name}.png'
        original = np.asarray(Image.open(source).convert('RGBA'))
        frames = cut.poses(source)
        scale = min(1, *(354 / data.shape[1] for data, _, _ in frames), *(700 / data.shape[0] for data, _, _ in frames))
        sheet = Image.new('RGBA', (2172, 724))
        for index, (data, top, left) in enumerate(frames):
            data[:, :, :3] = original[top:top + data.shape[0], left:left + data.shape[1], :3]
            image = Image.fromarray(data).resize((round(data.shape[1] * scale), round(data.shape[0] * scale)), Image.Resampling.LANCZOS)
            sheet.alpha_composite(image, (index * 362 + (362 - image.width) // 2, (724 - image.height) // 2))
        pixels = np.array(sheet)
        key.clean(pixels, key.SPRITE_HUE_TOLERANCE)
        Image.fromarray(pixels).save(target, optimize=True)
        registry['files'][target.relative_to(ROOT).as_posix()] = sha256(target.read_bytes()).hexdigest()
    registry['files'] = dict(sorted(registry['files'].items()))
    registry_path.write_text(json.dumps(registry, indent=1) + '\n')


if __name__ == '__main__':
    main()
