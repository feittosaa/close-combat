"""Separate the authored pose proposals into transparent, foot-aligned game atlases.

Uso: python3 scripts/prepare-shoto-actions.py [folha...]
Sem argumentos, prepara todas as ações, o tomate e o corvo; com nomes, só essas folhas. Cada folha sai nas qualidades
normal e alta (`high/`, células e escala dobradas), a partir da mesma fonte.
O fundo sai por desmistura de cor antes da redução: cada pixel que o fundo alcança vira a cor desenhada com a cobertura
correspondente, então contornos, rastros e brilhos semitransparentes perdem o magenta sem afinar nem sumir. Cada pose
leva os pedaços desenhados soltos mais próximos dela (palha, pontas de rastro), não só a maior mancha.
"""
from functools import cache, partial
from pathlib import Path
import json
import sys
import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt, find_objects, label

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / 'assets/art/characters/shoto/revisao'
TARGET = ROOT / 'src/assets/sprites/characters/shoto'
# Each sheet uses its own drawing scale and floor line; these are presentation values.
ACTIONS = {
    'ippon': ('ippon.png', 1.04, 675),
    'idle-normal': ('espera-normal.png', 1.0, 680),
    'rake-enter': ('pegar-ancinho.png', 1.0, 675),
    'crouch': ('agachar.png', 1.019082, 695),
    'guard': ('defesa-em-pe.png', 0.9797, 684),
    'crouch-guard': ('defesa-agachada.png', 0.90492672, 665),
    'perfect-block': ('perfect-block.png', 1.06, 671),
    'light-punch': ('soco-fraco.png', 1.0403, 670),
    'launcher-punch': ('soco-levantamento.png', 1.0, 677),
    'heavy-punch-2': ('soco-forte-combo-2.png', 0.99, 671),
    'heavy-punch-3': ('soco-forte-combo-3.png', 1.0, 676),
    'ippon-victim': ('reacao-ippon.png', 1.2, [635, 634, 530, 552, 562, 646]),
    'rake-ultimate-start': ('ultimate-ancinho-preparo.png', 1.028976, 664),
    'rake-ultimate-spin': ('ultimate-ancinho-giro.png', 1.44045, 651),
    'heavy-kick': ('chute-forte.png', 1.1742, 644),
    'crouch-heavy-kick': ('chute-forte-agachado.png', 1.3071926, 519),
    'air-light-kick': ('chute-fraco-aereo.png', 1.215, 553),
    'air-heavy-kick': ('chute-forte-aereo.png', 1.34589, [610, 575, 458, 475, 487, 610]),
    'dash-forward': ('dash-frente.png', 1.39944, 569),
    'jump': ('salto.png', 1.1476, [679, 585, 455, 405, 494, 679]),
    'fall': ('queda.png', 1.07942, 620),
    'getup': ('levantar.png', 1.31, 614),
    'taunt': ('provocacao.png', 1.03, 680),
    'tomato-throw': ('arremesso-tomate.png', 1.31194, 618),
    'walk': ('caminhada.png', 0.98461, 680),
    'enter-walk': ('entrada-caminhada.png', 0.98461, 680),
    'backward': ('recuo.png', 0.9653, 673),
    'hurt': ('reacao.png', 1.0011573, 686),
    'hurt-low': ('reacao-low.png', 1.0011573, 686),
    'hurt-high': ('reacao-high.png', 1.0011573, 686),
    'victory': ('vitoria.png', 0.98, 691),
    'light-kick': ('combo-chute-fraco.png', 1.39656, 614),
    'alternate-punch': ('soco-alternado.png', 1.0403, 666),
    'flying-kick': ('voadora.png', 1.30959, [615, 616, 487, 458, 498, 615]),
    'ultimate': ('ultimate.png', 1.16725, 704),
    'windmill-2': ('windmill-2.png', 1.61, 550),
    'windmill-4': ('windmill-4.png', 1.35, 585),
    'air-guard': ('defesa-aerea.png', 1.064, [703, 675, 577, 478, 675, 703]),
    'air-hurt': ('reacao-aerea.png', 1.0068226, [644, 658, 633, 582, 563, 636]),
    'air-light-punch': ('soco-fraco-aereo.png', 1.09661, [611, 624, 617, 617, 621, 626]),
    'air-heavy-punch': ('soco-forte-aereo.png', 1.10638, [583, 621, 627, 631, 627, 621]),
    'crouch-punch': ('soco-fraco-agachado.png', 0.93627, 591),
    'crouch-uppercut': ('antiaereo.png', 1.009188, 690),
    'crouch-light-kick': ('chute-fraco-agachado.png', 1.0815, 554),
    'reversal-kick': ('reversal-forte.png', 1.2339, [689, 690, 641, 584, 525, 455]),
    'reversal-light': ('reversal-fraco.png', 1.21501, [677, 676, 675, 605, 565, 478]),
    'dash-backward': ('dash-recuo.png', 1.225, [622, 622, 619, 507, 622, 622]),
    'power-punch': ('soco-potente.png', 1.0, 680),
    'power-kick': ('chute-potente.png', 1.34, 619),
    'rake-transition': ('transicao-ancinho.png', 1.0, 657),
    'grabbed': ('reacao-agarrado.png', 0.94, 702),
    'defeat': ('derrota.png', 1.34, 610),
}
# Body centers are authored per drawing, independently of the extents of limbs,
# the rake and smear marks. They never change gameplay collision geometry.
ANCHORS = {
    'ippon': [170, 510, 850, 1190, 1570, 1960],
    'idle-normal': [190, 547, 899, 1251, 1605, 1960],
    'rake-enter': [190, 560, 920, 1270, 1610, 1970],
    'crouch': [170, 511, 859, 1207, 1569, 1940],
    'guard': [158, 499, 841, 1216, 1576, 1970],
    'crouch-guard': [155, 484, 885, 1277, 1660, 1994],
    'perfect-block': [173, 525, 882, 1246, 1630, 1981],
    'light-punch': [190, 535, 890, 1250, 1610, 1970],
    'launcher-punch': [190, 540, 890, 1250, 1600, 1960],
    'heavy-punch-2': [190, 535, 890, 1240, 1600, 1960],
    'heavy-punch-3': [190, 535, 890, 1240, 1600, 1960],
    'ippon-victim': [180, 520, 870, 1175, 1510, 1930],
    'rake-ultimate-start': [150, 465, 800, 1150, 1500, 1890],
    'rake-ultimate-spin': [170, 530, 880, 1240, 1600, 1960],
    'heavy-kick': [145, 455, 770, 1140, 1640, 2000],
    'crouch-heavy-kick': [145, 444, 788, 1208, 1703, 2006],
    'air-light-kick': [110, 405, 751, 1230, 1686, 2019],
    'air-heavy-kick': [150, 465, 750, 1160, 1650, 1990],
    'dash-forward': [177, 509, 909, 1325, 1670, 2000],
    'jump': [175, 525, 870, 1240, 1610, 1960],
    'fall': [126, 385, 690, 1167, 1541, 1919],
    'getup': [210, 660, 1040, 1390, 1710, 2030],
    'taunt': [178, 515, 864, 1197, 1572, 1971],
    'tomato-throw': [159, 481, 823, 1258, 1591, 1998],
    'walk': [159, 520, 888, 1256, 1616, 1979],
    'enter-walk': [190, 540, 890, 1250, 1600, 1960],
    'backward': [153, 518, 878, 1241, 1603, 1967],
    'hurt': [178, 512, 873, 1250, 1614, 1972],
    'hurt-low': [178, 512, 873, 1250, 1614, 1972],
    'hurt-high': [178, 512, 873, 1250, 1614, 1972],
    'victory': [195, 547, 909, 1269, 1634, 1995],
    'light-kick': [125, 420, 785, 1150, 1500, 1985],
    'alternate-punch': [189, 530, 886, 1266, 1638, 1984],
    'flying-kick': [150, 475, 810, 1160, 1630, 1970],
    'ultimate': [130, 508, 870, 1299, 1654, 1970],
    'windmill-2': [238, 612, 940, 1220, 1640, 2000],
    'windmill-4': [170, 510, 823, 1155, 1551, 1906],
    'air-guard': [190, 560, 929, 1287, 1620, 1975],
    'air-hurt': [160, 520, 850, 1240, 1640, 1990],
    'air-light-punch': [145, 480, 815, 1190, 1580, 1960],
    'air-heavy-punch': [170, 490, 800, 1135, 1500, 1935],
    'crouch-punch': [160, 510, 850, 1190, 1590, 1960],
    'crouch-uppercut': [170, 520, 880, 1230, 1590, 1950],
    'crouch-light-kick': [150, 480, 800, 1190, 1630, 1980],
    'reversal-kick': [170, 510, 855, 1190, 1610, 1985],
    'reversal-light': [160, 510, 830, 1160, 1600, 1980],
    'dash-backward': [170, 500, 820, 1170, 1560, 1940],
    'power-punch': [190, 535, 890, 1250, 1610, 1970],
    'power-kick': [170, 500, 830, 1160, 1580, 1960],
    'rake-transition': [235, 540, 880, 1210, 1570, 1960],
    'grabbed': [190, 560, 900, 1260, 1600, 1980],
    'defeat': [150, 400, 680, 1040, 1430, 1910],
}
# Objects already released in the drawing (left, top, right, bottom in the source): the game draws them as their own
# projectile, so they leave the body sheet.
RELEASED = {
    'tomato-throw': ((1805, 215, 1885, 272),),
}
CELL = 1024
FOOT = 900
EFFECT_CELL = 512
TOMATO_CENTERS = [275, 650, 990, 1370, 1690, 2100]
TOMATO_MIDDLE = 365
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


