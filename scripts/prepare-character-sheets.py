"""Prepara as folhas de ação de um personagem: separa o fundo, recorta cada pose e a posiciona numa grade do jogo.

Uso: python3 scripts/prepare-character-sheets.py <personagem> [folha...] [--saida pasta]
Padrão global de limpeza, recorte e posicionamento de todos os personagens. As fontes (seis poses lado a lado, fundo
magenta) ficam em `assets/art/characters/<personagem>/revisao/`; `sheets.json` na mesma pasta do personagem define
a grade (`cell`, `foot`, `scale` do desenho) e, por folha, só o que foge do automático (`source`, `frames`, `scale`,
`anchors`, `floor`, `released`). Toda folha PNG da pasta sem entrada usa o nome do arquivo e o padrão. `ignore`
lista as fontes tratadas por outro preparador (efeitos, projéteis). Sem nomes de folha, prepara todas; cada folha sai nas
qualidades normal e alta (`high/`, células e escala dobradas), a partir da mesma fonte, num atlas de 3 colunas.
O fundo sai por desmistura de cor antes da redução: cada pixel que o fundo alcança vira a cor desenhada com a cobertura
correspondente, então contornos, rastros e brilhos semitransparentes perdem o magenta sem afinar nem sumir. Cada pose
leva os pedaços desenhados soltos mais próximos dela (palha, pontas de rastro), não só a maior mancha.
Posicionamento automático (sem `anchors`/`floor`): o centro do corpo de cada pose é a mediana horizontal dos pixels
sólidos (membros e rastros estendidos pouco a deslocam) e o apoio é a linha mais baixa com desenho sólido relevante;
o centro é refeito depois do corte das poses. Poses cujo apoio foge muito do chão das demais são avisadas.
"""
from functools import cache, partial
from pathlib import Path
import json
import sys
import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt, find_objects, label

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'assets/art/characters'
SPRITES = ROOT / 'src/assets/sprites/characters'
# Key blend: how far red and blue exceed green. The drawn palette has almost none; the few purple shades it has are
# enclosed by the outline, where the background never reaches.
SPILL_REACH = 0
# Pockets of background enclosed between limbs are darker blends that never reach the pure key.
POCKET_SPILL = 100
# Spill of the drawn colors per unit of brightness: the light browns, skin and straw sit near -0.2.
PALETTE_SPILL = -.2
# Coverage below this is the background's own noise.
MIN_ALPHA = .1
# Detached specks smaller than this (in source pixels) are noise, not drawing.
MIN_DETAIL = 4
# A piece with at least this share of its pixels in one slot belongs whole to that pose.
WHOLE_SHARE = .85
# Coverage from which a pixel is solid drawing rather than a soft edge.
SOLID_ALPHA = 128


def spill(rgb: np.ndarray) -> np.ndarray:
    return np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1]


