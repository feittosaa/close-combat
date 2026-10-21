// src/ui/CombatHud.ts
import Phaser from 'phaser';
import type { SimulationSnapshot } from '../engine/simulation/Simulation';
import { contactLabel, MODE_LABELS } from './combatLabels';

/** HUD provisório, atualizado exclusivamente a partir de um snapshot da simulação. */
export class CombatHud {
  private readonly root: Phaser.GameObjects.Container;
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

  constructor(scene: Phaser.Scene, width: number, fighterNames: readonly [string, string] = ['JOGADOR 1', 'JOGADOR 2'], stageName = '', private readonly training = false) {
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
      fontSize: '12px',
      fontStyle: 'bold',
      align: 'center', wordWrap: { width: 540 },
    }).setOrigin(0.5, 0).setVisible(training);
    this.resultLabel = scene.add.text(width / 2, 114, '', {
      color: '#f4f0e8',
      fontSize: '14px',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    const stageLabel = scene.add.text(width / 2, 72, stageName.toUpperCase(), {
      color: '#f4f0e8', fontSize: '11px',
    }).setOrigin(0.5, 0);
    const pauseHint = scene.add.text(width / 2, scene.scale.height - 18, 'P / ESC · PAUSA', { color: '#c8bdca', fontSize: '10px' }).setOrigin(.5).setVisible(!training);
    this.root = scene.add.container(0, 0, [
      ...this.labels, this.healthGraphics, ...this.modeLabels, this.timer,
      this.roundLabel, stageLabel, this.hitLabel, this.resultLabel, pauseHint,
    ]).setScrollFactor(0).setDepth(100);
    this.updateBars([], width);
  }

  update(snapshot: SimulationSnapshot, width: number): void {
    this.timer.setText(this.training ? '∞' : String(Math.ceil(snapshot.roundFramesRemaining / 60)).padStart(2, '0'));
    this.roundLabel.setText(this.training ? 'TREINO LIVRE' : `ROUND ${snapshot.round}`);
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
    this.updateTrainingLabels(snapshot);
    this.updateBars(snapshot.characters, width);
  }

  private updateTrainingLabels(snapshot: SimulationSnapshot): void {
    const latest = snapshot.recentContacts[snapshot.recentContacts.length - 1];
    if (snapshot.frame < this.lastImpactFrame) {
      this.lastImpactLabel = '';
      this.lastImpactFrame = Number.NEGATIVE_INFINITY;
    }
    if (latest && latest.frame > this.lastImpactFrame) {
      this.lastImpactLabel = contactLabel(latest.event);
      this.lastImpactFrame = latest.frame;
    }
    this.hitLabel.setText(snapshot.frame - this.lastImpactFrame <= 90 ? this.lastImpactLabel : '');
    snapshot.characters.forEach((character, index) => {
      const modeLabel = character.attack?.preciseExecution ? 'PRECISO · ' : '';
      const power = character.combatRules ? (character.powerFrames ?? 0) > 0
        ? `FULGOR ${Math.ceil(character.powerFrames! / 60)}s` : character.powerAvailable !== false ? 'FULGOR DISPONÍVEL' : 'FULGOR GASTO' : '';
      const rage = character.combatRules && !character.rageUsed && character.health <= character.maxHealth * .25 ? ' · R PRONTA' : '';
      const charged = character.stance === 'charging' ? ' · CARGA' : '';
      this.modeLabels[index]?.setText(`${this.training ? `${modeLabel}${MODE_LABELS[character.mode]}${power ? ' · ' : ''}` : ''}${power}${rage}${charged}`);
      this.modeLabels[index]?.setColor(character.mode === 'hitstun' ? '#ff7777' : character.mode === 'blockstun' || character.mode === 'blocking' ? '#8cb4ff' : '#f4f0e8');
    });
  }

  destroy(): void {
    this.root.destroy(true);
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
