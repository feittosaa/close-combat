"""Prepara o que o Shoto tem fora da grade das ações: a espera com ancinho, o tomate e o corvo, nas duas qualidades.

Uso: python3 scripts/prepare-shoto-extras.py [idle|tomato|crow...] [--saida pasta]
Usa a separação de fundo e o recorte de `prepare-character-sheets.py`.
"""
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import json
import sys
from PIL import Image

sys.dont_write_bytecode = True
spec = spec_from_file_location('prepare_character_sheets', Path(__file__).with_name('prepare-character-sheets.py'))
sheets = module_from_spec(spec); spec.loader.exec_module(sheets)

SOURCES = sheets.ART / 'shoto/revisao'
EFFECT_CELL = 512
TOMATO_CENTERS = [275, 650, 990, 1370, 1690, 2100]
TOMATO_MIDDLE = 365
# Keep the rake shaft at the same horizontal position throughout the idle.
IDLE_ANCHORS = [215, 562, 910, 1258, 1608, 1955]
IDLE_WIDTH = 480


def idle(target: Path, quality: int) -> None:
    drawings = sheets.poses(SOURCES / 'espera.png', tuple(IDLE_ANCHORS))
    height = Image.open(SOURCES / 'espera.png').height
    width = IDLE_WIDTH * quality
    sheet = Image.new('RGBA', (width * len(drawings), height * quality))
    frames = {}
    for index, (data, top, left) in enumerate(drawings):
        drawing = sheets.resized(data, quality)
        x = index * width + quality * (IDLE_WIDTH // 2 - (IDLE_ANCHORS[index] - left))
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


def tomato(quality: int) -> list[tuple[Image.Image, int, int]]:
    return [(sheets.resized(data, quality), quality * (384 - (TOMATO_CENTERS[index] - left)), quality * (256 - (TOMATO_MIDDLE - top)))
            for index, (data, top, left) in enumerate(sheets.poses(SOURCES / 'tomate-projetil.png', tuple(TOMATO_CENTERS)))]


def crow(quality: int) -> list[tuple[Image.Image, int, int]]:
    cell = EFFECT_CELL * quality
    birds = [sheets.resized(data, quality) for data, _, _ in sheets.poses(SOURCES / 'corvo.png')]
    return [(bird, (cell - bird.width) // 2, (cell - bird.height) // 2) for bird in birds]


EFFECTS = {'tomato': tomato, 'crow': crow}

if __name__ == '__main__':
    arguments = sys.argv[1:]
    output = Path(arguments.pop(arguments.index('--saida') + 1)) if '--saida' in arguments else None
    if output: arguments.remove('--saida')
    selected = arguments or ['idle', *EFFECTS]
    unknown = [name for name in selected if name not in ('idle', *EFFECTS)]
    if unknown: raise SystemExit(f'Itens desconhecidos: {", ".join(unknown)}')
    for name in selected:
        for quality, folder in ((1, output or sheets.SPRITES / 'shoto'), (2, (output or sheets.SPRITES / 'shoto') / 'high')):
            if name == 'idle': idle(folder, quality)
            else: sheets.atlas(folder, name, EFFECT_CELL * quality, EFFECTS[name](quality))
