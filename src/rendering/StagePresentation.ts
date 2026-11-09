import type Phaser from 'phaser';
import type { SimulationSnapshot } from '../engine/simulation/Simulation';
import { LOGICAL_VIEW } from './presentation';
import { RESULT_TITLE_END_FRAME, TIMEOUT_TITLE_FRAMES } from './roundEnd';
import { presentationKey, presentationTheme, type PresentationTheme } from './stages/stagePresentationAssets';
import { presentationBounds } from './stages/presentationBounds';

/**
 * READY blocks every input, the FIGHT title lets fighters move, and attacks wait 8 more frames after it disappears.
 * The first round holds READY longer, so the match settles in as the loading screen fades out over it.
 */
const READY_MS = 1000, FIRST_READY_MS = 2000, FIGHT_MS = 600, ATTACK_GRACE_MS = 8 * 1000 / 60;
const introMs = (round: number) => (round === 1 ? FIRST_READY_MS : READY_MS) + FIGHT_MS + ATTACK_GRACE_MS;

/** Presentation is stage-specific and never changes the combat simulation. */
export class StagePresentation {
  private readonly title: Phaser.GameObjects.Image;
  private readonly dimmer: Phaser.GameObjects.Rectangle;
  private readonly dimmerCamera: Phaser.Cameras.Scene2D.Camera;
  private readonly theme: PresentationTheme;
  private intro = 0;
  private introTotal = 0;
  private round = 0;
  private knockoutAt?: number;
  private knockoutRemaining = 0;
  private resultFrame?: number;
  private moveOnlyNow = false;

  /** `intro` false skips READY/FIGHT (practice modes): fighters act from the first frame. */
  constructor(private readonly scene: Phaser.Scene, stageId: string, private readonly winsToFinish = 2, private readonly withIntro = true) {
    this.theme = presentationTheme(stageId);
    this.title = scene.add.image(0, 0, presentationKey(this.theme, 'ready')).setOrigin(.5).setScrollFactor(0).setDepth(130).setVisible(false);
    this.dimmer = scene.add.rectangle(0, 0, 1, 1, 0x000000).setName('stage-presentation-dimmer').setOrigin(0).setScrollFactor(0).setDepth(129).setVisible(false);
    this.dimmerCamera = scene.cameras.add(0, 0, scene.scale.width, scene.scale.height, false, 'presentation-dimmer');
  }

  update(snapshot: SimulationSnapshot, delta: number, width: number): boolean {
    this.dimmerCamera.setViewport(0, 0, this.scene.scale.width, this.scene.scale.height);
    if (snapshot.round !== this.round) { this.intro = this.introTotal = this.withIntro ? introMs(snapshot.round) : 0; this.round = snapshot.round; this.knockoutAt = undefined; this.knockoutRemaining = 0; this.resultFrame = undefined; }
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
    const name = showingKnockout ? 'ko' : wasIntro ? (this.intro > FIGHT_MS + ATTACK_GRACE_MS ? 'ready' : this.intro > ATTACK_GRACE_MS ? 'fight' : undefined) : endAge >= 0 && endAge < RESULT_TITLE_END_FRAME ?
      (timedOut && (endAge < TIMEOUT_TITLE_FRAMES || !snapshot.roundWinnerId) ? 'timeout' : snapshot.roundWinnerId ?
        (snapshot.roundWinnerId === snapshot.characters[0].characterId ? (finalRound ? 'victory' : 'round-win') : (finalRound ? 'lose' : 'round-lose')) : undefined) : undefined;
    // The fighters' victory/defeat poses start only once the round-win/victory title has left the screen.
    if (this.resultFrame === undefined && snapshot.roundWinnerId && endAge >= RESULT_TITLE_END_FRAME) this.resultFrame = snapshot.frame;
    if (name) {
      this.title.setTexture(presentationKey(this.theme, name));
      const [left, top, right, bottom] = presentationBounds[`${this.theme}:${name}`];
      const height = LOGICAL_VIEW.height * .25 / (bottom - top);
      this.title.setOrigin((left + right) / 2, (top + bottom) / 2).setPosition(width / 2, LOGICAL_VIEW.height / 2).setVisible(true);
      this.title.setDisplaySize(height * this.title.width / this.title.height, height);
      const alpha = showingKnockout ? 1 : wasIntro ? Math.min(1, (this.introTotal - this.intro) / 180, (this.intro - ATTACK_GRACE_MS) / 150) : Math.min(1, endAge / 8, (RESULT_TITLE_END_FRAME - endAge) / 10);
      this.title.setAlpha(Math.max(0, alpha));
      this.dimmer.setPosition(0, 0).setSize(this.scene.scale.width, this.scene.scale.height).setAlpha(.2 * Math.max(0, alpha)).setVisible(true);
    } else { this.title.setVisible(false); this.dimmer.setVisible(false); }
    this.moveOnlyNow = wasIntro && this.intro > 0 && this.intro <= FIGHT_MS + ATTACK_GRACE_MS;
    return wasIntro && this.intro > FIGHT_MS + ATTACK_GRACE_MS;
  }
  /** True from the end of READY until 8 frames after FIGHT disappears: fighters may move, but attacks are not read and the clock waits. */
  get moveOnly(): boolean { return this.moveOnlyNow; }

  syncCamera(): void {
    this.dimmerCamera.ignore(this.scene.children.list.filter(object => object !== this.dimmer));
  }

  /** Frames since the victory/defeat title disappeared this round, which is when the result poses begin. */
  resultElapsed(frame: number): number | undefined { return this.resultFrame === undefined ? undefined : frame - this.resultFrame; }
  reset(): void { this.round = 0; this.intro = 0; this.moveOnlyNow = false; this.knockoutAt = undefined; this.knockoutRemaining = 0; this.resultFrame = undefined; }
  destroy(): void { this.scene.cameras?.remove(this.dimmerCamera); this.title.destroy(); this.dimmer.destroy(); }
}
