import Phaser from 'phaser';
import type { TutorialLesson, TutorialSession } from '../training/TutorialSession';
import { formatCommand } from './commandNotation';
import { getPlayerLayout, getSystemControls, getTrainingControls, keyLabel } from '../input/controlSettings';
import { t } from '../i18n/i18n';
import { HUD, drawHudPanel, hudText, setTextBackground, setTextColor } from './hudTheme';

/** Same column as the free-training input panel (left edge, under the health bar), clear of the fighters. */
const LEFT = 18, TOP = 104, WIDTH = 180, PAD = 10, CHIP_HEIGHT = 19, CHIP_GAP = 4, TAB_HEIGHT = 19;
const COLORS = { active: 0xe23a1c, done: 0x3f9a5c, next: 0xffd36b, pending: 0x2a221c, demo: 0x5aa9e6 } as const;

/**
 * Vertical card on the left: the three sections in order, the chosen lesson, its steps lit as they connect,
 * and what to do next. A click on the panel opens the next lesson.
 */
export class TutorialHud {
  private readonly root: Phaser.GameObjects.Container;
  private readonly frame: Phaser.GameObjects.Graphics;
  private readonly chipsGraphics: Phaser.GameObjects.Graphics;
  private readonly tabs: Phaser.GameObjects.Text[];
  private readonly title: Phaser.GameObjects.Text;
  private readonly info: Phaser.GameObjects.Text;
  private readonly status: Phaser.GameObjects.Text;
  private readonly hints: Phaser.GameObjects.Text;
  private chips: { text: Phaser.GameObjects.Text; x: number; y: number; width: number }[] = [];
  private chipsLesson?: TutorialLesson;
  private chipsBottom = 0;
  /** Clickable card, resized with its content; the container keeps no size so the area starts at its top edge. */
  private readonly hitArea = new Phaser.Geom.Rectangle(-WIDTH / 2, 0, WIDTH, 0);

