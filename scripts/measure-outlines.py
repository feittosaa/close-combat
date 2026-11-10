"""Mede a espessura do contorno preto externo de cada quadro, para o jogo uniformizá-lo na tela.

Uso: python3 scripts/measure-outlines.py (rodado por `prepare-sprites.py` quando folhas de personagem mudam).
Para cada personagem com `outline.json` (`width`: espessura alvo do contorno na tela, em pixels do mundo; o modo
desenvolvedor a altera), mede em cada quadro das atlas (qualidade normal) a mediana, ao longo da borda contornada da
silhueta, da distância até o primeiro pixel claro do interior; bordas sem contorno (rastros, efeitos) não contam. Grava em
`outline-widths.json` como fração da altura do quadro, o que vale para as duas qualidades. O shader dos personagens
(`palettePipeline.ts`) apara de fora para dentro ou engrossa para fora o contorno de cada quadro até o alvo, conforme a
escala com que o quadro é desenhado; as imagens não mudam.
"""
from pathlib import Path
import json

import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt, find_objects

ROOT = Path(__file__).resolve().parents[1]
CHARACTERS = ROOT / 'src/assets/sprites/characters'
# Coverage from which a pixel belongs to the silhouette. Outline ink is dark and neutral, as in the shader
# (`palettePipeline.ts`): thin lines are softened into dark greys, while dark clothing shades keep their colour.
SOLID_ALPHA = 128
INK_VALUE = 120
INK_CHROMA = 45
# Edge widths beyond this (atlas pixels) are thin parts drawn all in black, not outline.
MAX_WIDTH = 14


def measure(cell: np.ndarray) -> float | None:
    """Width, in pixels, of the outline: the median, along the outlined edge of the silhouette, of the distance from the
    edge to the first light pixel inside."""
    solid = cell[..., 3] >= SOLID_ALPHA
    rgb = cell[..., :3].astype(int)
    dark = solid & (rgb.max(axis=2) < INK_VALUE) & (rgb.max(axis=2) - rgb.min(axis=2) < INK_CHROMA)
    to_light = distance_transform_edt(~(solid & ~dark))
    widths = to_light[dark & (distance_transform_edt(solid) <= 1)]
    widths = widths[widths <= MAX_WIDTH]
    return float(np.median(widths)) if len(widths) else None


def sheet_widths(sheet: Path) -> list[float | None]:
    """Outline width of each frame of a sheet, as a fraction of the frame height."""
    pixels = np.asarray(Image.open(sheet).convert('RGBA'))
    layout = json.loads(sheet.with_suffix('.atlas.json').read_text())['frames']
    widths = []
    for frame in (layout[key]['frame'] for key in sorted(layout, key=int)):
        cell = pixels[frame['y']:frame['y'] + frame['h'], frame['x']:frame['x'] + frame['w']]
        box = find_objects((cell[..., 3] > 0).astype(int))
        width = measure(cell[box[0]]) if box else None
        widths.append(None if width is None else round(width / frame['h'], 6))
    return widths


def main() -> None:
    for fighter in sorted(path.parent for path in CHARACTERS.glob('*/outline.json')):
        widths = {sheet.stem: sheet_widths(sheet) for sheet in sorted(fighter.glob('*.png')) if sheet.with_suffix('.atlas.json').exists()}
        (fighter / 'outline-widths.json').write_text('{\n' + ',\n'.join(f' "{name}": {json.dumps(values)}' for name, values in widths.items()) + '\n}\n')
        print(f'{fighter.name}: contorno medido em {len(widths)} folhas.')


if __name__ == '__main__':
    main()
