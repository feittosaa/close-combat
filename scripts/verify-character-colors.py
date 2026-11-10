"""Confere e corrige, em execução, as cores de um personagem para que sejam as mesmas em todas as folhas de sprites.

Uso: python3 scripts/verify-character-colors.py <personagem> [--relatorio saida.png] [folha...]
A referência são as folhas de espera (`idle*.png`) e o turnaround (`assets/art/characters/<id>/turnaround.png`). Suas
cores sólidas (sem contorno, sem bordas semitransparentes, sem o papel do turnaround) são agrupadas em materiais — pele,
camisa, calça, palha, botas etc. Cada pixel sólido de cada folha vai para o material mais próximo, e a cor mediana do
material na folha é comparada com a da espera em CIELAB: o tom (a*, b*) tem tolerância estreita; a luminosidade, folga
maior, pois poses agachadas ou viradas recebem mais sombra. Também acusa a fração de pixels sem material próximo.

Correção: as PNGs não mudam. Para cada folha com desvio, o script ajusta uma transformação de cor (matriz 3×3 e
deslocamento sobre o RGB, puxados para a identidade) que leva o tom de cada material ao da espera, mantendo a
luminosidade da folha, e grava em `src/assets/sprites/characters/<id>/colors.json`; o shader dos personagens
(`palettePipeline.ts`) a aplica antes da paleta alternativa e da luz do cenário. A conferência final é feita sobre as
cores já corrigidas, como aparecem no jogo; para cada problema restante, lista os quadros em que ele aparece.
O turnaround é só comparado. Com `--relatorio`, grava uma imagem com uma linha por folha e, por material, as amostras
da espera, da folha original e da folha corrigida (moldura vermelha onde resta desvio).
Efeitos e projéteis (`EFFECTS`) ficam de fora. Sai com código 1 se restar algum desvio.
"""
from pathlib import Path
import json
import sys

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
EFFECTS = {'tomato', 'crow', 'effect-ultimate-wind'}
MATERIALS = 10
# Pixels darker than this lightness are outline and line work, not material color.
OUTLINE_L = 22
# Distance (ΔE) beyond which a pixel matches no material of the reference.
OFF_PALETTE = 18
# Tolerances: tone (a*, b* distance; about where two flat swatches side by side stop reading as the same paint) and
# lightness of a material's median; share of off-palette pixels.
TONE = 6
LIGHTNESS = 14
OFF_SHARE = .08
# A material needs this many pixels per frame to be compared (a sheet: on average over its frames).
MIN_PIXELS = 300
# Pull of the correction toward the identity: keeps colors without a material (effects, line work) nearly unchanged.
STIFFNESS = .005
# Fits refined on the already corrected colors (a material's membership shifts as its color moves).
PASSES = 5
# Turnaround paper: lightness and chroma of the background behind the drawing.
PAPER_L, PAPER_CHROMA = 88, 12
SWATCH, LABEL_WIDTH = 24, 190
IDENTITY = np.hstack([np.eye(3), np.zeros((3, 1))])
SRGB_TO_XYZ = np.array([[.4124, .3576, .1805], [.2126, .7152, .0722], [.0193, .1192, .9505]])
WHITE = np.array([.95047, 1, 1.08883])


def lab(rgb: np.ndarray) -> np.ndarray:
    """sRGB (0–255) to CIELAB (D65)."""
    c = rgb.astype(float) / 255
    c = np.where(c > .04045, ((c + .055) / 1.055) ** 2.4, c / 12.92)
    xyz = c @ SRGB_TO_XYZ.T / WHITE
    f = np.where(xyz > .008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], axis=-1)


