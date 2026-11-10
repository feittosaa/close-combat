import { LOGICAL_VIEW, configureUiCamera, getRightAlignedCover } from '../rendering/presentation';
import { t } from '../i18n/i18n';

import { FighterSelection } from '../ui/FighterSelection';
import { renderFighterSelection } from '../ui/FighterSelectionView';
import { releaseSelectionArt } from '../ui/fighterArt';
import { gamepads, type PadPress } from '../input/GamepadHub';
import { renderStageDraw, renderStageSelection } from '../ui/StageSelectionView';
import { StagePicker } from '../ui/StagePicker';
import '../ui/menu.css';
import { loadDeveloperPanel } from '../devMode';

import { ControlSettings } from '../ui/ControlSettings';
import Phaser from 'phaser';
import { getCharacterById, playableCharacters } from '../engine/data/characters';
import { drawVersusStage, groupsFor, STAGE_GROUPS } from '../rendering/stages/stageGroups';
import { ARCADE_DIFFICULTIES, type ArcadeDifficulty } from '../engine/combat/ArcadeController';
import { createArcadeRun, opponentFor, isTrainingMode, selectsOpponent, type MatchMode } from './matchSetup';
import { createWallpaperShuffle } from '../ui/wallpaperShuffle';

/** The developer entry, below the settings, exists only on the development server (see `src/dev`). */
const DEVELOPER_ENTRY = import.meta.env.MODE === 'development'
  ? { title: 'DESENVOLVEDOR', tag: 'FERRAMENTAS INTERNAS', hint: 'Finais, sprites, tempos de golpes, combos, cores e imagens.' } : undefined;
const MODES = ['arcade', 'versus', 'training', 'tutorial', 'settings', ...(DEVELOPER_ENTRY ? ['developer'] as const : [])] as const;
const modeEntry = (id: typeof MODES[number]) => id === 'developer' ? DEVELOPER_ENTRY!
  : { title: t(`mode.${id}.title`), tag: t(`mode.${id}.tag`), hint: t(`mode.${id}.hint`) };
const difficultyEntry = (id: ArcadeDifficulty) => ({ title: t(`difficulty.${id}.title`), tag: t(`difficulty.${id}.tag`), hint: t(`difficulty.${id}.hint`) });

