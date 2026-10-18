// src/ui/CombatHud.ts
import Phaser from 'phaser';
import type { CharacterMode } from '../engine/characters/CharacterState';
import type { SimulationSnapshot } from '../engine/simulation/Simulation';

const MODE_LABELS: Record<CharacterMode, string> = {
  neutral: 'NEUTRO', moving: 'MOVIMENTO', dashing: 'DASH', airborne: 'NO AR',
  crouching: 'AGACHADO', startup: 'PREPARO', active: 'ATIVO', recovery: 'RECUPERAÇÃO',
  blocking: 'DEFESA', hitstun: 'ATORDOADO', blockstun: 'BLOQUEIO', grabbed: 'AGARRADO',
  knockdown: 'CAÍDO',
};

/** HUD provisório, atualizado exclusivamente a partir de um snapshot da simulação. */
export class CombatHud {
  private readonly labels: Phaser.GameObjects.Text[];
  private readonly healthGraphics: Phaser.GameObjects.Graphics;
  private readonly timer: Phaser.GameObjects.Text;
  private readonly roundLabel: Phaser.GameObjects.Text;
  private readonly hitLabel: Phaser.GameObjects.Text;
  private readonly resultLabel: Phaser.GameObjects.Text;
  private readonly modeLabels: Phaser.GameObjects.Text[];
  private lastImpactLabel = '';
  private lastImpactFrame = Number.NEGATIVE_INFINITY;
  private readonly barWidth = 360;
  private readonly barHeight = 22;
  private readonly sidePadding = 28;

  constructor(scene: Phaser.Scene, width: number, fighterNames: readonly [string, string] = ['JOGADOR 1', 'JOGADOR 2']) {
    this.labels = [
      scene.add.text(this.sidePadding, 18, `P1 · ${fighterNames[0].toUpperCase()}`, { color: '#f4f0e8', fontSize: '16px' }),
      scene.add.text(width - this.sidePadding, 18, `P2 · ${fighterNames[1].toUpperCase()}`, { color: '#f4f0e8', fontSize: '16px' }).setOrigin(1, 0),
    ];
    this.healthGraphics = scene.add.graphics();
    this.modeLabels = [
      scene.add.text(this.sidePadding, 67, 'NEUTRO', { color: '#f4f0e8', fontSize: '12px', fontStyle: 'bold' }),
      scene.add.text(width - this.sidePadding, 67, 'NEUTRO', { color: '#f4f0e8', fontSize: '12px', fontStyle: 'bold' }).setOrigin(1, 0),
    ];
    this.timer = scene.add.text(width / 2, 14, '99', {
      color: '#ffd166',
      fontSize: '32px',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.roundLabel = scene.add.text(width / 2, 52, 'ROUND 1', {
      color: '#f4f0e8',
      fontSize: '12px',
    }).setOrigin(0.5, 0);
    this.hitLabel = scene.add.text(width / 2, 92, '', {
      color: '#ffd166',
      fontSize: '14px',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.resultLabel = scene.add.text(width / 2, 114, '', {
      color: '#f4f0e8',
      fontSize: '14px',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.updateBars([], width);
  }

  update(snapshot: SimulationSnapshot, width: number): void {
    this.timer.setText(String(Math.ceil(snapshot.roundFramesRemaining / 60)).padStart(2, '0'));
    this.roundLabel.setText(`ROUND ${snapshot.round}`);
    const winnerIndex = snapshot.characters.findIndex(({ characterId }) => characterId === snapshot.roundWinnerId);
    const matchWinnerIndex = snapshot.characters.findIndex(({ characterId }) => characterId === snapshot.matchWinnerId);
    if (snapshot.phase === 'match-over') {
      this.resultLabel.setText(matchWinnerIndex < 0 ? 'EMPATE · R PARA REINICIAR' : `LUTA · P${matchWinnerIndex + 1} VENCE · R PARA REINICIAR`);
    } else if (snapshot.phase === 'round-over') {
      const outcome = snapshot.roundEndReason === 'knockout' ? 'K.O.' : snapshot.roundEndReason === 'time' ? 'TEMPO' : 'EMPATE';
      this.resultLabel.setText(winnerIndex < 0 ? `ROUND ${outcome}` : `ROUND ${outcome} · P${winnerIndex + 1} VENCE`);
    } else {
      this.resultLabel.setText('');
    }
    const hit = snapshot.hitEvents[0];
    if (snapshot.frame < this.lastImpactFrame) {
      this.lastImpactLabel = '';
      this.lastImpactFrame = Number.NEGATIVE_INFINITY;
    }
    if (hit) {
      const result = hit.outcome === 'block' ? 'BLOCK' : `HIT · -${hit.damage}`;
      this.lastImpactLabel = `${result} · ADV ${hit.frameAdvantage > 0 ? '+' : ''}${hit.frameAdvantage}F`;
      this.lastImpactFrame = snapshot.frame;
    }
    this.hitLabel.setText(snapshot.frame - this.lastImpactFrame <= 90 ? this.lastImpactLabel : '');
    snapshot.characters.forEach((character, index) => {
      this.modeLabels[index]?.setText(MODE_LABELS[character.mode]);
      this.modeLabels[index]?.setColor(character.mode === 'hitstun' ? '#ff7777' : character.mode === 'blockstun' || character.mode === 'blocking' ? '#8cb4ff' : '#f4f0e8');
    });
    this.updateBars(snapshot.characters, width);
  }

  destroy(): void {
    this.labels.forEach((label) => label.destroy());
    this.modeLabels.forEach((label) => label.destroy());
    this.healthGraphics.destroy();
    this.timer.destroy();
    this.roundLabel.destroy();
    this.hitLabel.destroy();
    this.resultLabel.destroy();
  }

  private updateBars(
    characters: SimulationSnapshot['characters'] | [],
    width: number,
  ): void {
    this.healthGraphics.clear();
    const left = this.sidePadding;
    const right = width - this.sidePadding - this.barWidth;
    this.drawBarBackground(left, right);

    characters.forEach((character, index) => {
      const ratio = character.maxHealth > 0 ? character.health / character.maxHealth : 0;
      const fillWidth = this.barWidth * Phaser.Math.Clamp(ratio, 0, 1);
      this.healthGraphics.fillStyle(index === 0 ? 0xe45b5b : 0x5b8de4, 1);
      const x = index === 0 ? left : right + this.barWidth - fillWidth;
      this.healthGraphics.fillRect(x, 42, fillWidth, this.barHeight);
    });
  }

  private drawBarBackground(left: number, right: number): void {
    this.healthGraphics.fillStyle(0x494750, 1);
    this.healthGraphics.fillRect(left, 42, this.barWidth, this.barHeight);
    this.healthGraphics.fillRect(right, 42, this.barWidth, this.barHeight);
    this.healthGraphics.lineStyle(2, 0xf4f0e8, 0.75);
    this.healthGraphics.strokeRect(left, 42, this.barWidth, this.barHeight);
    this.healthGraphics.strokeRect(right, 42, this.barWidth, this.barHeight);
  }
}
