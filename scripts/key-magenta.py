"""Remove o fundo magenta (#FA02F8) de uma arte de personagem, sem tocar nos demais pixels.

Uso: python3 scripts/key-magenta.py <entrada.png> <saida.png>
As artes não usam tons rosados: todo pixel claro com o matiz do fundo sai, inclusive as ilhas presas entre braços,
cabelo e acessórios e as bordas em que o magenta se misturou a cores claras (do lado azul, só até 20° do fundo). Os tons escuros desse matiz só saem junto
ao fundo removido (a mistura com o contorno escuro); dentro do desenho são sombras arroxeadas da própria arte. Vermelhos (a partir de 340°)
ficam fora da faixa de matiz. Sprites usam uma faixa mais estreita (`SPRITE_HUE_TOLERANCE`): neles o fundo e sua
mistura com o contorno ficam perto de 300°, enquanto franjas e acessórios carmim chegam a 325°.
Uma entrada já recortada mantém sua transparência (inclusive a parcial de bordas e efeitos; o resíduo quase invisível,
com alfa abaixo de 16, conta como fundo para alcançar o halo, mas só sai se for magenta); os pixels removidos ficam com alfa 0,
exceto a mistura do fundo com o contorno preto, que vira preto com a cobertura do contorno (a linha preta não afina).
`prepare-sprites.py` aplica esta limpeza a todo sprite novo ou alterado.
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
# That fringe is pink, so on the blue side it stops near the key: lilac and violet skin (around 260°) touching the
# background, as on the Gimmick's arms, belongs to the drawing.
EDGE_BLUE_TOLERANCE = 20
# The pale fringe is followed inward until nothing more is reached; on the game's sprites it settles within 21 passes.
EDGE_PASSES = 32
MIN_VALUE = .08
# Purple-tinted shading of the drawing (the emblem and band of the Texas hat, dark clothes) is darker and less saturated
# than the background, whose blends with the black outline keep its full saturation. Shading and near-black outline
# only go when they touch the removed background, so what the drawing encloses stays.
SHADING_VALUE = .75
SHADING_SATURATION = .85
OUTLINE_VALUE = .3
# Residue of a background already made transparent (alpha up to 15) is invisible and counts as background.
FAINT_ALPHA = 16
# Brightest channel of the key: a removed pixel this saturated is the key blended with the black outline, whose share of
# black stays as a black pixel with that coverage, so the outline keeps its width and antialiasing.
KEY_VALUE = 250


def magenta(rgb: np.ndarray, min_saturation: float, tolerance: float, blue_tolerance: float | None = None) -> np.ndarray:
    """Pixels within `tolerance` of the key hue (`blue_tolerance` on the blue side, when given)."""
    color = rgb.astype(float) / 255
    red, green, blue = color[..., 0], color[..., 1], color[..., 2]
    high, low = color.max(axis=2), color.min(axis=2)
    spread = np.maximum(high - low, 1e-9)
    hue = np.where(high == red, ((green - blue) / spread) % 6,
                   np.where(high == green, (blue - red) / spread + 2, (red - green) / spread + 4)) * 60
    saturation = spread / np.maximum(high, 1e-9)
    offset = hue - KEY_HUE
    return (offset <= tolerance) & (offset >= -min(tolerance, blue_tolerance or tolerance)) & (saturation > min_saturation) & (high > MIN_VALUE)


def background_mask(rgb: np.ndarray, transparent: np.ndarray, tolerance: float = HUE_TOLERANCE) -> np.ndarray:
    color = rgb.astype(float) / 255
    value, saturation = color.max(axis=2), 1 - color.min(axis=2) / np.maximum(color.max(axis=2), 1e-9)
    drawing = (value < OUTLINE_VALUE) | ((value < SHADING_VALUE) & (saturation < SHADING_SATURATION))
    removed = transparent | (magenta(rgb, MIN_SATURATION, tolerance) & ~drawing)
    pale = magenta(rgb, EDGE_MIN_SATURATION, tolerance, EDGE_BLUE_TOLERANCE)
    for _ in range(EDGE_PASSES):
        reached = pale & ndimage.binary_dilation(removed) & ~removed
        if not reached.any(): break
        removed |= reached
    return removed


def clean(pixels: np.ndarray, tolerance: float = HUE_TOLERANCE) -> int:
    """Clears the background in place on an RGBA array; returns how many visible pixels were removed."""
    faint = pixels[..., 3] < FAINT_ALPHA
    # Faint pixels lead the cleanup to the background around them, but only magenta ones are cleared.
    kept = faint & ~magenta(pixels[..., :3], EDGE_MIN_SATURATION, tolerance)
    removed = background_mask(pixels[..., :3], faint, tolerance) & ~kept & (pixels[..., 3] > 0)
    color = pixels[..., :3].astype(float)
    high = color.max(axis=2)
    outline = removed & ~faint & (color.min(axis=2) < high * (1 - SHADING_SATURATION))
    coverage = np.clip(1 - high / KEY_VALUE, 0, 1) * pixels[..., 3]
    outline &= coverage >= FAINT_ALPHA
    pixels[..., 3][removed] = 0
    pixels[..., 3][outline] = coverage[outline].round().astype(np.uint8)
    pixels[..., :3][outline] = 0
    return int(removed.sum())


def key(source: str, target: str) -> None:
    pixels = np.array(Image.open(source).convert('RGBA'))
    clean(pixels)
    Image.fromarray(pixels).save(target, optimize=True)


if __name__ == '__main__':
    key(sys.argv[1], sys.argv[2])
