import type { StageDefinition } from '../rendering/stages/StageDefinition';
import { fighterArt } from './fighterArt';
import { stageImage } from './StageSelectionView';
import { VICTORY_TITLE, VICTORY_WINNER, winnerWords } from './victoryLayout';
import { t } from '../i18n/i18n';

/**
 * Champion screen over the game canvas: the scenery with nobody in it, darkened, under a 90% black veil; the winner's
 * full-body art in the middle; "CLOSE COMBAT" looping down the left edge and "WINNER [PLAYER n] <name>" looping up the
 * right one, in large flat arcade capitals.
 */
export class VictoryScreen {
  private readonly root = document.createElement('section');
  private readonly resize = (): void => this.align();

  /**
   * `hero` is the champion's full-body art already decoded with the match; without it the art is fetched now.
   * `player` names the winning side in a PvP match.
   */
  constructor(private readonly canvas: HTMLCanvasElement, stage: StageDefinition, fighterId: string, name: string, hero = document.createElement('img'), player?: 1 | 2) {
    const art = fighterArt[fighterId];
    this.root.className = 'victory-screen'; this.root.setAttribute('role', 'img'); this.root.setAttribute('aria-label', t('victory.label', { name }));
    const backdrop = document.createElement('div'); backdrop.className = 'victory-stage'; backdrop.append(stageImage(stage));
    const veil = document.createElement('div'); veil.className = 'victory-veil';
    hero.className = 'victory-hero'; hero.alt = ''; if (!hero.src) hero.src = art.fullbody;
    hero.style.cssText = `--height:${art.victory.height * 100}cqh;--top:${art.victory.top * 100}cqh`;
    this.root.append(backdrop, veil, hero, this.strip('left', [...VICTORY_TITLE]), this.strip('right', winnerWords(name, player)));
    document.body.append(this.root);
    this.align();
    window.addEventListener('resize', this.resize);
  }

  /** Two copies of the words one after the other: sliding the pair by one copy loops without a seam. */
  private strip(side: 'left' | 'right', words: string[]): HTMLElement {
    const strip = document.createElement('aside'); strip.className = `victory-strip ${side}`; strip.setAttribute('aria-hidden', 'true');
    const track = document.createElement('div'); track.className = 'victory-track';
    track.style.setProperty('--letters', String(words.join('').length + words.length));
    for (let copy = 0; copy < 2; copy += 1) {
      const text = document.createElement('span'); text.className = 'victory-text';
      text.append(...words.map(word => {
        // One block per letter: stacked by line height, they sit as close as the capitals allow.
        const span = document.createElement('span');
        span.append(...[...word].map(letter => Object.assign(document.createElement('span'), { textContent: letter === ' ' ? '\u00a0' : letter })));
        if (word === VICTORY_WINNER) span.className = 'victory-winner';
        return span;
      }));
      track.append(text);
    }
    strip.append(track); return strip;
  }

  /** Covers exactly the game canvas, like the post-match menu. */
  private align(): void {
    const rect = this.canvas.getBoundingClientRect();
    Object.assign(this.root.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
  }

  destroy(): void { window.removeEventListener('resize', this.resize); this.root.remove(); }
}
