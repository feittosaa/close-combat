import Phaser from 'phaser';
import { FixedStepClock } from '../engine/simulation/FixedStepClock';
import { CombatantView } from '../rendering/CombatantView';
import { CombatHud } from '../ui/CombatHud';

export class FightScene extends Phaser.Scene {
  private readonly clock = new FixedStepClock();
  private combatants: CombatantView[] = [];
  private hud?: CombatHud;

  constructor() {
    super('FightScene');
  }

  create(): void {
    const { width, height } = this.scale;
    const floorY = height - 88;

    this.add.rectangle(width / 2, floorY + 44, width, 88, 0x24232b);
    this.add.rectangle(width / 2, floorY, width, 4, 0xf4f0e8, 0.7);
    this.combatants = [
      new CombatantView(this, 190, floorY, 0xe45b5b),
      new CombatantView(this, width - 190, floorY, 0x5b8de4),
    ];
    this.hud = new CombatHud(this, width);
    this.add
      .text(width / 2, height - 30, 'Cena provisória — lógica de combate ainda não implementada', {
        color: '#b5b1bd',
        fontSize: '14px',
      })
      .setOrigin(0.5);

    this.input.keyboard?.once('keydown-ESC', () => this.scene.start('MenuScene'));
  }

  update(_time: number, delta: number): void {
    this.clock.advance(delta, () => {
      // A simulação de combate será ligada aqui; renderização não decide resultados de combate.
    });
  }

  shutdown(): void {
    this.clock.reset();
    this.combatants.forEach((combatant) => combatant.destroy());
    this.combatants = [];
    this.hud?.destroy();
    this.hud = undefined;
  }
}