def separate(rgb: np.ndarray, key: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    return np.clip((rgb - (1 - alpha[..., None]) * key) / np.maximum(alpha, MIN_ALPHA)[..., None], 0, 255)


def unmix(pixels: np.ndarray) -> None:
    """Splits each pixel the magenta background reaches into the drawn color and its coverage, in place."""
    rgb = pixels[..., :3].astype(float)
    amount = spill(rgb)
    key = np.median(rgb[amount > 200], axis=0)
    regions, _ = label(amount > SPILL_REACH)
    reached = np.isin(regions, np.unique(regions[amount > POCKET_SPILL])) & (regions > 0)
    alpha = np.where(reached, np.clip(1 - amount / spill(key), 0, 1), 1)
    color = separate(rgb, key, alpha)
    # Light drawn colors have negative spill (blue below green); estimated from the first separation, it refines the
    # coverage so pale strokes do not keep a pink cast.
    drawn = PALETTE_SPILL * color.max(axis=2)
    alpha = np.where(reached, np.clip((spill(key) - amount) / (spill(key) - drawn), 0, 1), 1)
    alpha[alpha < MIN_ALPHA] = 0
    color = separate(rgb, key, alpha)
    pixels[..., :3] = np.where(reached[..., None], color, rgb).round()
    pixels[..., 3] = (pixels[..., 3] * alpha).round()


FRAMES = 6
# Lowest solid rows hold at least this many solid pixels to count as the pose's support (single specks do not).
FLOOR_PIXELS = 8
# A grounded pose whose automatic support differs from the median of its sheet by more than this (source pixels) is reported.
FLOOR_ALERT = 40
COLUMNS = 3
# Free pixels (normal quality) kept between a drawing and the edge of its cell.
FIT_MARGIN = 4


@cache
def poses(source: Path, centers: tuple[int, ...] | None = None,
          released: tuple[tuple[int, int, int, int], ...] = (), count: int = FRAMES) -> list[tuple[np.ndarray, int, int]]:
    """The `count` poses of a source, left to right: each crop with its source top row and left column. The sheet is cut
    at the emptiest column between consecutive pose centers (evenly spaced when not given). A solid piece goes whole to
    the slot holding most of it (a kick reaching past the cut stays with its pose); only a piece that really spans
    slots (effects touching between poses) is split at the cut. Soft pixels (blur, smears, antialiasing) follow the
    nearest solid pixel, so blurred edges touching between poses do not join them."""
    pixels = np.asarray(Image.open(source).convert('RGBA')).copy()
    unmix(pixels)
    for left, top, right, bottom in released:
        pixels[top:bottom, left:right, 3] = 0
    drawn, solid = pixels[..., 3] > 0, pixels[..., 3] >= SOLID_ALPHA
    width = drawn.shape[1]
    centers = centers or tuple(round((pose + .5) * width / count) for pose in range(count))
    coverage = pixels[..., 3].sum(axis=0)
    cuts = [0]
    for left, right in zip(centers, centers[1:]):
        start, stop = left + (right - left) // 4, right - (right - left) // 4
        cuts.append(start + int(np.argmin(coverage[start:stop])))
    cuts.append(width)
    slot = np.broadcast_to(np.searchsorted(cuts, np.arange(width), side='right') - 1, drawn.shape)
    pieces, pieces_count = label(solid, structure=np.ones((3, 3)))
    shares = np.bincount(pieces[solid] * count + slot[solid], minlength=(pieces_count + 1) * count).reshape(-1, count)
    sizes = shares.sum(axis=1)
    whole = np.where(shares.max(axis=1) >= WHOLE_SHARE * sizes, shares.argmax(axis=1), -1)
    owner = np.where(whole[pieces] >= 0, whole[pieces], slot)
    owner[~solid | (sizes[pieces] < MIN_DETAIL)] = -1
    # Soft pixels detached from any solid drawing are background noise.
    regions, _ = label(drawn, structure=np.ones((3, 3)))
    attached = np.isin(regions, np.unique(regions[owner >= 0])) & drawn
    rows, cols = distance_transform_edt(~solid, return_distances=False, return_indices=True)
    owner = np.where(attached, owner[rows, cols], -1)
    result = []
    for pose in range(count):
        mine = owner == pose
        rows, cols = find_objects(mine.astype(int))[0]
        data = pixels[rows, cols].copy()
        data[..., 3] = np.where(mine[rows, cols], data[..., 3], 0)
        result.append((data, rows.start, cols.start))
    return result


def solid_extent(data: np.ndarray, top: int, left: int) -> tuple[int, int]:
    """Body center (median column of the solid pixels) and support row (lowest row with solid drawing) of one pose."""
    solid = data[..., 3] >= SOLID_ALPHA
    columns = np.nonzero(solid)[1]
    rows = np.nonzero(solid.sum(axis=1) >= FLOOR_PIXELS)[0]
    return left + int(np.median(columns)), top + int(rows.max() if len(rows) else np.nonzero(solid.any(axis=1))[0].max())


@cache
def automatic(source: Path, released: tuple, count: int) -> tuple[list[int], list[int]]:
    """Centers and support rows measured from the source; the poses are cut again around the first centers."""
    first = poses(source, None, released, count)
    centers = tuple(solid_extent(*pose)[0] for pose in first)
    final = poses(source, centers, released, count)
    measured = [solid_extent(*pose) for pose in final]
    floors = [floor for _, floor in measured]
    report(source.stem, floors)
    return [center for center, _ in measured], floors


def body_size(drawings: list[tuple[np.ndarray, int, int]]) -> float:
    """Typical body size of a sheet: square root of the solid area, median over its poses. It stays about the same
    whatever the posture, so it tells a drawing made larger than the others from one that merely shows another pose."""
    return float(np.median([(data[..., 3] >= SOLID_ALPHA).sum() ** .5 for data, _, _ in drawings]))


def fit_limit(drawings: list[tuple[np.ndarray, int, int]], anchors: list[int], floor: list[int] | int, cell: int, foot: int) -> float:
    """Largest scale at which every pose stays inside the cell (normal quality), keeping FIT_MARGIN pixels free."""
    limit = float('inf')
    for index, (data, top, left) in enumerate(drawings):
        height, width = data.shape[:2]
        base = floor[index] if isinstance(floor, list) else floor
        reaches = [((anchors[index] - left), cell / 2 - FIT_MARGIN), ((left + width - anchors[index]), cell / 2 - FIT_MARGIN),
                   ((base - top), foot - FIT_MARGIN), ((top + height - base), cell - foot - FIT_MARGIN)]
        limit = min(limit, *(room / reach for reach, room in reaches if reach > 0))
    return limit


def atlas(target: Path, name: str, cell: int, frames: list[tuple[Image.Image, int, int]]) -> None:
    """Writes a 3-column atlas with each drawing pasted at its position inside its cell."""
    sheet = Image.new('RGBA', (cell * COLUMNS, cell * -(-len(frames) // COLUMNS)))
    layout = {}
    for index, (drawing, local_x, local_y) in enumerate(frames):
        if local_x < 0 or local_y < 0 or local_x + drawing.width > cell or local_y + drawing.height > cell:
            raise ValueError(f'{name}: frame {index} exceeds its atlas cell')
        x, y = index % COLUMNS * cell, index // COLUMNS * cell
        sheet.paste(drawing, (x + local_x, y + local_y))
        layout[str(index)] = {
            'frame': {'x': x, 'y': y, 'w': cell, 'h': cell},
            'rotated': False, 'trimmed': False,
            'spriteSourceSize': {'x': 0, 'y': 0, 'w': cell, 'h': cell},
            'sourceSize': {'w': cell, 'h': cell},
        }
    target.mkdir(parents=True, exist_ok=True)
    sheet.save(target / f'{name}.png')
    (target / f'{name}.atlas.json').write_text(json.dumps({'frames': layout}, indent=2) + '\n')


def resized(data: np.ndarray, scale: float) -> Image.Image:
    drawing = Image.fromarray(data)
    if scale == 1: return drawing
    return drawing.resize((round(drawing.width * scale), round(drawing.height * scale)), Image.Resampling.LANCZOS)


class Character:
    """The grid and the sheets of one character, read from its `sheets.json`."""

    def __init__(self, name: str):
        self.name, self.folder = name, ART / name
        self.manifest = json.loads((self.folder / 'sheets.json').read_text())
        self.cell, self.foot, self.scale = (self.manifest[key] for key in ('cell', 'foot', 'scale'))
        entries = self.manifest.get('sheets', {})
        claimed = {entry.get('source', f'{sheet}.png') for sheet, entry in entries.items()} | set(self.manifest.get('ignore', ()))
        self.sheets = {**entries, **{path.stem: {} for path in sorted((self.folder / 'revisao').glob('*.png')) if path.name not in claimed}}
        self.target = SPRITES / name
        self.reference = self.manifest.get('reference')

    def action(self, name: str, quality: int) -> list[tuple[Image.Image, int, int]]:
        entry = self.sheets[name]
        source, count = self.folder / 'revisao' / entry.get('source', f'{name}.png'), entry.get('frames', FRAMES)
        released = tuple(tuple(box) for box in entry.get('released', ()))
        if 'anchors' in entry and 'floor' in entry:
            anchors, floor = entry['anchors'], entry['floor']
            drawings = poses(source, tuple(anchors), released, count)
        else:
            anchors, floors = automatic(source, released, count)
            floor = entry.get('floor', floors)
            drawings = poses(source, tuple(anchors), released, count)
        scale = self.sheet_scale(name, entry, drawings, anchors, floor) * quality
        frames = []
        for index, (data, top, left) in enumerate(drawings):
            frame_floor = floor[index] if isinstance(floor, list) else floor
            frames.append((resized(data, scale),
                           self.cell * quality // 2 - round((anchors[index] - left) * scale),
                           self.foot * quality + round((top - frame_floor) * scale)))
        return frames


    def sheet_scale(self, name: str, entry: dict, drawings: list, anchors: list[int], floor: list[int] | int) -> float:
        """Authored `scale` times the character's, or, without one, the scale that gives the sheet the body size of the
        `reference` sheet, reduced if needed so every pose fits its cell."""
        if 'scale' in entry: return entry['scale'] * self.scale
        if self.reference is None or name == self.reference: return self.scale
        reference = self.sheets[self.reference]
        reference_poses = poses(self.folder / 'revisao' / reference.get('source', f'{self.reference}.png'), None, (), reference.get('frames', FRAMES))
        return min(self.scale * body_size(reference_poses) / body_size(drawings), fit_limit(drawings, anchors, floor, self.cell, self.foot))


def report(name: str, floors: list[int]) -> None:
    """Warns about poses resting far from the median support of their sheet (an effect below the feet, for instance)."""
    middle = float(np.median(floors))
    odd = [f'{index}: {floor}' for index, floor in enumerate(floors) if abs(floor - middle) > FLOOR_ALERT]
    if odd: print(f'  {name}: apoio fora do comum (mediana {middle:.0f}) em {", ".join(odd)}')


def main() -> None:
    arguments = sys.argv[1:]
    output = Path(arguments.pop(arguments.index('--saida') + 1)) if '--saida' in arguments else None
    if output: arguments.remove('--saida')
    if not arguments: raise SystemExit('Uso: prepare-character-sheets.py <personagem> [folha...] [--saida pasta]')
    character = Character(arguments[0])
    selected = arguments[1:] or list(character.sheets)
    unknown = [name for name in selected if name not in character.sheets]
    if unknown: raise SystemExit(f'Folhas desconhecidas: {", ".join(unknown)}')
    target = output or character.target
    for name in selected:
        for quality, folder in ((1, target), (2, target / 'high')):
            atlas(folder, name, character.cell * quality, character.action(name, quality))


if __name__ == '__main__':
    main()
