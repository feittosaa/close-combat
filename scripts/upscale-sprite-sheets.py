"""Melhora a nitidez das folhas de personagem com o Upscayl, sem mudar a geometria nem o tamanho de nenhum arquivo.

Uso: python3 scripts/upscale-sprite-sheets.py [personagem ...]   (sem argumentos, todos os personagens)

Cada folha da qualidade alta (`characters/<id>/high/*.png`) é ampliada 2× pelo modelo `digital-art-4x` do Upscayl e reduzida
de volta ao tamanho original com Lanczos (em alfa pré-multiplicado, para não criar halos), o que limpa o ruído de compressão e
refaz os contornos. A folha da qualidade normal sai da alta, reduzida pela metade. As dimensões, os atlas (`.atlas.json`)
e as escalas validadas continuam valendo; o `prepare-sprites.py` mede e empacota de novo as folhas alteradas.
Roda uma vez por folha, em lotes de poucas folhas: o registro `upscaled` de `prepared.json` guarda o que já passou, e uma
nova execução continua de onde parou. O Upscayl precisa estar instalado
(variável UPSCAYL_DIR, por padrão /opt/Upscayl) e usa a primeira GPU."""
from hashlib import sha256
from pathlib import Path
import json
import os
import shutil
import subprocess
import sys

from PIL import Image

Image.MAX_IMAGE_PIXELS = None
ROOT = Path(__file__).resolve().parents[1]
CHARACTERS = ROOT / 'src/assets/sprites/characters'
REGISTRY = ROOT / 'src/assets/sprites/prepared.json'
WORK = ROOT / 'review/sprite-upscale'
UPSCAYL = Path(os.environ.get('UPSCAYL_DIR', '/opt/Upscayl'))


def digest(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest()


def premultiplied_resize(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    return image.convert('RGBa').resize(size, Image.Resampling.LANCZOS).convert('RGBA')


BATCH = 8


def enlarge(batch: list[Path]) -> None:
    """Upscales a few sheets at a time, so little is held in memory and an interruption loses at most one batch."""
    source, result = WORK / 'in', WORK / 'out'
    for folder in (source, result):
        shutil.rmtree(folder, ignore_errors=True); folder.mkdir(parents=True)
    names = {f'{path.parent.parent.name}__{path.name}': path for path in batch}
    for name, path in names.items(): shutil.copy(path, source / name)
    subprocess.run([str(UPSCAYL / 'resources/bin/upscayl-bin'), '-i', str(source), '-o', str(result), '-m', str(UPSCAYL / 'resources/models'),
                    '-n', 'digital-art-4x', '-s', '2', '-g', '0', '-f', 'png'], check=True)
    for name, path in names.items():
        sharp = premultiplied_resize(Image.open(result / name), Image.open(path).size)
        sharp.save(path, optimize=True)
        low = path.parent.parent / path.name
        premultiplied_resize(sharp, Image.open(low).size).save(low, optimize=True)


def main() -> None:
    wanted = set(sys.argv[1:])
    registry = json.loads(REGISTRY.read_text())
    done = set(registry.get('upscaled', []))
    sheets = [path for path in sorted(CHARACTERS.glob('*/high/*.png')) if (not wanted or path.parent.parent.name in wanted)
              and path.relative_to(ROOT).as_posix() not in done]
    print(f'{len(sheets)} folhas a ampliar.', flush=True)
    for start in range(0, len(sheets), BATCH):
        batch = sheets[start:start + BATCH]
        enlarge(batch)
        # Registered right after each batch: a rerun continues where an interruption stopped.
        done.update(path.relative_to(ROOT).as_posix() for path in batch)
        registry['upscaled'] = sorted(done)
        REGISTRY.write_text(json.dumps(registry, indent=1) + '\n')
        print(f'{min(start + BATCH, len(sheets))}/{len(sheets)}', flush=True)
    shutil.rmtree(WORK, ignore_errors=True)
    print('Pronto: rode `python3 scripts/prepare-sprites.py` para medir e empacotar de novo.', flush=True)


if __name__ == '__main__':
    main()
