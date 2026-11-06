"""Remove o fundo magenta de uma arte de personagem, sem tocar nos demais pixels.

Uso: python3 scripts/key-magenta.py <entrada.png> <saida.png>
O fundo é o magenta ligado à borda da imagem (o tom varia levemente de uma arte para outra). Também saem as ilhas
fechadas da mesma cor entre braços, cabelo e acessórios, desde que sejam grandes: tons rosados pequenos dentro do
personagem permanecem intactos. O resultado é RGBA com alfa 0 ou 255.
"""
import sys
from collections import deque

import numpy as np
from PIL import Image
from scipy import ndimage

ISLAND_MIN_PIXELS = 150
ISLAND_TOLERANCE = 60


def background_mask(rgb: np.ndarray) -> np.ndarray:
    red, green, blue = (rgb[:, :, channel].astype(int) for channel in range(3))
    magenta = (red > 190) & (blue > 170) & (green < 110) & (np.abs(red - blue) < 70)
    height, width = magenta.shape
    reached = np.zeros_like(magenta)
    queue: deque[tuple[int, int]] = deque()
    for x in range(width):
        for y in (0, height - 1):
            if magenta[y, x] and not reached[y, x]:
                reached[y, x] = True; queue.append((y, x))
    for y in range(height):
        for x in (0, width - 1):
            if magenta[y, x] and not reached[y, x]:
                reached[y, x] = True; queue.append((y, x))
    while queue:
        y, x = queue.popleft()
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= ny < height and 0 <= nx < width and magenta[ny, nx] and not reached[ny, nx]:
                reached[ny, nx] = True; queue.append((ny, nx))
    if reached.any():
        key = np.median(rgb[reached], axis=0)
        near = np.abs(rgb.astype(int) - key).sum(axis=2) < ISLAND_TOLERANCE
        labels, count = ndimage.label(near & ~reached)
        sizes = ndimage.sum(near & ~reached, labels, range(1, count + 1))
        for label, size in enumerate(sizes, start=1):
            if size >= ISLAND_MIN_PIXELS:
                reached |= labels == label
    return reached


def key(source: str, target: str) -> None:
    rgb = np.array(Image.open(source).convert('RGB'))
    alpha = np.where(background_mask(rgb), 0, 255).astype(np.uint8)
    Image.fromarray(np.dstack([rgb, alpha])).save(target, optimize=True)


if __name__ == '__main__':
    key(sys.argv[1], sys.argv[2])
