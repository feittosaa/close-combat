import type Phaser from 'phaser';
import type { SimulationSnapshot } from '../engine/simulation/Simulation';
import { LOGICAL_VIEW } from './presentation';
import { presentationKey, presentationTheme, type PresentationTheme } from './stages/stagePresentationAssets';

/** Give the result text the entire foreground before starting the match-end poses. */
export const RESULT_TITLE_END_FRAME = 160;

/** Presentation is stage-specific and never changes the combat simulation. */
export class StagePresentation {
  private readonly title: Phaser.GameObjects.Image;
  private readonly dimmer: Phaser.GameObjects.Rectangle;
  private readonly dimmerCamera: Phaser.Cameras.Scene2D.Camera;
  private readonly theme: PresentationTheme;
  private intro = 0;
  private round = 0;

  constructor(private readonly scene: Phaser.Scene, stageId: string, private readonly winsToFinish = 2) {
    this.theme = presentationTheme(stageId);
    this.title = scene.add.image(0, 0, presentationKey(this.theme, 'ready')).setOrigin(.5).setScrollFactor(0).setDepth(130).setVisible(false);
    this.dimmer = scene.add.rectangle(0, 0, 1, 1, 0x000000).setName('stage-presentation-dimmer').setOrigin(0).setScrollFactor(0).setDepth(129).setVisible(false);
    this.dimmerCamera = scene.cameras.add(0, 0, scene.scale.width, scene.scale.height, false, 'presentation-dimmer');
  }

  update(snapshot: SimulationSnapshot, delta: number, width: number): boolean {
    this.dimmerCamera.setViewport(0, 0, this.scene.scale.width, this.scene.scale.height);
    this.dimmerCamera.ignore(this.scene.children.list.filter(object => object !== this.dimmer));
    if (snapshot.round !== this.round) { this.intro = this.round === 0 ? 1400 : 2400; this.round = snapshot.round; }
    const wasIntro = this.intro > 0 && snapshot.phase === 'fight';
    if (wasIntro) this.intro = Math.max(0, this.intro - delta);
    const endAge = snapshot.roundEndedFrame === undefined ? -1 : snapshot.frame - snapshot.roundEndedFrame;
    const timedOut = snapshot.roundEndReason === 'time' || (snapshot.roundEndReason === 'draw' && snapshot.roundFramesRemaining === 0);
    const finalRound = snapshot.roundWins.some(wins => wins >= this.winsToFinish);
    const name = wasIntro ? (this.intro > 1400 ? undefined : this.intro > 500 ? 'ready' : 'fight') : endAge >= 12 && endAge < RESULT_TITLE_END_FRAME ?
      (timedOut && (endAge < 75 || !snapshot.roundWinnerId) ? 'timeout' : snapshot.roundWinnerId ?
        (snapshot.roundWinnerId === snapshot.characters[0].characterId ? (finalRound ? 'victory' : 'round-win') : (finalRound ? 'lose' : 'round-lose')) : undefined) : undefined;
    if (name) {
      this.title.setTexture(presentationKey(this.theme, name)).setPosition(width / 2, LOGICAL_VIEW.height * .38).setVisible(true);
      this.title.setDisplaySize(Math.min(width * .65, 650), Math.min(width * .65, 650) * this.title.height / this.title.width);
      const alpha = wasIntro ? Math.min(1, (1400 - this.intro) / 180, this.intro / 150) : Math.min(1, (endAge - 12) / 8, (RESULT_TITLE_END_FRAME - endAge) / 10);
      this.title.setAlpha(Math.max(0, alpha));
      this.dimmer.setPosition(0, 0).setSize(this.scene.scale.width, this.scene.scale.height).setAlpha(.2 * Math.max(0, alpha)).setVisible(true);
    } else { this.title.setVisible(false); this.dimmer.setVisible(false); }
    return wasIntro;
  }

  reset(): void { this.round = 0; this.intro = 0; }
  destroy(): void { this.scene.cameras?.remove(this.dimmerCamera); this.title.destroy(); this.dimmer.destroy(); }
}