  constructor(private readonly scene: Phaser.Scene, private readonly session: TutorialSession, next: () => void) {
    this.frame = scene.add.graphics();
    this.chipsGraphics = scene.add.graphics();
    this.tabs = session.sections.map((_, index) => scene.add.text(0, PAD + index * TAB_HEIGHT, '', { ...hudText(11, true), padding: { x: 6, y: 2 },
      fixedWidth: WIDTH - PAD * 2, align: 'left' }).setOrigin(.5, 0));
    this.title = scene.add.text(0, 0, '', { ...hudText(13, true), align: 'center', wordWrap: { width: WIDTH - PAD * 2 } }).setOrigin(.5, 0);
    this.info = scene.add.text(0, 0, '', { ...hudText(11, false, HUD.muted), align: 'center', wordWrap: { width: WIDTH - PAD * 2 } }).setOrigin(.5, 0);
    this.status = scene.add.text(0, 0, '', { ...hudText(13, true), align: 'center', wordWrap: { width: WIDTH - PAD * 2 } }).setOrigin(.5, 0);
    this.hints = scene.add.text(0, 0, '', { ...hudText(10, false, HUD.muted), align: 'center', wordWrap: { width: WIDTH - PAD * 2 } }).setOrigin(.5, 0);
    this.root = scene.add.container(LEFT + WIDTH / 2, TOP, [this.frame, this.chipsGraphics, ...this.tabs, this.title, this.info, this.status, this.hints])
      .setScrollFactor(0).setDepth(125).on('pointerdown', next);
    this.root.setInteractive({ hitArea: this.hitArea, hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
  }

  update(browsing: boolean): void {
    const session = this.session, lesson = session.lesson;
    this.layoutTabs();
    let y = PAD + this.tabs.length * TAB_HEIGHT + 6;
    this.title.setY(y).setText(lesson
      ? `${session.lessonIndex + 1}/${session.section.lessons.length} · ${lesson.title}${session.isCompleted(session.section, lesson) ? '  ✓' : ''}`
      : t('tutorial.empty'));
    y += this.title.height + 5;
    if (lesson) {
      if (lesson !== this.chipsLesson) this.buildChips(lesson, y);
      this.paintSteps(lesson, y);
      y = this.chipsBottom + 5;
    } else this.clearChips();
    // Hits and damage say enough for attacks; only lessons without them (walk, jump, crouch, guard) keep their instruction.
    const measured = lesson && session.stats(lesson);
    const stats = !measured ? lesson?.instruction ?? '' : measured.hits > 1 ? t('tutorial.stats', measured) : t('tutorial.damage', measured);
    this.info.setY(y).setText(stats);
    y += this.info.height + 3;
    const [status, color] = this.statusLine();
    setTextColor(this.status.setY(y).setText(status), color);
    y += this.status.height + 1;
    this.hints.setY(y).setText(browsing ? t('tutorial.padBrowse') : this.controls());
    y += this.hints.height + PAD - 2;
    this.frame.clear();
    drawHudPanel(this.frame, -WIDTH / 2, 0, WIDTH, y, COLORS.active);
    this.hitArea.height = y;
  }

  /** Numbered sections in order; the open one is filled, finished ones carry a check. */
  private layoutTabs(): void {
    const session = this.session;
    const labels = session.sections.map((section, index) => {
      const done = section.lessons.filter(lesson => session.isCompleted(section, lesson)).length;
      const finished = section.lessons.length > 0 && done === section.lessons.length;
      return `${index + 1}. ${section.title} ${finished ? '✓' : `${done}/${section.lessons.length}`}`;
    });
    this.tabs.forEach((tab, index) => {
      const active = index === session.sectionIndex;
      setTextBackground(setTextColor(tab.setText(labels[index]), active ? HUD.ivory : HUD.muted), active ? '#e23a1c' : '#00000000');
    });
  }

  /** One chip per step, wrapped over as many rows as needed; movement lessons get a single bar instead. */
  private buildChips(lesson: TutorialLesson, top: number): void {
    this.clearChips();
    this.chipsLesson = lesson;
    const labels = lesson.steps ?? [lesson.notation];
    const layout = getPlayerLayout(0), maxWidth = WIDTH - PAD * 2;
    const rows: (typeof this.chips)[] = [[]];
    let rowWidth = 0;
    for (const label of labels) {
      // One chip is one move: its motion reads as a single gesture, without the separating commas.
      const text = this.scene.add.text(0, 0, formatCommand(label, layout).replace(/,/g, ''), hudText(12, true)).setOrigin(.5);
      const width = Math.min(maxWidth, Math.max(24, text.width + 10));
      if (rowWidth && rowWidth + CHIP_GAP + width > maxWidth) { rows.push([]); rowWidth = 0; }
      rows[rows.length - 1].push({ text, x: 0, y: 0, width });
      rowWidth += (rowWidth ? CHIP_GAP : 0) + width;
    }
    rows.forEach((row, index) => {
      const total = row.reduce((sum, chip) => sum + chip.width, 0) + CHIP_GAP * (row.length - 1);
      let x = -total / 2;
      for (const chip of row) {
        chip.x = x; chip.y = top + index * (CHIP_HEIGHT + CHIP_GAP);
        chip.text.setPosition(x + chip.width / 2, chip.y + CHIP_HEIGHT / 2);
        x += chip.width + CHIP_GAP;
      }
    });
    this.chips = rows.flat();
    this.root.add(this.chips.map(chip => chip.text));
    this.chipsBottom = top + rows.length * (CHIP_HEIGHT + CHIP_GAP) - CHIP_GAP;
  }
  private clearChips(): void {
    this.chips.forEach(chip => chip.text.destroy());
    this.chips = []; this.chipsLesson = undefined; this.chipsGraphics.clear();
  }

  /** Connected steps turn green and the next one is outlined; a hold lesson fills its chip instead. */
  private paintSteps(lesson: TutorialLesson, top: number): void {
    const session = this.session, g = this.chipsGraphics.clear();
    const connected = session.connectedSteps, demo = session.demonstrating;
    this.chips.forEach((chip, index) => {
      const done = lesson.moves ? index < connected : session.passed;
      g.fillStyle(done ? COLORS.done : COLORS.pending, done ? .95 : .9).fillRoundedRect(chip.x, chip.y, chip.width, CHIP_HEIGHT, 5);
      if (!lesson.moves && !session.passed && session.holdProgress > 0) {
        g.fillStyle(COLORS.done, .8).fillRoundedRect(chip.x, chip.y, chip.width * session.holdProgress, CHIP_HEIGHT, 5);
      }
      const next = lesson.moves ? index === connected && !session.passed : !session.passed;
      g.lineStyle(next ? 2 : 1, demo ? COLORS.demo : next ? COLORS.next : HUD.gold, next || demo ? 1 : .35)
        .strokeRoundedRect(chip.x, chip.y, chip.width, CHIP_HEIGHT, 5);
    });
    if (!this.chips.length) this.chipsBottom = top;
  }

  /** What is happening now and, once done or at the end of a section, where the next lesson leads. */
  private statusLine(): [string, string] {
    const session = this.session, upcoming = session.upcoming;
    const nextKey = keyLabel(getTrainingControls().tutorialNext);
    const nextSection = upcoming && upcoming.section !== session.section;
    const destination = upcoming ? (nextSection ? upcoming.section.title : upcoming.lesson.title) : '';
    if (session.demonstrating) return [t('tutorial.demo'), '#9fd0ff'];
    if (session.passed) return [t('tutorial.passedNext', { key: nextKey, destination }), '#8fe0a4'];
    if (nextSection) return [t('tutorial.sectionEnd', { key: nextKey, destination }), '#ffd36b'];
    if (session.lesson?.moves && session.connectedSteps > 0) {
      return [t('tutorial.progress', { done: session.connectedSteps, total: session.lesson.moves.length }), HUD.ivory];
    }
    return [t('tutorial.upNext', { key: nextKey, destination }), HUD.muted];
  }
  private controls(): string {
    const keys = getTrainingControls();
    return t('tutorial.controls', { section: keyLabel(keys.tutorialSection), previous: keyLabel(keys.tutorialPrevious), next: keyLabel(keys.tutorialNext),
      demo: keyLabel(keys.tutorialDemo), reset: keyLabel(getSystemControls().reset) });
  }
  destroy(): void { this.clearChips(); this.root.destroy(); }
}
