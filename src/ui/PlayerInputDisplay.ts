// src/ui/PlayerInputDisplay.ts
import Phaser from 'phaser';
import type { AttackButton, FrameInput } from '../input/types';

const DIRECTION_KEYS = ['UB', 'U', 'UF', 'B', 'N', 'F', 'DB', 'D', 'DF'] as const;
const ATTACK_BUTTONS = ['1', '2', '3', '4'] as const;

/** Exibe direção, botões e sequência recente lidos do teclado. */
export class PlayerInputDisplay {
  private readonly directionKeys = new Map<string, Phaser.GameObjects.Text>();
  private readonly attackKeys = new Map<string, Phaser.GameObjects.Text>();
  private readonly history: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    title: string,
    accent: string,
  ) {
    scene.add.rectangle(x + 100, y + 64, 200, 128, 0x17171d, 0.94)
      .setStrokeStyle(1, 0x57545e, 0.9);
    scene.add.text(x + 10, y + 7, title, {
      color: accent,
      fontSize: '13px',
      fontStyle: 'bold',
    });

    DIRECTION_KEYS.forEach((direction, index) => {
      const column = index % 3;
      const row = Math.floor(index / 3);
      const key = scene.add.text(x + 87 + column * 20, y + 28 + row * 18, direction, {
        color: '#777680',
        fontSize: '11px',
        fontStyle: 'bold',
        align: 'center',
        fixedWidth: 20,
      }).setOrigin(0.5, 0);
      this.directionKeys.set(direction, key);
    });

    ATTACK_BUTTONS.forEach((button, index) => {
      const key = scene.add.text(x + 18 + index * 33, y + 88, button, {
        color: '#777680',
        backgroundColor: '#2b2a32',
        fontSize: '13px',
        fontStyle: 'bold',
        align: 'center',
        fixedWidth: 26,
        padding: { top: 3, bottom: 3 },
      }).setOrigin(0, 0);
      this.attackKeys.set(button, key);
    });

    this.history = scene.add.text(x + 10, y + 111, 'Entrada: N', {
      color: '#c4c1cc',
      fontSize: '9px',
      fixedWidth: 180,
      maxLines: 1,
    });
  }

  update(input: FrameInput, recentInputs: readonly FrameInput[]): void {
    const activeDirections = new Set<string>();
    if (input.direction === 'N') activeDirections.add('N');
    else {
      for (const direction of ['U', 'D', 'F', 'B'] as const) {
        if (input.direction.includes(direction)) activeDirections.add(direction);
      }
      activeDirections.add(input.direction);
    }

    this.directionKeys.forEach((key, direction) => {
      key.setColor(activeDirections.has(direction) ? '#ffd166' : '#777680');
    });
    this.attackKeys.forEach((key, button) => {
      const pressed = input.buttons.has(button as AttackButton);
      key.setColor(pressed ? '#ffffff' : '#777680');
      key.setBackgroundColor(pressed ? '#a43f52' : '#2b2a32');
    });

    const sequence = compressInputs(recentInputs).slice(-8).join('  ');
    const current = formatInput(input);
    this.history.setText(`Entrada: ${current}   |   ${sequence || '—'}`);
  }

  destroy(): void {
    this.directionKeys.forEach((key) => key.destroy());
    this.attackKeys.forEach((key) => key.destroy());
    this.history.destroy();
  }
}

function formatInput(input: FrameInput): string {
  const buttons = [...input.buttons].sort().join('+');
  return buttons ? `${input.direction}+${buttons}` : input.direction;
}

function compressInputs(inputs: readonly FrameInput[]): string[] {
  const sequence: string[] = [];
  for (const input of inputs) {
    const token = formatInput(input);
    if (sequence[sequence.length - 1] !== token) sequence.push(token);
  }
  return sequence;
}
