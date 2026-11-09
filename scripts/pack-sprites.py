"""Trimmed layout of every character sheet, used by the game to keep only the drawn part of each frame in memory.

Uso: python3 scripts/pack-sprites.py (rodado por `prepare-sprites.py`).
Para cada `<folha>.png` com `<folha>.atlas.json` (qualidade normal e alta), grava `<folha>.packed.json`: o retângulo de
cada quadro em volta dos pixels visíveis, com margem transparente, e sua posição numa folha compacta montada pelo jogo
ao carregar (`src/rendering/packedAtlas.ts`). Folhas e atlas originais nunca são alterados; o tamanho e o pivô de cada
quadro continuam os do atlas original (`sourceSize`/`spriteSourceSize`). `sourceHash` guarda o hash da folha e do atlas de
origem: só folhas novas ou alteradas são recortadas de novo, e um teste impede layout desatualizado.
"""
from hashlib import sha256
from pathlib import Path
import json

import numpy as np
from PIL import Image

CHARACTERS = Path(__file__).resolve().parents[1] / 'src/assets/sprites/characters'
# Texels kept around each drawing and between packed frames: linear filtering at a cut edge samples the same
# transparent neighbours it had in the original sheet.
MARGIN, GAP = 2, 2


def source_hash(sheet: Path, atlas: Path) -> str:
    return sha256(sheet.read_bytes() + atlas.read_bytes()).hexdigest()[:16]


def trim(alpha: np.ndarray, rect: dict) -> tuple[int, int, int, int]:
    """Visible box of one frame plus the margin, clamped to the frame, in frame coordinates."""
    frame = alpha[rect['y']:rect['y'] + rect['h'], rect['x']:rect['x'] + rect['w']]
    rows, columns = np.nonzero(frame.any(axis=1))[0], np.nonzero(frame.any(axis=0))[0]
    if not len(rows): return 0, 0, 1, 1
    left, top = max(0, columns[0] - MARGIN), max(0, rows[0] - MARGIN)
    right, bottom = min(rect['w'], columns[-1] + 1 + MARGIN), min(rect['h'], rows[-1] + 1 + MARGIN)
    return int(left), int(top), int(right - left), int(bottom - top)


def pack(sheet: Path, atlas: Path) -> dict:
    image = Image.open(sheet)
    alpha = np.array(image.convert('RGBA').getchannel('A')) > 0
    frames = json.loads(atlas.read_text())['frames']
    trims = {key: trim(alpha, frames[key]['frame']) for key in frames}
    order = sorted(trims, key=lambda key: (-trims[key][3], int(key) if key.isdigit() else key))

    def shelves(width: int) -> tuple[int, dict]:
        """Shelf packing in rows of at most `width`, tallest frames first; returns the height and each frame's place."""
        x, y, shelf, places = 0, 0, 0, {}
        for key in order:
            w, h = trims[key][2:]
            if x and x + w > width: x, y, shelf = 0, y + shelf + GAP, 0
            places[key] = (x, y); x += w + GAP; shelf = max(shelf, h)
        return y + shelf, places

    # The smallest sheet among the widths that keep it within the original's largest side (frames already filling
    # their cells may need the gaps beyond it).
    limit = max(image.size)
    candidates = [(width, *shelves(width)) for width in range(max(trim[2] for trim in trims.values()), limit + 1)]
    fitting = [candidate for candidate in candidates if candidate[1] <= limit] or candidates
    width, height, places = min(fitting, key=lambda c: (c[0] * c[1], max(c[0], c[1])))
    packed = {}
    for key, entry in frames.items():
        rect, (left, top, w, h), (px, py) = entry['frame'], trims[key], places[key]
        packed[key] = {'frame': {'x': px, 'y': py, 'w': w, 'h': h}, 'rotated': False, 'trimmed': True,
                       'spriteSourceSize': {'x': left, 'y': top, 'w': w, 'h': h}, 'sourceSize': {'w': rect['w'], 'h': rect['h']},
                       'source': {'x': rect['x'] + left, 'y': rect['y'] + top}}
    return {'sourceHash': source_hash(sheet, atlas), 'frames': packed, 'meta': {'size': {'w': width, 'h': height}}}


def main() -> None:
    packed = 0
    for atlas in sorted(CHARACTERS.rglob('*.atlas.json')):
        sheet, target = atlas.with_name(atlas.name.replace('.atlas.json', '.png')), atlas.with_name(atlas.name.replace('.atlas.json', '.packed.json'))
        if not sheet.exists(): continue
        if target.exists() and json.loads(target.read_text()).get('sourceHash') == source_hash(sheet, atlas): continue
        target.write_text(json.dumps(pack(sheet, atlas), separators=(',', ':')) + '\n')
        packed += 1
    for target in CHARACTERS.rglob('*.packed.json'):
        if not target.with_name(target.name.replace('.packed.json', '.atlas.json')).exists(): target.unlink(); packed += 1
    print(f'Folhas recortadas: {packed}.')


if __name__ == '__main__':
    main()
