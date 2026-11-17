"""Prepara o mar parado da praia a partir de assets/art/scenes/praia/revisao/mar-parado.png (2172 x 724, faixa de mar
com a espuma da beira na borda de baixo).
Uso: python3 scripts/prepare-praia-sea.py
Recorta a faixa desenhada, uniformiza a opacidade de cada linha (só o esmaecimento de cima e de baixo permanece) e a amplia
para a largura do cenário."""
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE, TARGET = ROOT / 'assets/art/scenes/praia/revisao/mar-parado.png', ROOT / 'src/assets/scenes/praia/layers/mar.png'
WIDTH = 2661
# Sem as colunas das bordas, que são transparentes ou esmaecidas e deixavam um risco no encontro das cópias espelhadas.
BOX = (6, 306, 2167, 441)


def main():
    sea = Image.open(SOURCE).convert('RGBA').crop(BOX)
    pixels = np.array(sea)
    pixels[..., 3] = np.median(pixels[..., 3], axis=1, keepdims=True).astype('uint8')
    sea = Image.fromarray(pixels)
    sea.resize((WIDTH, round(sea.height * WIDTH / sea.width)), Image.Resampling.LANCZOS).save(TARGET, optimize=True)


if __name__ == '__main__':
    main()
