"""Separate the authored pose proposals into transparent, foot-aligned game atlases.

Uso: python3 scripts/prepare-shoto-actions.py [ação...]
Sem argumentos, prepara todas as ações na qualidade normal. Com ações nomeadas, prepara só essas, nas qualidades normal
e alta (`high/`, células e escala dobradas), a partir da mesma fonte; as demais folhas high fornecidas ficam intactas.
O fundo de cada pose sai pela limpeza de `key-magenta.py` antes da redução, para o contorno preto manter sua largura.
"""
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import json
import sys
import numpy as np
from PIL import Image
from scipy.ndimage import find_objects, label

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
CELL = 1024
FOOT = 900
sys.dont_write_bytecode = True
spec = spec_from_file_location('key_magenta', Path(__file__).with_name('key-magenta.py'))
key_magenta = module_from_spec(spec); spec.loader.exec_module(key_magenta)


def prepare(name: str, quality: int, target: Path) -> None:
    """Writes the atlas of one action at `quality` times the normal cell and scale."""
    filename, scale, floor = ACTIONS[name]
    scale *= 0.8 * quality
    cell, foot = CELL * quality, FOOT * quality
    pixels = np.asarray(Image.open(SOURCES / filename).convert('RGBA')).copy()
    rgb = pixels[:, :, :3].astype(np.int16)
    magenta = np.minimum(rgb[:, :, 0], rgb[:, :, 2])
    is_background = (magenta > 70) & (magenta > rgb[:, :, 1] * 1.5)
    labels, _ = label(~is_background)
    counts = np.bincount(labels.ravel())
    components = np.argsort(counts[1:])[-6:] + 1
    regions = find_objects(labels)
    components = sorted(components, key=lambda i: regions[i - 1][1].start)
    sheet = Image.new('RGBA', (cell * 3, cell * 2))
    frames = {}
    for index, component in enumerate(components):
        rows, cols = regions[component - 1]
        data = pixels[rows, cols].copy()
        # Other poses reaching into this box go; the background, including its blend with the outline, goes by the cleanup.
        frame_labels = labels[rows, cols]
        data[:, :, 3] = np.where((frame_labels == component) | (frame_labels == 0), data[:, :, 3], 0)
        key_magenta.clean(data, key_magenta.SPRITE_HUE_TOLERANCE)
        drawing = Image.fromarray(data)
        if scale != 1:
            drawing = drawing.resize((round(drawing.width * scale), round(drawing.height * scale)), Image.Resampling.LANCZOS)
        local_x = cell // 2 - round((ANCHORS[name][index] - cols.start) * scale)
        frame_floor = floor[index] if isinstance(floor, list) else floor
        local_y = foot + round((rows.start - frame_floor) * scale)
        if local_x < 0 or local_y < 0 or local_x + drawing.width > cell or local_y + drawing.height > cell:
            raise ValueError(f'{name}: frame {index} exceeds its atlas cell')
        x = index % 3 * cell
        y = index // 3 * cell
        sheet.paste(drawing, (x + local_x, y + local_y))
        frames[str(index)] = {
            'frame': {'x': x, 'y': y, 'w': cell, 'h': cell},
            'rotated': False, 'trimmed': False,
            'spriteSourceSize': {'x': 0, 'y': 0, 'w': cell, 'h': cell},
            'sourceSize': {'w': cell, 'h': cell},
        }
    target.mkdir(parents=True, exist_ok=True)
    sheet.save(target / f'{name}.png')
    (target / f'{name}.atlas.json').write_text(json.dumps({'frames': frames}, indent=2) + '\n')


selected = sys.argv[1:]
unknown = [name for name in selected if name not in ACTIONS]
if unknown: raise SystemExit(f'Ações desconhecidas: {", ".join(unknown)}')
for name in selected or ACTIONS:
    prepare(name, 1, TARGET)
    if selected: prepare(name, 2, TARGET / 'high')
if selected: raise SystemExit

pixels = np.asarray(Image.open(SOURCES / 'tomate-projetil.png').convert('RGBA')).copy()
rgb = pixels[:, :, :3].astype(np.int16)
magenta = np.minimum(rgb[:, :, 0], rgb[:, :, 2])
labels, _ = label(~((magenta > 70) & (magenta > rgb[:, :, 1] * 1.5)))
counts = np.bincount(labels.ravel())
regions = find_objects(labels)
components = sorted(np.argsort(counts[1:])[-6:] + 1, key=lambda i: regions[i - 1][1].start)
tomato_centers = [275, 650, 990, 1370, 1690, 2100]
size = 512
sheet = Image.new('RGBA', (size * 3, size * 2))
frames = {}
for index, component in enumerate(components):
    rows, cols = regions[component - 1]
    data = pixels[rows, cols].copy()
    data[:, :, 3] = np.where(labels[rows, cols] == component, data[:, :, 3], 0)
    drawing = Image.fromarray(data)
    x, y = index % 3 * size, index // 3 * size
    sheet.paste(drawing, (x + 384 - (tomato_centers[index] - cols.start), y + 256 - (365 - rows.start)))
    frames[str(index)] = {'frame': {'x': x, 'y': y, 'w': size, 'h': size}, 'rotated': False, 'trimmed': False,
                          'spriteSourceSize': {'x': 0, 'y': 0, 'w': size, 'h': size}, 'sourceSize': {'w': size, 'h': size}}
sheet.save(TARGET / 'tomato.png')
(TARGET / 'tomato.atlas.json').write_text(json.dumps({'frames': frames}, indent=2) + '\n')

pixels = np.asarray(Image.open(SOURCES / 'corvo.png').convert('RGBA')).copy()
rgb = pixels[:, :, :3].astype(np.int16)
magenta = np.minimum(rgb[:, :, 0], rgb[:, :, 2])
labels, _ = label(~((magenta > 70) & (magenta > rgb[:, :, 1] * 1.5)))
counts = np.bincount(labels.ravel())
regions = find_objects(labels)
components = sorted(np.argsort(counts[1:])[-6:] + 1, key=lambda i: regions[i - 1][1].start)
size = 512
sheet = Image.new('RGBA', (size * 3, size * 2))
frames = {}
for index, component in enumerate(components):
    rows, cols = regions[component - 1]
    data = pixels[rows, cols].copy()
    data[:, :, 3] = np.where(labels[rows, cols] == component, data[:, :, 3], 0)
    bird = Image.fromarray(data)
    x, y = index % 3 * size, index // 3 * size
    sheet.paste(bird, (x + (size - bird.width) // 2, y + (size - bird.height) // 2))
    frames[str(index)] = {'frame': {'x': x, 'y': y, 'w': size, 'h': size}, 'rotated': False, 'trimmed': False,
                          'spriteSourceSize': {'x': 0, 'y': 0, 'w': size, 'h': size}, 'sourceSize': {'w': size, 'h': size}}
sheet.save(TARGET / 'crow.png')
(TARGET / 'crow.atlas.json').write_text(json.dumps({'frames': frames}, indent=2) + '\n')
