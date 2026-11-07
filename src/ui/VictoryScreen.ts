import type { StageDefinition } from '../rendering/stages/StageDefinition';
import { fighterArt } from './fighterArt';
import { stageImage } from './StageSelectionView';
import { fitFontSize, VICTORY_TITLE, VICTORY_WINNER, winnerLine } from './victoryLayout';
import { t } from '../i18n/i18n';

/**
 * Champion screen over the game canvas: the scenery with nobody in it, darkened, under a 90% black veil; the winner's
 * full-body art in the middle; "CLOSE COMBAT" down the left edge and "WINNER <name>" down the right one. Both strips
 * have the same width and height; the right text shrinks to fit longer names.
 */
export class VictoryScreen {
  private readonly root = document.createElement('section');
  private readonly winnerText = document.createElement('span');
  private readonly resize = (): void => { this.align(); this.fit(); };

  /** `hero` is the champion's full-body art already decoded with the match; without it the art is fetched now. */
  constructor(private readonly canvas: HTMLCanvasElement, stage: StageDefinition, fighterId: string, name: string, hero = document.createElement('img')) {
    const art = fighterArt[fighterId];
    this.root.className = 'victory-screen'; this.root.setAttribute('role', 'img'); this.root.setAttribute('aria-label', t('victory.label', { name }));
    const backdrop = document.createElement('div'); backdrop.className = 'victory-stage'; backdrop.append(stageImage(stage));
    const veil = document.createElement('div'); veil.className = 'victory-veil';
    hero.className = 'victory-hero'; hero.alt = ''; if (!hero.src) hero.src = art.fullbody;
    hero.style.cssText = `--height:${art.victory.height * 100}cqh;--top:${art.victory.top * 100}cqh`;
    const left = this.strip('left', document.createElement('span')); left.firstElementChild!.textContent = VICTORY_TITLE;
    const winner = document.createElement('span'); winner.className = 'victory-winner'; winner.textContent = VICTORY_WINNER;
    this.winnerText.className = 'victory-name'; this.winnerText.textContent = `  ${name.toUpperCase()}`;
    const right = this.strip('right', document.createElement('span')); right.firstElementChild!.replaceChildren(winner, this.winnerText);
    right.firstElementChild!.setAttribute('data-line', winnerLine(name));
    this.root.append(backdrop, veil, hero, left, right);
    document.body.append(this.root);
    this.align(); this.fit();
    window.addEventListener('resize', this.resize);
  }

  private strip(side: 'left' | 'right', text: HTMLElement): HTMLElement {
    const strip = document.createElement('aside'); strip.className = `victory-strip ${side}`; strip.setAttribute('aria-hidden', 'true');
    text.className = 'victory-text'; strip.append(text); return strip;
  }

  /** Covers exactly the game canvas, like the post-match menu. */
  private align(): void {
    const rect = this.canvas.getBoundingClientRect();
    Object.assign(this.root.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
  }

  /** Each strip text takes the largest size that keeps the whole line inside the strip: long names shrink, short ones stop at the strip width. */
  private fit(): void {
    for (const text of this.root.querySelectorAll<HTMLElement>('.victory-text')) {
      const strip = text.parentElement!;
      if (!strip.clientHeight) continue;
      text.style.fontSize = '100px';
      const natural = text.scrollHeight / 100;
      text.style.fontSize = `${fitFontSize(natural, strip.clientHeight * .93, strip.clientWidth * .66)}px`;
    }
  }

  destroy(): void { window.removeEventListener('resize', this.resize); this.root.remove(); }
}