@cache
def poses(filename: str, centers: tuple[int, ...] | None = None,
          released: tuple[tuple[int, int, int, int], ...] = ()) -> list[tuple[np.ndarray, int, int]]:
    """The six poses of a source, left to right: each crop with its source top row and left column. The sheet is cut
    at the emptiest column between consecutive pose centers (evenly spaced when not given). A solid piece goes whole to
    the slot holding most of it (a kick reaching past the cut stays with its pose); only a piece that really spans
    slots (effects touching between poses) is split at the cut. Soft pixels (blur, smears, antialiasing) follow the
    nearest solid pixel, so blurred edges touching between poses do not join them."""
    pixels = np.asarray(Image.open(SOURCES / filename).convert('RGBA')).copy()
    unmix(pixels)
    for left, top, right, bottom in released:
        pixels[top:bottom, left:right, 3] = 0
    drawn, solid = pixels[..., 3] > 0, pixels[..., 3] >= SOLID_ALPHA
    width = drawn.shape[1]
    centers = centers or tuple(round((pose + .5) * width / 6) for pose in range(6))
    coverage = pixels[..., 3].sum(axis=0)
    cuts = [0]
    for left, right in zip(centers, centers[1:]):
        start, stop = left + (right - left) // 4, right - (right - left) // 4
        cuts.append(start + int(np.argmin(coverage[start:stop])))
    cuts.append(width)
    slot = np.broadcast_to(np.searchsorted(cuts, np.arange(width), side='right') - 1, drawn.shape)
    pieces, count = label(solid, structure=np.ones((3, 3)))
    shares = np.bincount(pieces[solid] * 6 + slot[solid], minlength=(count + 1) * 6).reshape(-1, 6)
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
    for pose in range(6):
        mine = owner == pose
        rows, cols = find_objects(mine.astype(int))[0]
        data = pixels[rows, cols].copy()
        data[..., 3] = np.where(mine[rows, cols], data[..., 3], 0)
        result.append((data, rows.start, cols.start))
    return result


