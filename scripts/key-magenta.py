"""Remove o fundo magenta (#FA02F8) de uma arte de personagem, sem tocar nos demais pixels.

Uso: python3 scripts/key-magenta.py <entrada.png> <saida.png>
As artes não usam tons rosados: todo pixel com o matiz do fundo sai, inclusive as ilhas presas entre braços, cabelo e
acessórios e as bordas em que o magenta se misturou ao contorno escuro ou a cores claras. Vermelhos (a partir de 340°)
ficam fora da faixa de matiz. Sprites usam uma faixa mais estreita (`SPRITE_HUE_TOLERANCE`): neles o fundo e sua
mistura com o contorno ficam perto de 300°, enquanto franjas e acessórios carmim chegam a 325°.
Uma entrada já recortada mantém sua transparência (inclusive a parcial de bordas e efeitos); os pixels removidos
ficam com alfa 0. `prepare-sprites.py` aplica esta limpeza a todo sprite novo ou alterado.
"""
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

KEY_HUE = 300  # #FA02F8
HUE_TOLERANCE = 40
SPRITE_HUE_TOLERANCE = 20
MIN_SATURATION = .25
# Next to the cut, magenta blended into white hair or highlights leaves a pale pink of low saturation.
EDGE_MIN_SATURATION = .1
# The pale fringe is followed inward until nothing more is reached; on the game's sprites it settles within 21 passes.
EDGE_PASSES = 32
MIN_VALUE = .08


def magenta(rgb: np.ndarray, min_saturation: float, tolerance: float) -> np.ndarray:
    color = rgb.astype(float) / 255
    red, green, blue = color[..., 0], color[..., 1], color[..., 2]
    high, low = color.max(axis=2), color.min(axis=2)
    spread = np.maximum(high - low, 1e-9)
    hue = np.where(high == red, ((green - blue) / spread) % 6,
                   np.where(high == green, (blue - red) / spread + 2, (red - green) / spread + 4)) * 60
    saturation = spread / np.maximum(high, 1e-9)
    return (np.abs(hue - KEY_HUE) <= tolerance) & (saturation > min_saturation) & (high > MIN_VALUE)


def background_mask(rgb: np.ndarray, transparent: np.ndarray, tolerance: float = HUE_TOLERANCE) -> np.ndarray:
    removed = transparent | magenta(rgb, MIN_SATURATION, tolerance)
    pale = magenta(rgb, EDGE_MIN_SATURATION, tolerance)
    for _ in range(EDGE_PASSES):
        reached = pale & ndimage.binary_dilation(removed) & ~removed
        if not reached.any(): break
        removed |= reached
    return removed


def clean(pixels: np.ndarray, tolerance: float = HUE_TOLERANCE) -> int:
    """Clears the background in place on an RGBA array; returns how many visible pixels were removed."""
    removed = background_mask(pixels[..., :3], pixels[..., 3] == 0, tolerance) & (pixels[..., 3] > 0)
    pixels[..., 3][removed] = 0
    return int(removed.sum())


def key(source: str, target: str) -> None:
    pixels = np.array(Image.open(source).convert('RGBA'))
    clean(pixels)
    Image.fromarray(pixels).save(target, optimize=True)


if __name__ == '__main__':
    key(sys.argv[1], sys.argv[2])
