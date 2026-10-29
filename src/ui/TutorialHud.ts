import { LOGICAL_VIEW } from '../rendering/presentation';
import type Phaser from 'phaser';
import type { TutorialSession } from '../training/TutorialSession';
import { formatCommand } from './commandNotation';
import { getPlayerLayout, getSystemControls, keyLabel } from '../input/controlSettings';

export class TutorialHud {
  private readonly panel: Phaser.GameObjects.Text;
  constructor(scene: Phaser.Scene, private readonly session: TutorialSession, next: () => void) {
    this.panel = scene.add.text(LOGICAL_VIEW.width / 2, 88, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '15px', align: 'center', color: '#ffe5bb',
      backgroundColor: '#151521ee', padding: { x: 20, y: 10 }, wordWrap: { width: 650 },
    }).setOrigin(.5, 0).setScrollFactor(0).setDepth(125).setInteractive({ useHandCursor: true }).on('pointerdown', next);
  }
  setCenter(x: number): void { this.panel.setX(x); }
  update(): void {
    const session = this.session, lesson = session.lesson;
    if (!lesson) { this.panel.setText('TREINO DE COMBOS\nNenhuma receita cadastrada. Aguardando seus combos manuais.\nESC abre o menu'); return; }
    this.panel.setText(`${session.index + 1}/${session.lessons.length} · ${lesson.title}\n${lesson.instruction}\n${lesson.notation} · ${formatCommand(lesson.notation, getPlayerLayout(0))}\n${session.complete ? 'TUTORIAL CONCLUÍDO · ESC abre o menu' : session.passed ? 'CONCLUÍDO · ENTER ou clique para avançar' : `Execute para avançar · ${keyLabel(getSystemControls().reset)} reinicia esta tentativa`}`);
  }
  destroy(): void { this.panel.destroy(); }
}
