"""Upscale automático das artes de personagem em resolução muito baixa, com o Upscayl local (`upscayl-bin`).

Uso: python3 scripts/upscale-art.py
Roda também no começo da preparação das artes (`prepare-sprites.py`), antes da limpeza e do recorte: toda arte trocada
ou adicionada pelo modo desenvolvedor ou na pasta passa por aqui.

As artes do jogo foram ampliadas 2× no Upscayl; a referência é a altura delas: cerca de 1984 px na arte de seleção
(`selection-background.png`, `selection-backgrounds/*.png`) e 2170 px na pose de vitória (`fullbody*.png`,
`victory-poses/*.png`). Uma arte com menos de 3/4 dessa altura (caso de uma pose em meia resolução, sem o 2×) é
ampliada pelo menor fator do Upscayl (2, 3 ou 4) que a tira dessa faixa, e o arquivo é regravado no lugar. Os ícones
ficam de fora: a janela do HUD é medida em pixels.
"""
from pathlib import Path
import shutil
import subprocess
import tempfile

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'src/assets/art/characters'
UPSCAYL = Path('/opt/Upscayl/resources/bin/upscayl-bin')
MODEL = 'digital-art-4x'
SCALES = (2, 3, 4)
# Fração da altura de referência abaixo da qual a arte é ampliada.
LIMIT = 3 / 4
# Altura de referência e arquivos de cada tipo de arte.
REFERENCES = (
    (1984, ('*/selection-background.png', '*/selection-backgrounds/*.png')),
    (2170, ('*/fullbody*.png', '*/victory-poses/*.png')),
)


def low_resolution() -> list[tuple[Path, int]]:
    """As artes abaixo do limite, com o menor fator que as leva acima dele."""
    found = []
    for reference, patterns in REFERENCES:
        minimum = reference * LIMIT
        for path in sorted(path for pattern in patterns for path in ART.glob(pattern)):
            with Image.open(path) as image: height = image.height
            if height < minimum:
                found.append((path, next((scale for scale in SCALES if height * scale >= minimum), SCALES[-1])))
    return found


def upscale(path: Path, scale: int) -> None:
    name = path.relative_to(ROOT).as_posix()
    if not UPSCAYL.exists(): raise SystemExit(f'{name} precisa de upscale {scale}×, mas o Upscayl não está em {UPSCAYL}.')
    with tempfile.TemporaryDirectory() as folder:
        output = Path(folder) / path.name
        result = subprocess.run([str(UPSCAYL), '-i', str(path), '-o', str(output), '-s', str(scale),
                                 '-m', str(UPSCAYL.parents[1] / 'models'), '-n', MODEL, '-f', 'png'], capture_output=True, text=True)
        if result.returncode or not output.exists(): raise SystemExit(f'Upscayl falhou em {name}:\n{result.stdout}{result.stderr}')
        shutil.move(output, path)


def main() -> None:
    for path, scale in low_resolution():
        with Image.open(path) as image: before = image.size
        upscale(path, scale)
        with Image.open(path) as image: after = image.size
        print(f'{path.relative_to(ROOT).as_posix()}: upscale {scale}× ({before[0]}×{before[1]} → {after[0]}×{after[1]})')


if __name__ == '__main__':
    main()