/** Fluxo público: modo → escolhas dos jogadores → cenário → luta. */
export class MenuScene extends Phaser.Scene {
  private page: 'home' | 'difficulty' | 'fighter' | 'stage' = 'home';
  private difficultyIndex = 1;
  private get entries(): readonly { title: string; tag: string; hint: string }[] {
    return this.page === 'difficulty' ? ARCADE_DIFFICULTIES.map(entry => difficultyEntry(entry.id)) : MODES.map(modeEntry);
  }
  private get cursor(): number { return this.page === 'difficulty' ? this.difficultyIndex : this.modeIndex; }
  private mode: MatchMode = 'arcade';
  private arcadeRun = createArcadeRun();
  private modeIndex = 0;
  private picker?: StagePicker;
  /** A rematch lets only the previous winner choose the stage. */
  private stageWinner?: 0 | 1;
  private chosenStageId?: string;
  private drawing = false;
  private readonly selection = new FighterSelection(playableCharacters.length);
  private get fighterIndex(): number { return this.selection.indices[0]; }
  private set fighterIndex(index: number) { this.selection.select(0, index); }
  private background?: Phaser.GameObjects.Image;
  private wallpapersShown = 0;
  private readonly nextWallpaperIndex = createWallpaperShuffle(3);
  private readonly wallpapers = ['menu-solar', 'menu-bob', 'menu-grappler'];
  private readonly wallpaperMotion = { progress: 0 };
  private menuElement?: HTMLElement;
  private resizeObserver?: ResizeObserver;
  private motionPreference?: MediaQueryList;
  private readonly alignMenu = (): void => {
    const rect = this.game.canvas.getBoundingClientRect();
    Object.assign(this.menuElement!.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
    if (rect.width && rect.height && this.background) {
      const frame = getRightAlignedCover(rect, this.background.frame);
      const moving = this.page === 'home' && !this.motionPreference?.matches;
      const scale = frame.scale * (moving ? 1.03 : 1);
      const travel = Math.max(0, this.background.frame.width * scale - frame.x);
      const progress = this.wallpapersShown % 2 === 0 ? 1 - this.wallpaperMotion.progress : this.wallpaperMotion.progress;
      this.background.setPosition(frame.x + (moving ? travel * progress : 0), frame.y).setScale(scale);
      configureUiCamera(this.cameras.main, rect);
    }
  };
  private transitioning = false;
  private readonly handleKey = (event: KeyboardEvent): void => {
    if (ControlSettings.active || event.repeat || this.transitioning) return;
    const key = event.key;
    if (key === 'Enter' && event.target instanceof HTMLButtonElement &&
      !((this.page === 'home' || this.page === 'difficulty') && event.target.classList.contains('arena-mode'))) return;
    if (['Enter', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) event.preventDefault();
    if (this.page === 'home' || this.page === 'difficulty') {
      if (key === 'ArrowDown' || key === 'ArrowUp') {
        this.selectHomeMode((this.cursor + (key === 'ArrowDown' ? 1 : -1) + this.entries.length) % this.entries.length);
        if (event.target instanceof HTMLButtonElement && event.target.classList.contains('arena-mode'))
          this.menuElement?.querySelectorAll<HTMLButtonElement>('.arena-mode')[this.cursor]?.focus();
      }
      else if (key === 'Enter') this.page === 'difficulty' ? this.chooseDifficulty(this.difficultyIndex) : this.chooseMode(this.modeIndex);
      else if (key === 'Escape' && this.page === 'difficulty') this.back();
      else if (this.page === 'home') { const i = ['a', 'v', 't', 'b', 'o', 'c'].indexOf(key.toLowerCase()); if (i >= 0) this.chooseMode(i); }
    } else if (key === 'Escape') this.back();
    else if (this.page === 'fighter') {
      const versus = this.mode === 'versus';
      const p1Direction = key.toLowerCase() === 'a' ? -1 : key.toLowerCase() === 'd' ? 1 : 0;
      const arrowDirection = ['ArrowLeft', 'ArrowUp'].includes(key) ? -1 : ['ArrowRight', 'ArrowDown'].includes(key) ? 1 : 0;
      if (versus && p1Direction) {
        this.selection.move(0, p1Direction as -1 | 1); this.render();
      } else if (arrowDirection) {
        const player = versus ? 1 : this.selection.activePlayer;
        this.selection.move(player, arrowDirection as -1 | 1); this.render();
      } else if (versus && key.toLowerCase() === 'j') this.confirmFighter(0);
      else if (versus && event.code === 'Numpad1') this.confirmFighter(1);
      else if (key === 'Enter') this.confirmFighter();
    } else if (this.page === 'stage') {
      this.handleStageKey(event);
    }
  };

  /**
   * Controller in the menus: the d-pad or stick moves, A/✕ or Start confirms and B/○ goes back. In PvP each
   * controller drives its own player's cursor; elsewhere any controller drives the player choosing.
   */
  private readonly handlePad = (press: PadPress): void => {
    if (this.transitioning || !press.action || press.action === 'select') return;
    const action = press.action === 'start' ? 'confirm' : press.action;
    const step = action === 'left' || action === 'up' ? -1 : action === 'right' || action === 'down' ? 1 : 0;
    if (action === 'back') { if (this.page !== 'home') this.back(); return; }
    if (this.page === 'home' || this.page === 'difficulty') {
      if (action === 'up' || action === 'down') this.selectHomeMode((this.cursor + step + this.entries.length) % this.entries.length);
      else if (action === 'confirm') this.page === 'difficulty' ? this.chooseDifficulty(this.difficultyIndex) : this.chooseMode(this.modeIndex);
    } else if (this.page === 'fighter') {
      const player = this.mode === 'versus' ? press.player : this.selection.activePlayer;
      if (step) { this.selection.move(player, step); this.render(); } else this.confirmFighter(player);
    } else if (this.page === 'stage' && !this.drawing) {
      const picker = this.stagePicker, player = picker.active.length === 1 ? picker.active[0] : press.player;
      if (!picker.active.includes(player)) return;
      if (!step) { this.confirmStage(player); return; }
      if (picker.plateFor === player) picker.moveVariant(player, step); else picker.move(player, step);
      this.render();
    }
  };

  private get fighters() {
    return playableCharacters;
  }

  constructor() { super('MenuScene'); }
  init(data: { fighterId?: string; selectVersus?: boolean; stageChooser?: 0 | 1 } = {}): void {
    this.page = data.selectVersus ? 'fighter' : 'home'; this.mode = data.selectVersus ? 'versus' : 'arcade'; this.transitioning = false; this.selection.reopen();
    this.wallpapersShown = 0;
    this.picker = undefined; this.drawing = false; this.chosenStageId = undefined; this.stageWinner = data.stageChooser;
    const index = this.fighters.findIndex(f => f.id === data.fighterId);
    if (index >= 0) this.fighterIndex = index;
  }
  create(): void {
    configureUiCamera(this.cameras.main, this.scale);
    const { width, height } = LOGICAL_VIEW;
    for (const key of this.wallpapers) this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    const background = this.add.image(width, height / 2, this.wallpapers[this.nextWallpaperIndex()]).setOrigin(1, .5);
    this.background = background;
    const startWallpaperMotion = () => {
      this.tweens.killTweensOf(this.wallpaperMotion);
      this.wallpaperMotion.progress = 0;
      if (!this.motionPreference?.matches) this.tweens.add({ targets: this.wallpaperMotion, progress: 1, duration: 20000, ease: 'Linear', onUpdate: () => {
        if (this.page === 'home' && this.menuElement) this.alignMenu();
      }});
    };
    this.time.addEvent({ delay: 20000, loop: true, callback: () => {
      if (this.page !== 'home') return;
      const switchWallpaper = () => {
        if (this.page !== 'home' || !this.background) return;
        this.wallpapersShown++;
        this.background.setTexture(this.wallpapers[this.nextWallpaperIndex()]);
        startWallpaperMotion();
        this.alignMenu();
      };
      if (this.motionPreference?.matches) { switchWallpaper(); return; }
      this.tweens.add({ targets: background, alpha: 0, duration: 1000, onComplete: () => {
        switchWallpaper();
        this.tweens.add({ targets: background, alpha: 1, duration: 1000 });
      }});
    }});
    this.motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    startWallpaperMotion();
    const reducedMotion = this.motionPreference.matches;
    if (!reducedMotion) {
      for (let i = 0; i < 9; i++) {
        const mote = this.add.circle(620 + (i * 47) % 370, 155 + (i * 61) % 350, i % 3 === 0 ? 1.6 : 1, 0xffdc95, .35);
        this.tweens.add({ targets: mote, y: mote.y - 32, x: mote.x + 10, alpha: .05,
          duration: 6500 + i * 470, delay: i * 480, ease: 'Sine.inOut', yoyo: true, repeat: -1 });
      }
    }
    this.menuElement = document.createElement('section');
    this.menuElement.className = 'arena-menu';
    this.menuElement.setAttribute('aria-label', t('menu.label'));
    document.body.append(this.menuElement);
    // The menu art is shown through the same aged-film tint as the interface; the images themselves stay untouched.
    this.game.canvas.classList.add('menu-film');
    this.resizeObserver = new ResizeObserver(this.alignMenu);
    this.resizeObserver.observe(this.game.canvas);
    window.addEventListener('resize', this.alignMenu);
    this.alignMenu();
    this.render();
    window.addEventListener('keydown', this.handleKey);
    const releasePad = gamepads.subscribe(this.handlePad);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('keydown', this.handleKey);
      releasePad();
      this.resizeObserver?.disconnect();
      window.removeEventListener('resize', this.alignMenu);
      this.menuElement?.remove(); this.menuElement = undefined;
      this.game.canvas.classList.remove('menu-film');
      releaseSelectionArt();
    });
  }
  private render(): void {
    if (!this.menuElement) return;
    if (this.background) { this.tweens.killTweensOf(this.background); this.background.setAlpha(1); }
    this.alignMenu();
    this.menuElement.replaceChildren();
    // The character select holds its decoded art (see `renderFighterSelection`); every other page lets it go.
    if (this.page !== 'fighter') releaseSelectionArt();
    this.renderMenu();
  }
  private renderMenu(): void {
    const root = this.menuElement!;
    root.classList.toggle('fighter-selection', this.page === 'fighter');
    root.classList.toggle('stage-selection', this.page === 'stage');
    root.classList.toggle('arcade-selection', this.page === 'fighter' && this.mode === 'arcade');
    root.classList.toggle('arena-home', this.page === 'home' || this.page === 'difficulty');
    const node = (tag: string, className: string, text = ''): HTMLElement => {
      const element = document.createElement(tag); element.className = className; element.textContent = text; return element;
    };
    const button = (label: string, className: string, action: () => void): HTMLButtonElement => {
      const element = document.createElement('button'); element.className = className; element.textContent = label;
      element.onclick = action; return element;
    };
    const header = node('header', 'arena-header');
    if (this.page === 'home' || this.page === 'difficulty') header.append(node('span', 'arena-brand', 'Close Combat'));
    else header.append(node('h1', 'arena-step', t(this.page === 'stage' ? 'menu.stageStep' : 'menu.fighterStep')));
    root.append(header);
    if (this.page === 'home' || this.page === 'difficulty') {
      const modes = node('nav', 'arena-modes'); modes.setAttribute('aria-label', t(this.page === 'home' ? 'menu.modesLabel' : 'menu.difficultyLabel'));
      const feature = node('div', 'arena-feature');
      feature.setAttribute('aria-hidden', 'true');
      const featureNumber = node('span', 'arena-feature-number');
      const featureTitle = node('strong', 'arena-feature-title');
      const featureHint = node('span', 'arena-feature-hint');
      feature.append(featureNumber, featureTitle, featureHint);
      this.entries.forEach((mode, index) => {
        const item = button('', 'arena-mode', () => this.page === 'home' ? this.chooseMode(index) : this.chooseDifficulty(index));
        item.append(node('span', 'arena-number', String(index + 1).padStart(2, '0')),
          node('strong', '', mode.title), node('small', '', mode.tag), node('span', 'arena-mode-hint', mode.hint));
        item.addEventListener('pointerenter', () => this.selectHomeMode(index));
        item.addEventListener('focus', () => this.selectHomeMode(index));
        modes.append(item);
      });
      if (this.page === 'difficulty') modes.append(button(t('common.backArrow'), 'arena-home-back', () => this.back()));
      const note = node('div', 'arena-home-note', t(this.page === 'home' ? 'menu.chooseFight' : 'menu.chooseDifficulty'));
      const controls = node('footer', 'arena-home-controls', t(this.page === 'home' ? 'menu.homeControls' : 'menu.difficultyControls'));
      root.append(modes, feature, note, controls);
      this.selectHomeMode(this.cursor);
    } else if (this.page === 'stage') {
      const picker = this.stagePicker;
      const two = picker.active.length === 2;
      renderStageSelection(root, {
        groups: picker.groups, cursors: [picker.cursors[0], two ? picker.cursors[1] : undefined], focus: picker.focus,
        ready: picker.ready, variants: picker.variants, plateFor: picker.plateFor,
        heading: this.stageWinner !== undefined ? t('stage.winnerPicks', { player: this.stageWinner + 1 })
          : [0, 1].map(player => `P${player + 1} ${t(picker.ready[player] ? 'fighter.statusReady' : 'fighter.statusChoosing')}`).join(' · '),
        controls: t(two ? 'menu.versusControls' : 'stage.controls'),
        select: index => { const player = this.pointerPlayer(); if (picker.cursors[player] !== index) { picker.point(player, index); this.render(); } },
        choose: index => { const player = this.pointerPlayer(); picker.point(player, index); this.confirmStage(player); },
        chooseVariant: stageId => { if (!this.drawing && picker.chooseVariant(stageId)) this.finishPicking(); else this.render(); },
        closeVariants: () => { picker.cancel(); this.render(); },
        confirm: () => this.confirmStage(this.pointerPlayer()), back: () => this.back(),
      });
    } else {
      renderFighterSelection(root, {
        fighters: this.fighters,
        selection: this.selection,
        opponent: this.mode === 'arcade' ? getCharacterById(this.arcadeRun.opponents[0]) ?? opponentFor(this.fighters[this.fighterIndex].id) : opponentFor(this.fighters[this.fighterIndex].id),
        versus: this.mode === 'versus',
        selectOpponent: selectsOpponent(this.mode),
        solo: this.mode === 'arcade',
        modeTitle: modeEntry(this.mode).title,
        refresh: () => this.render(),
        confirm: () => this.confirmFighter(),
        back: () => this.back(),
      });
    }
    if (this.page === 'fighter') root.append(node('footer', 'arena-footer', t(this.mode === 'versus' ? 'menu.versusControls' : 'menu.fighterControls')));
  }
  private selectHomeMode(index: number): void {
    const root = this.menuElement;
    const featureNumber = root?.querySelector<HTMLElement>('.arena-feature-number');
    const featureTitle = root?.querySelector<HTMLElement>('.arena-feature-title');
    const featureHint = root?.querySelector<HTMLElement>('.arena-feature-hint');
    if (!root || !featureNumber || !featureTitle || !featureHint) return;
    const changed = index !== this.cursor;
    if (this.page === 'difficulty') this.difficultyIndex = index; else this.modeIndex = index;
    const mode = this.entries[index];
    featureNumber.textContent = `${String(index + 1).padStart(2, '0')} · ${mode.tag}`;
    featureTitle.textContent = mode.title;
    featureHint.textContent = mode.hint;
    if (changed && !this.motionPreference?.matches && typeof featureTitle.animate === 'function') {
      featureTitle.animate([{ opacity: .35, transform: 'translateX(-18px)' }, { opacity: 1, transform: 'translateX(0)' }],
        { duration: 200, easing: 'ease-out' });
    }
    root.querySelectorAll<HTMLButtonElement>('.arena-mode').forEach((element, itemIndex) => {
      element.classList.toggle('selected', itemIndex === index);
      element.setAttribute('aria-current', String(itemIndex === index));
    });
  }
  /** Both players choose, except after a rematch swap, when only the previous winner does. */
  private get stagePicker(): StagePicker {
    return this.picker ??= this.createPicker();
  }
  private createPicker(): StagePicker {
    const active: (0 | 1)[] = this.stageWinner !== undefined ? [this.stageWinner] : [0, 1];
    return new StagePicker(active, STAGE_GROUPS);
  }
  /** Mouse choices go to the first player who has not chosen yet (or the one whose plate is open). */
  private pointerPlayer(): 0 | 1 {
    const picker = this.stagePicker;
    return picker.plateFor ?? picker.active.find(player => !picker.ready[player]) ?? picker.active[0];
  }
  /** Keys: in two-player mode P1 uses A/D + J and P2 the arrows + Num1, as in the character select; one chooser may use either set. */
  private handleStageKey(event: KeyboardEvent): void {
    if (this.drawing) return;
    const picker = this.stagePicker, key = event.key.toLowerCase(), single = picker.active.length === 1;
    const left = key === 'a' || key === 'arrowleft' || key === 'arrowup', right = key === 'd' || key === 'arrowright' || key === 'arrowdown';
    const p1Keys = key === 'a' || key === 'd' || key === 'j', p2Keys = key.startsWith('arrow') || event.code === 'Numpad1';
    const player: 0 | 1 | undefined = single ? picker.active[0] : key === 'enter' ? this.pointerPlayer() : p1Keys ? 0 : p2Keys ? 1 : undefined;
    if (player === undefined) return;
    if (left || right) { if (picker.plateFor === player) picker.moveVariant(player, left ? -1 : 1); else picker.move(player, left ? -1 : 1); this.render(); }
    else if (key === 'enter' || key === 'j' || event.code === 'Numpad1') this.confirmStage(player);
  }
  private confirmStage(player: 0 | 1): void {
    if (this.drawing) return;
    if (this.stagePicker.confirm(player)) this.finishPicking(); else this.render();
  }
  /** Everyone has chosen: a lone chooser decides, and two different picks go to a 50/50 draw. */
  private finishPicking(): void {
    const picker = this.stagePicker;
    const groups = groupsFor('versus');
    if (picker.active.length === 1) { this.finishStage(picker.stageOf(picker.active[0], groups)); return; }
    const draw = drawVersusStage([picker.choices[0]!, picker.choices[1]!], groups);
    if (!draw.drawn) { this.finishStage(draw.stageId); return; }
    this.drawing = true; this.render();
    renderStageDraw(this.menuElement!, draw.candidates, draw.winner, Boolean(this.motionPreference?.matches), () => this.finishStage(draw.stageId));
  }
  private finishStage(stageId: string): void { this.chosenStageId = stageId; this.drawing = false; this.startFight(); }
  private chooseMode(index: number): void {
    this.selection.reopen();
    this.modeIndex = index; const id = MODES[index];
    if (id === 'settings') { new ControlSettings(() => this.render()); return; }
    if (id === 'developer') { this.openDeveloper(); return; } else { this.mode = id; if (id === 'arcade') this.arcadeRun = createArcadeRun(); this.page = id === 'arcade' ? 'difficulty' : 'fighter'; if (id === 'tutorial') this.fighterIndex = 0; } this.render();
  }
  private openDeveloper(): void {
    if (import.meta.env.MODE !== 'development') return;
    this.transitioning = true;
    void loadDeveloperPanel().then(({ DeveloperPanel }) => new DeveloperPanel(this, () => { this.transitioning = false; this.render(); }));
  }
  private chooseDifficulty(index: number): void {
    this.difficultyIndex = index; this.page = 'fighter'; this.render();
  }
  private back(): void {
    if (this.drawing) return;
    if (this.page === 'stage') {
      if (this.stagePicker.cancel() !== 'leave') { this.render(); return; }
      this.picker = undefined;
    }
    if (this.page === 'fighter' && this.selection.choosingColor[this.selection.activePlayer]) {
      this.selection.choosingColor[this.selection.activePlayer] = false;
      this.selection.ready[this.selection.activePlayer] = false;
      this.render(); return;
    }
    this.selection.reopen();
    this.page = this.page === 'stage' ? 'fighter' : this.page === 'fighter' && this.mode === 'arcade' ? 'difficulty' : 'home'; this.render();
  }
  private confirmFighter(player = this.selection.activePlayer): void {
    if (!this.selection.confirm(player, selectsOpponent(this.mode))) { this.render(); return; }
    if (isTrainingMode(this.mode) || this.mode === 'arcade') this.startFight();
    else { this.picker = undefined; this.page = 'stage'; this.render(); }
  }
  private startFight(): void {
    if (this.transitioning) return; this.transitioning = true;
    // Random picks are drawn only now, so nobody sees them before the fight starts.
    this.selection.resolveRandoms();
    const fighter = this.fighters[this.fighterIndex];
    this.scene.start('FightScene', { fighterId: fighter.id, opponentId: selectsOpponent(this.mode) ? this.fighters[this.selection.indices[1]].id : opponentFor(fighter.id).id, stageId: this.chosenStageId, mode: this.mode, arcadeIndex: 0, arcadeRun: this.arcadeRun, difficulty: ARCADE_DIFFICULTIES[this.difficultyIndex].id satisfies ArcadeDifficulty, fighterPalette: this.selection.palettes[0], opponentPalette: selectsOpponent(this.mode) ? this.selection.palettes[1] : undefined });
  }
}