def srgb(color: np.ndarray) -> np.ndarray:
    """CIELAB (D65) to sRGB (0–255), clipped to the gamut."""
    fy = (color[..., 0] + 16) / 116
    f = np.stack([fy + color[..., 1] / 500, fy, fy - color[..., 2] / 200], axis=-1)
    xyz = np.where(f > .206893, f ** 3, (f - 16 / 116) / 7.787) * WHITE
    c = np.clip(xyz @ np.linalg.inv(SRGB_TO_XYZ).T, 0, 1)
    return np.where(c > .0031308, 1.055 * c ** (1 / 2.4) - .055, 12.92 * c) * 255


def correct(rgb: np.ndarray, correction: np.ndarray) -> np.ndarray:
    """Applies a correction to RGB (0–255) the way the shader does, storing 8-bit values."""
    return np.round(np.clip(rgb / 255 @ correction[:, :3].T + correction[:, 3], 0, 1) * 255)


class Colors:
    """The solid (opaque, non-outline) pixels of a drawing, in RGB and Lab."""

    def __init__(self, rgb: np.ndarray):
        self.rgb, self.lab = rgb, lab(rgb)

    @classmethod
    def of(cls, pixels: np.ndarray) -> 'Colors':
        colors = cls(pixels[..., :3][pixels[..., 3] >= 250])
        return colors.where(colors.lab[:, 0] >= OUTLINE_L)

    @classmethod
    def join(cls, parts: list['Colors']) -> 'Colors':
        return cls(np.concatenate([part.rgb for part in parts]))

    def where(self, keep: np.ndarray) -> 'Colors':
        part = Colors(np.empty((0, 3)))
        part.rgb, part.lab = self.rgb[keep], self.lab[keep]
        return part

    def corrected(self, correction: np.ndarray) -> 'Colors':
        return Colors(correct(self.rgb, correction))


def turnaround(path: Path) -> Colors:
    colors = Colors.of(np.asarray(Image.open(path).convert('RGBA')))
    paper = (colors.lab[:, 0] > PAPER_L) & (np.hypot(colors.lab[:, 1], colors.lab[:, 2]) < PAPER_CHROMA)
    return colors.where(~paper)


def frames(sheet: Path) -> list[Colors]:
    pixels = np.asarray(Image.open(sheet).convert('RGBA'))
    layout = json.loads(sheet.with_suffix('.atlas.json').read_text())['frames']
    return [Colors.of(pixels[f['y']:f['y'] + f['h'], f['x']:f['x'] + f['w']])
            for f in (layout[key]['frame'] for key in sorted(layout, key=int))]


def kmeans(samples: np.ndarray, count: int, rounds: int = 30) -> np.ndarray:
    """Deterministic k-means (farthest-point start) over Lab samples."""
    centers = [samples[np.argmin(samples[:, 0])]]
    for _ in range(count - 1):
        distance = np.min([np.linalg.norm(samples - center, axis=1) for center in centers], axis=0)
        centers.append(samples[np.argmax(distance)])
    centers = np.array(centers)
    for _ in range(rounds):
        nearest, _ = assign(samples, centers)
        centers = np.array([samples[nearest == k].mean(axis=0) if (nearest == k).any() else centers[k] for k in range(count)])
    return centers


