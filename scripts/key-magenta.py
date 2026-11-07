"""Remove o fundo magenta (#FA02F8) de uma arte de personagem, sem tocar nos demais pixels.

Uso: python3 scripts/key-magenta.py <entrada.png> <saida.png>
As artes não usam tons rosados: todo pixel com o matiz do fundo sai, inclusive as ilhas presas entre braços, cabelo e
acessórios e as bordas em que o magenta se misturou ao contorno escuro ou a cores claras. Vermelhos (a partir de 340°)
ficam fora da faixa de matiz.
Uma entrada já recortada mantém sua transparência. O resultado é RGBA com alfa 0 ou 255.
"""
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

KEY_HUE = 300  # #FA02F8
HUE_TOLERANCE = 40
MIN_SATURATION = .25
# Next to the cut, magenta blended into white hair or highlights leaves a pale pink of low saturation.
EDGE_MIN_SATURATION = .1
EDGE_PASSES = 2
MIN_VALUE = .08


def magenta(rgb: np.ndarray, min_saturation: float) -> np.ndarray:
    color = rgb.astype(float) / 255
    red, green, blue = color[..., 0], color[..., 1], color[..., 2]
    high, low = color.max(axis=2), color.min(axis=2)
    spread = np.maximum(high - low, 1e-9)
    hue = np.where(high == red, ((green - blue) / spread) % 6,
                   np.where(high == green, (blue - red) / spread + 2, (red - green) / spread + 4)) * 60
    saturation = spread / np.maximum(high, 1e-9)
    return (np.abs(hue - KEY_HUE) <= HUE_TOLERANCE) & (saturation > min_saturation) & (high > MIN_VALUE)


def background_mask(rgb: np.ndarray, transparent: np.ndarray) -> np.ndarray:
    removed = transparent | magenta(rgb, MIN_SATURATION)
    pale = magenta(rgb, EDGE_MIN_SATURATION)
    for _ in range(EDGE_PASSES):
        removed |= pale & ndimage.binary_dilation(removed)
    return removed


def key(source: str, target: str) -> None:
    pixels = np.array(Image.open(source).convert('RGBA'))
    pixels[..., 3] = np.where(background_mask(pixels[..., :3], pixels[..., 3] == 0), 0, 255)
    Image.fromarray(pixels).save(target, optimize=True)


if __name__ == '__main__':
    key(sys.argv[1], sys.argv[2])
