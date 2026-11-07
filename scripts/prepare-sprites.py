"""Etapa automática de entrada dos sprites: limpeza do fundo #FA02F8 e medição para o tamanho automático.

Uso: python3 scripts/prepare-sprites.py
Roda sozinho antes de `npm run dev` e `npm run build` e, com o servidor de desenvolvimento aberto, a cada PNG
adicionado ou trocado em `src/assets/sprites` (plugin em `vite.config.ts`).

1. Todo PNG novo ou alterado passa pela limpeza de `key-magenta.py`, com a faixa de matiz dos sprites (só pixels com
   o matiz do fundo saem; a transparência existente é preservada), e só é regravado se algo mudou. Vermelhos, carmins e
   vinhos (a partir de 320°) ficam intactos.
2. Se uma folha de personagem entrou, mudou ou saiu, `measure-sprites.py` mede tudo de novo; o motor deriva dessas medidas o tamanho
   automático de cada animação (`spriteScale.ts`).

Uma mudança na própria limpeza (`key-magenta.py`) faz todos os sprites passarem de novo. Quando a limpeza muda uma
folha já validada sem que a arte tenha sido trocada, a calibração recebe a mesma proporção que a limpeza mudou na medição
(área e altura da silhueta), para que tirar o halo do fundo não altere o tamanho aprovado. Ambos podem ser ajustados à
mão depois: o tamanho validado fica em `calibration.json` de cada personagem (o modo
desenvolvedor ajusta e exporta), e um PNG listado em `keep` de `prepared.json` não volta a ser limpo. O registro
`prepared.json` guarda o SHA-256 de cada PNG já preparado e da versão da limpeza; arquivos inalterados são pulados.
"""
from concurrent.futures import ProcessPoolExecutor
from hashlib import sha256
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import json
import subprocess
import sys

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SPRITES = ROOT / 'src/assets/sprites'
REGISTRY = SPRITES / 'prepared.json'
CHARACTERS = SPRITES / 'characters'


def keyer():
    sys.dont_write_bytecode = True  # loading key-magenta.py must not leave a cache beside the scripts
    spec = spec_from_file_location('key_magenta', Path(__file__).with_name('key-magenta.py'))
    module = module_from_spec(spec); spec.loader.exec_module(module)
    return module


def digest(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest()


def prepare(path: Path) -> tuple[str, int, str]:
    """Cleans one sheet; returns its registry key, how many pixels left and the stored file's hash."""
    pixels = np.array(Image.open(path).convert('RGBA'))
    module = keyer()
    removed = module.clean(pixels, module.SPRITE_HUE_TOLERANCE)
    if removed: Image.fromarray(pixels).save(path)
    return path.relative_to(ROOT).as_posix(), removed, digest(path)


def measurements(fighter: Path) -> dict:
    file = fighter / 'measurements.json'
    return json.loads(file.read_text()) if file.exists() else {}


def keep_validated_sizes(sheets: list[Path], before: dict[Path, dict]) -> None:
    """Moves the recorded body and height of validated sheets by the cleanup's own change in the measurements, so
    their scale stays exactly the same."""
    for fighter in {sheet.parent for sheet in sheets}:
        calibration_file, after = fighter / 'calibration.json', measurements(fighter)
        calibration = json.loads(calibration_file.read_text()) if calibration_file.exists() else {}
        for sheet in (sheet for sheet in sheets if sheet.parent == fighter):
            validated, old, new = calibration.get(sheet.stem), before[fighter].get(sheet.stem), after.get(sheet.stem)
            if not (validated and old and new): continue
            for field in ('bodies', 'heights'):
                validated[field] = [value * current / previous if previous else value
                                    for value, previous, current in zip(validated[field], old[field], new[field])]
        calibration_file.write_text(json.dumps(calibration, indent=1) + '\n')


def main() -> None:
    registry = json.loads(REGISTRY.read_text()) if REGISTRY.exists() else {'keep': [], 'files': {}}
    files, keep = registry['files'], set(registry['keep'])
    cleanup = digest(Path(__file__).with_name('key-magenta.py'))
    sheets = sorted(SPRITES.rglob('*.png'))
    current = {path: digest(path) for path in sheets}
    pending = [path for path in sheets if registry.get('cleanup') != cleanup or files.get(path.relative_to(ROOT).as_posix()) != current[path]]
    measure = any(path.parent.parent == CHARACTERS for path in pending)
    cleanable = [path for path in pending if path.relative_to(ROOT).as_posix() not in keep]
    before = {fighter: measurements(fighter) for fighter in CHARACTERS.iterdir() if fighter.is_dir()}
    adopted = []
    with ProcessPoolExecutor() as pool:
        for path, (key, removed, stored) in zip(cleanable, pool.map(prepare, cleanable)):
            # Only the cleanup changed this drawing (not new art): its validated size must not move.
            if removed and files.get(key, current[path]) == current[path] and path.parent.parent == CHARACTERS: adopted.append(path)
            files[key] = stored
            if removed: print(f'{key}: {removed} pixels do fundo removidos')
    for path in pending:
        if path not in cleanable: files[path.relative_to(ROOT).as_posix()] = current[path]
    present = {path.relative_to(ROOT).as_posix() for path in sheets}
    measure = measure or any(Path(key).parent.parent == CHARACTERS.relative_to(ROOT) for key in files if key not in present)
    registry['cleanup'], registry['files'] = cleanup, {key: files[key] for key in sorted(files) if key in present}
    REGISTRY.write_text(json.dumps(registry, indent=1) + '\n')
    if measure:
        subprocess.run([sys.executable, str(Path(__file__).with_name('measure-sprites.py'))], check=True)
        keep_validated_sizes(adopted, before)
    print(f'Sprites preparados: {len(pending)} novos ou alterados de {len(sheets)}.')


if __name__ == '__main__':
    main()
