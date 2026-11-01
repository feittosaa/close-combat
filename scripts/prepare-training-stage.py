#!/usr/bin/env python3
"""Prepare the supplied five-frame room with Upscayl and a stationary background."""
import argparse
import json
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
STAGE = ROOT / 'src/assets/scenes/sala-treino'
BOXES = [(7, 7, 719, 351), (733, 7, 1445, 351), (1455, 7, 2167, 351),
         (239, 365, 1076, 717), (1100, 365, 1937, 717)]


def prepare(upscaled: Path) -> None:
    frames = [Image.open(upscaled / f'sala-{index}.png').convert('RGB') for index in range(1, 6)]
    if any(frame.size != (1424, 688) for frame in frames):
        raise ValueError('Os cinco quadros ampliados devem ter 1424 × 688 pixels.')
    # Only the flag areas change; floor, walls, props and target share one exact image.
    mask = Image.new('L', frames[0].size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((105, 74, 327, 388), radius=16, fill=255)
    draw.rounded_rectangle((1105, 74, 1318, 388), radius=16, fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(6))
    for index, frame in enumerate(frames, 1):
        result = frames[0] if index == 1 else Image.composite(frame, frames[0], mask)
        result.save(STAGE / 'layers' / f'sala-{index}.png', optimize=True)
    manifest_path = STAGE / 'stage.json'
    manifest = json.loads(manifest_path.read_text())
    manifest['referenceSize'] = {'width': 1424, 'height': 688}
    manifest['groundY'] = 600
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--upscaled', type=Path, help='Reuse already upscaled 1424 × 688 frames')
    parser.add_argument('--upscayl', default='/opt/Upscayl/resources/bin/upscayl-bin')
    parser.add_argument('--models', default='/opt/Upscayl/resources/models')
    args = parser.parse_args()
    if args.upscaled:
        prepare(args.upscaled)
        return
    with tempfile.TemporaryDirectory() as tmp:
        directory = Path(tmp)
        source, output = directory / 'input', directory / 'output'
        source.mkdir(); output.mkdir()
        sheet = Image.open(STAGE / 'source/training-room-sheet.png').convert('RGB')
        for index, box in enumerate(BOXES, 1):
            sheet.crop(box).resize((712, 344), Image.Resampling.LANCZOS).save(source / f'sala-{index}.png')
        subprocess.run([args.upscayl, '-i', str(source), '-o', str(output), '-m', args.models,
                        '-n', 'high-fidelity-4x', '-s', '2', '-j', '1:2:1'], check=True)
        prepare(output)


if __name__ == '__main__':
    main()
