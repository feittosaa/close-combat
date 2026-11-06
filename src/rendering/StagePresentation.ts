import type Phaser from 'phaser';
import type { SimulationSnapshot } from '../engine/simulation/Simulation';
import { LOGICAL_VIEW } from './presentation';
import { RESULT_TITLE_END_FRAME, TIMEOUT_TITLE_FRAMES } from './roundEnd';
import { presentationKey, presentationTheme, type PresentationTheme } from './stages/stagePresentationAssets';
import { presentationBounds } from './stages/presentationBounds';

/** Give the result text the entire foreground before starting the match-end poses. */

/** Presentation is stage-specific and never changes the combat simulation. */
export class StagePresentation {
  private readonly title: Phaser.GameObjects.Image;
  private readonly dimmer: Phaser.GameObjects.Rectangle;
  private readonly dimmerCamera: Phaser.Cameras.Scene2D.Camera;
  private readonly theme: PresentationTheme;
  private intro = 0;
  private round = 0;
  private knockoutAt?: number;
  private knockoutRemaining = 0;

  constructor(private readonly scene: Phaser.Scene, stageId: string, private readonly winsToFinish = 2) {
    this.theme = presentationTheme(stageId);
    this.title = scene.add.image(0, 0, presentationKey(this.theme, 'ready')).setOrigin(.5).setScrollFactor(0).setDepth(130).setVisible(false);
    this.dimmer = scene.add.rectangle(0, 0, 1, 1, 0x000000).setName('stage-presentation-dimmer').setOrigin(0).setScrollFactor(0).setDepth(129).setVisible(false);
    this.dimmerCamera = scene.cameras.add(0, 0, scene.scale.width, scene.scale.height, false, 'presentation-dimmer');
  }

  update(snapshot: SimulationSnapshot, delta: number, width: number): boolean {
    this.dimmerCamera.setViewport(0, 0, this.scene.scale.width, this.scene.scale.height);
    if (snapshot.round !== this.round) { this.intro = 1600; this.round = snapshot.round; this.knockoutAt = undefined; this.knockoutRemaining = 0; }
    if (snapshot.knockoutStartedAt !== undefined && snapshot.knockoutStartedAt !== this.knockoutAt) {
      this.knockoutAt = snapshot.knockoutStartedAt; this.knockoutRemaining = 2000;
    }
    const showingKnockout = this.knockoutRemaining > 0;
    if (showingKnockout) this.knockoutRemaining = Math.max(0, this.knockoutRemaining - delta);
    const wasIntro = this.intro > 0 && snapshot.phase === 'fight';
    if (wasIntro) this.intro = Math.max(0, this.intro - delta);
    const endAge = snapshot.roundEndedFrame === undefined ? -1 : snapshot.frame - snapshot.roundEndedFrame;
    const timedOut = snapshot.roundEndReason === 'time' || (snapshot.roundEndReason === 'draw' && snapshot.roundFramesRemaining === 0);
    const finalRound = snapshot.roundWins.some(wins => wins >= this.winsToFinish);
    const name = showingKnockout ? 'ko' : wasIntro ? (this.intro > 600 ? 'ready' : 'fight') : endAge >= 0 && endAge < RESULT_TITLE_END_FRAME ?
      (timedOut && (endAge < TIMEOUT_TITLE_FRAMES || !snapshot.roundWinnerId) ? 'timeout' : snapshot.roundWinnerId ?
        (snapshot.roundWinnerId === snapshot.characters[0].characterId ? (finalRound ? 'victory' : 'round-win') : (finalRound ? 'lose' : 'round-lose')) : undefined) : undefined;
    if (name) {
      this.title.setTexture(presentationKey(this.theme, name));
      const [left, top, right, bottom] = presentationBounds[`${this.theme}:${name}`];
      const height = LOGICAL_VIEW.height * .25 / (bottom - top);
      this.title.setOrigin((left + right) / 2, (top + bottom) / 2).setPosition(width / 2, LOGICAL_VIEW.height / 2).setVisible(true);
      this.title.setDisplaySize(height * this.title.width / this.title.height, height);
      const alpha = showingKnockout ? 1 : wasIntro ? Math.min(1, (1600 - this.intro) / 180, this.intro / 150) : Math.min(1, endAge / 8, (RESULT_TITLE_END_FRAME - endAge) / 10);
      this.title.setAlpha(Math.max(0, alpha));
      this.dimmer.setPosition(0, 0).setSize(this.scene.scale.width, this.scene.scale.height).setAlpha(.2 * Math.max(0, alpha)).setVisible(true);
    } else { this.title.setVisible(false); this.dimmer.setVisible(false); }
    return wasIntro && this.intro > 600;
  }

  syncCamera(): void {
    this.dimmerCamera.ignore(this.scene.children.list.filter(object => object !== this.dimmer));
  }

  reset(): void { this.round = 0; this.intro = 0; this.knockoutAt = undefined; this.knockoutRemaining = 0; }
  destroy(): void { this.scene.cameras?.remove(this.dimmerCamera); this.title.destroy(); this.dimmer.destroy(); }
}