def assign(colors: np.ndarray, centers: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    distance = np.linalg.norm(colors[:, None, :] - centers[None], axis=2)
    return distance.argmin(axis=1), distance.min(axis=1)


def materials(colors: Colors, centers: np.ndarray, frames: int = 1) -> tuple[dict[int, tuple[np.ndarray, np.ndarray, int]], float]:
    """Median Lab and RGB, and pixel count, of each material with enough pixels per frame; and the off-palette share."""
    if not len(colors.lab): return {}, 0.
    nearest, distance = assign(colors.lab, centers)
    near = distance <= OFF_PALETTE
    found = {}
    for k in range(len(centers)):
        mine = near & (nearest == k)
        if mine.sum() >= MIN_PIXELS * frames:
            found[k] = np.median(colors.lab[mine], axis=0), np.median(colors.rgb[mine], axis=0), int(mine.sum())
    return found, float((~near).mean())


def hex_color(rgb: np.ndarray) -> str:
    return '#' + ''.join(f'{round(value):02x}' for value in rgb)


def deviations(colors: Colors, centers: np.ndarray, reference: dict, frames: int = 1, compared: set[int] | None = None) -> tuple[dict[int, str], float, dict]:
    """Materials whose median strays from the reference (with a description), the off-palette share and the medians.
    `compared` limits the check to those materials."""
    found, off = materials(colors, centers, frames)
    strayed = {}
    for k, (color, rgb, _) in found.items():
        if k not in reference or (compared is not None and k not in compared): continue
        tone = float(np.hypot(*(color[1:] - reference[k][0][1:])))
        light = float(color[0] - reference[k][0][0])
        if tone > TONE or abs(light) > LIGHTNESS:
            strayed[k] = f'{hex_color(reference[k][1])} → {hex_color(rgb)} (tom Δ{tone:.1f}, luz {light:+.1f})'
    return strayed, off, found


def fit(found: dict, reference: dict) -> np.ndarray:
    """Least-squares color correction taking each material's median to the reference tone at its own lightness,
    weighted by pixel count and pulled toward the identity."""
    shared = [k for k in found if k in reference]
    sources = np.array([found[k][1] / 255 for k in shared])
    targets = np.array([srgb(np.array([found[k][0][0], *reference[k][0][1:]])) / 255 for k in shared])
    # Square root of each material's share, so a small one (the skin of a covered pose) still pulls on the fit.
    weights = (np.array([found[k][2] for k in shared], float) / sum(found[k][2] for k in shared)) ** .25
    rows = np.vstack([np.hstack([sources, np.ones((len(shared), 1))]) * weights[:, None], np.sqrt(STIFFNESS) * np.eye(4)])
    correction = []
    for channel in range(3):
        goal = np.concatenate([targets[:, channel] * weights, np.sqrt(STIFFNESS) * IDENTITY[channel]])
        correction.append(np.linalg.lstsq(rows, goal, rcond=None)[0])
    return np.array(correction)


def check(label: str, parts: list[Colors], centers: np.ndarray, reference: dict, compared: set[int] | None = None) -> tuple[list[str], dict, set[int]]:
    """Problems of a sheet as a whole, each with the frames where it shows; the medians and the strayed materials.
    A corrected sheet is judged only on the materials it had (`compared`): colors moved by the correction may cross
    into a material the drawing does not have, such as the rake's orange."""
    strayed, off, found = deviations(Colors.join(parts), centers, reference, len(parts), compared)
    by_frame = [deviations(part, centers, reference, 1, compared) for part in parts]
    problems = []
    for k, text in strayed.items():
        listed = [str(index) for index, (frame, _, _) in enumerate(by_frame) if k in frame]
        problems.append(f'{label}: material {k} {text}' + (f' — quadros {", ".join(listed)}' if listed else ''))
    if off > OFF_SHARE:
        listed = [str(index) for index, (_, share, _) in enumerate(by_frame) if share > OFF_SHARE]
        problems.append(f'{label}: {off:.0%} dos pixels sólidos fora da paleta' + (f' — quadros {", ".join(listed)}' if listed else ''))
    return problems, found, set(strayed)


def report(path: Path, reference: dict, rows: list[tuple[str, dict, dict, set[int]]]) -> None:
    """One row per sheet; per material, the idle swatch on top, then the original and the corrected sheet."""
    keys = sorted(reference)
    height = SWATCH * 3 + 6
    image = Image.new('RGB', (LABEL_WIDTH + SWATCH * len(keys), height * (len(rows) + 1)), (40, 40, 40))
    draw = ImageDraw.Draw(image)
    for column, k in enumerate(keys): draw.text((LABEL_WIDTH + column * SWATCH + 7, 8), str(k), fill=(230, 230, 230))
    for row, (label, before, after, strayed) in enumerate(rows, start=1):
        top = row * height
        draw.text((6, top + SWATCH), label, fill=(230, 230, 230))
        for column, k in enumerate(keys):
            left = LABEL_WIDTH + column * SWATCH
            for line, colors in enumerate((reference, before, after)):
                if k not in colors: continue
                box = (left, top + line * SWATCH, left + SWATCH - 1, top + (line + 1) * SWATCH - 1)
                draw.rectangle(box, fill=tuple(round(v) for v in colors[k][1]), outline=(255, 40, 40) if line == 2 and k in strayed else None, width=3)
    image.save(path)


def main() -> None:
    arguments = sys.argv[1:]
    output = None
    if '--relatorio' in arguments:
        index = arguments.index('--relatorio')
        output = Path(arguments[index + 1])
        del arguments[index:index + 2]
    if not arguments: raise SystemExit(__doc__)
    character, selected = arguments[0], set(arguments[1:])
    sprites = ROOT / 'src/assets/sprites/characters' / character
    sheets = sorted(path for path in sprites.glob('*.png') if path.stem not in EFFECTS and path.with_suffix('.atlas.json').exists())
    if not sheets: raise SystemExit(f'Nenhuma folha com atlas em {sprites.relative_to(ROOT)}.')
    idle_parts = [frame for sheet in sheets if sheet.stem.startswith('idle') for frame in frames(sheet)]
    idle = Colors.join(idle_parts)
    art_path = ROOT / 'assets/art/characters' / character / 'turnaround.png'
    art = turnaround(art_path) if art_path.exists() else None
    pool = np.concatenate([idle.lab, art.lab]) if art else idle.lab
    centers = kmeans(pool[np.random.default_rng(0).choice(len(pool), min(len(pool), 60000), replace=False)], MATERIALS)
    reference, _ = materials(idle, centers, len(idle_parts))
    corrections_file = sprites / 'colors.json'
    corrections = json.loads(corrections_file.read_text()) if corrections_file.exists() else {}

    print('Materiais da espera: ' + ', '.join(f'{k} {hex_color(reference[k][1])}' for k in sorted(reference)))
    problems, rows, fixed = [], [], []
    if art:
        found_problems, found, strayed = check('turnaround', [art], centers, reference)
        problems += found_problems; rows.append(('turnaround', found, found, strayed))
    for sheet in sheets:
        if selected and sheet.stem not in selected: continue
        parts = frames(sheet)
        corrections.pop(sheet.stem, None)
        original, before, strayed = check(sheet.stem, parts, centers, reference)
        if original and not sheet.stem.startswith('idle'):
            correction, corrected, after = IDENTITY, parts, before
            for _ in range(PASSES):
                step = fit(after, reference)
                correction = np.hstack([step[:, :3] @ correction[:, :3], step[:, :3] @ correction[:, 3:] + step[:, 3:]])
                corrected = [part.corrected(correction) for part in parts]
                remaining, after, strayed = check(sheet.stem, corrected, centers, reference, set(before))
            if len(remaining) < len(original):
                corrections[sheet.stem] = [round(float(value), 5) for value in correction.ravel()]
                fixed.append(f'{sheet.stem} ({len(original)} → {len(remaining)})')
                problems += remaining; rows.append((sheet.stem, before, after, strayed))
                continue
        problems += original; rows.append((sheet.stem, before, before, strayed))
    corrections_file.write_text('{\n' + ',\n'.join(f' "{name}": {json.dumps(values)}' for name, values in sorted(corrections.items())) + '\n}\n')
    if fixed: print('Corrigidas em execução (desvios antes → depois): ' + ', '.join(fixed))
    print('\n'.join(problems) if problems else 'Cores coerentes em todas as folhas.')
    if output: report(output, reference, rows)
    if problems: sys.exit(1)


if __name__ == '__main__':
    main()