def atlas(target: Path, name: str, cell: int, frames: list[tuple[Image.Image, int, int]]) -> None:
    """Writes a 3×2 atlas with each drawing pasted at its position inside its cell."""
    sheet = Image.new('RGBA', (cell * 3, cell * 2))
    layout = {}
    for index, (drawing, local_x, local_y) in enumerate(frames):
        if local_x < 0 or local_y < 0 or local_x + drawing.width > cell or local_y + drawing.height > cell:
            raise ValueError(f'{name}: frame {index} exceeds its atlas cell')
        x, y = index % 3 * cell, index // 3 * cell
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


def action(name: str, quality: int) -> list[tuple[Image.Image, int, int]]:
    filename, scale, floor = ACTIONS[name]
    scale *= 0.8 * quality
    frames = []
    for index, (data, top, left) in enumerate(poses(filename, tuple(ANCHORS[name]), RELEASED.get(name, ()))):
        frame_floor = floor[index] if isinstance(floor, list) else floor
        frames.append((resized(data, scale),
                       CELL * quality // 2 - round((ANCHORS[name][index] - left) * scale),
                       FOOT * quality + round((top - frame_floor) * scale)))
    return frames


def tomato(quality: int) -> list[tuple[Image.Image, int, int]]:
    return [(resized(data, quality), quality * (384 - (TOMATO_CENTERS[index] - left)), quality * (256 - (TOMATO_MIDDLE - top)))
            for index, (data, top, left) in enumerate(poses('tomate-projetil.png', tuple(TOMATO_CENTERS)))]


def crow(quality: int) -> list[tuple[Image.Image, int, int]]:
    cell = EFFECT_CELL * quality
    birds = [resized(data, quality) for data, _, _ in poses('corvo.png')]
    return [(bird, (cell - bird.width) // 2, (cell - bird.height) // 2) for bird in birds]


SHEETS = {**{name: (CELL, partial(action, name)) for name in ACTIONS},
          'tomato': (EFFECT_CELL, tomato), 'crow': (EFFECT_CELL, crow)}

if __name__ == '__main__':
    selected = sys.argv[1:] or list(SHEETS)
    unknown = [name for name in selected if name not in SHEETS]
    if unknown: raise SystemExit(f'Folhas desconhecidas: {", ".join(unknown)}')
    for name in selected:
        cell, frames = SHEETS[name]
        for quality, target in ((1, TARGET), (2, TARGET / 'high')):
            atlas(target, name, cell * quality, frames(quality))
