import { LOGICAL_VIEW } from '../rendering/presentation';
import type Phaser from 'phaser';
import type { TutorialSession } from '../training/TutorialSession';
import { formatCommand } from './commandNotation';
import { getPlayerLayout, getSystemControls, keyLabel } from '../input/controlSettings';
import { t } from '../i18n/i18n';
import { HUD_FONT } from './hudTheme';

export class TutorialHud {
  private readonly panel: Phaser.GameObjects.Text;
  constructor(scene: Phaser.Scene, private readonly session: TutorialSession, next: () => void) {
    this.panel = scene.add.text(LOGICAL_VIEW.width / 2, 88, '', {
      fontFamily: HUD_FONT, fontSize: '15px', align: 'center', color: '#ffe5bb',
      backgroundColor: '#151521ee', padding: { x: 20, y: 10 }, wordWrap: { width: 650 },
    }).setOrigin(.5, 0).setScrollFactor(0).setDepth(125).setInteractive({ useHandCursor: true }).on('pointerdown', next);
  }
  setCenter(x: number): void { this.panel.setX(x); }
  update(): void {
    const session = this.session, lesson = session.lesson;
    if (!lesson) { this.panel.setText(t('tutorial.empty')); return; }
    this.panel.setText(`${lesson.part} · ${session.index + 1}/${session.lessons.length} · ${lesson.title}\n${lesson.instruction}\n${lesson.notation} · ${formatCommand(lesson.notation, getPlayerLayout(0))}\n${session.complete ? t('tutorial.complete') : session.passed ? t('tutorial.passed') : t('tutorial.attempt', { key: keyLabel(getSystemControls().reset) })}`);
  }
  destroy(): void { this.panel.destroy(); }
}
