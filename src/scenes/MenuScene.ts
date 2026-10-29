import { LOGICAL_VIEW, configureUiCamera, sharpenSceneText } from '../rendering/presentation';
import { shotoSpriteManifest } from '../rendering/animations/shotoSprites';

import { getTimedAnimationFrame } from '../rendering/animations/AnimationPlayback';
import { FighterSelection, type SelectionPlayer } from '../ui/FighterSelection';
import idlePortrait from '../assets/sprites/characters/shoto/idle.png';
import '../ui/menu.css';

import { ControlSettings } from '../ui/ControlSettings';
import Phaser from 'phaser';
import { playableCharacters } from '../engine/data/characters';
import { defaultStage, selectableStages, stageTextureKey } from '../rendering/stages/stageCatalog';
import { opponentFor, isTrainingMode, type MatchMode } from './matchSetup';

const MODES = [
  { id: 'arcade', title: 'ARCADE', hint: 'Enfrente o Shoto controlado pelo computador.', tag: '1 JOGADOR' },
  { id: 'versus', title: 'LUTA PVP', hint: 'Dois jogadores no mesmo teclado.', tag: '2 JOGADORES' },
  { id: 'training', title: 'MODO TREINO', hint: 'Pratique comandos, alcances e punições.', tag: 'PRÁTICA LIVRE' },
  { id: 'tutorial', title: 'TUTORIAL BÁSICO', hint: 'Aprenda movimento, quatro básicos e defesa.', tag: 'PASSO A PASSO' },
  { id: 'combo-tutorial', title: 'TUTORIAL DE COMBOS', hint: 'Pratique as sequências manuais do personagem.', tag: 'COMBOS' },
  { id: 'settings', title: 'CONFIGURAÇÕES', hint: 'Teclas e controles dos dois jogadores.', tag: 'OPÇÕES' },
] as const;

/** Fluxo público: modo → escolhas dos jogadores → cenário → luta. */
export class MenuScene extends Phaser.Scene {
  private page: 'home' | 'fighter' | 'stage' | 'settings' = 'home';
  private mode: MatchMode = 'arcade';
  private modeIndex = 0;
  private stageIndex = 0;
  private get selectedStage() { return selectableStages[this.stageIndex]; }
  private readonly selection = new FighterSelection(playableCharacters.length);
  private readonly idleImages: SVGImageElement[] = [];
  private get fighterIndex(): number { return this.selection.indices[0]; }
  private set fighterIndex(index: number) { this.selection.select(0, index); }
  private root?: Phaser.GameObjects.Container;
  private chrome?: Phaser.GameObjects.Container;
  private menuElement?: HTMLElement;
  private resizeObserver?: ResizeObserver;
  private motionPreference?: MediaQueryList;
  private readonly alignMenu = (): void => {
    const rect = this.game.canvas.getBoundingClientRect();
    Object.assign(this.menuElement!.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
  };
  private transitioning = false;
  private readonly handleKey = (event: KeyboardEvent): void => {
    if (ControlSettings.active || event.repeat || this.transitioning) return;
    const key = event.key;
    if (key === 'Enter' && event.target instanceof HTMLButtonElement &&
      !(this.page === 'home' && event.target.classList.contains('arena-mode'))) return;
    if (['Enter', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) event.preventDefault();
    if (this.page === 'home') {
      if (key === 'ArrowDown' || key === 'ArrowUp') {
        this.selectHomeMode((this.modeIndex + (key === 'ArrowDown' ? 1 : -1) + MODES.length) % MODES.length);
        if (event.target instanceof HTMLButtonElement && event.target.classList.contains('arena-mode'))
          this.menuElement?.querySelectorAll<HTMLButtonElement>('.arena-mode')[this.modeIndex]?.focus();
      }
      else if (key === 'Enter') this.chooseMode(this.modeIndex);
      else { const i = ['a', 'v', 't', 'b', 'o', 'c'].indexOf(key.toLowerCase()); if (i >= 0) this.chooseMode(i); }
    } else if (key === 'Escape') this.back();
    else if (this.page === 'fighter') {
      const versus = this.mode === 'versus';
      const p1Direction = key.toLowerCase() === 'a' ? -1 : key.toLowerCase() === 'd' ? 1 : 0;
      const arrowDirection = ['ArrowLeft', 'ArrowUp'].includes(key) ? -1 : ['ArrowRight', 'ArrowDown'].includes(key) ? 1 : 0;
      if (versus && p1Direction) {
        this.selection.select(0, this.selection.indices[0] + p1Direction); this.render();
      } else if (arrowDirection) {
        const player = versus ? 1 : 0;
        this.selection.select(player, this.selection.indices[player] + arrowDirection); this.render();
      } else if (versus && key.toLowerCase() === 'j') this.confirmFighter(0);
      else if (versus && event.code === 'Numpad1') this.confirmFighter(1);
      else if (key === 'Enter') this.confirmFighter();
    } else if (this.page === 'stage') {
      if (key === 'ArrowLeft' || key === 'ArrowRight') this.chooseStage(key === 'ArrowLeft' ? -1 : 1);
      else if (key === 'Enter') this.startFight();
    }
  };

  private get fighters() {
    return playableCharacters;
  }

  constructor() { super('MenuScene'); }
  init(data: { fighterId?: string } = {}): void {
    this.page = 'home'; this.mode = 'arcade'; this.transitioning = false; this.selection.reopen();
    this.stageIndex = selectableStages.findIndex(stage => stage.id === defaultStage.id);
    const index = this.fighters.findIndex(f => f.id === data.fighterId);
    if (index >= 0) this.fighterIndex = index;
  }
  create(): void {
    configureUiCamera(this.cameras.main, this.scale);
    const { width, height } = LOGICAL_VIEW;
    // Overscan keeps the slow camera drift inside the illustration at every phase.
    this.textures.get('menu-solar').setFilter(Phaser.Textures.FilterMode.LINEAR);
    const background = this.add.image(width / 2, height / 2, 'menu-solar');
    const cover = Math.max(width / background.width, height / background.height) * 1.045;
    background.setScale(cover);
    this.motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reducedMotion = this.motionPreference.matches;
    if (!reducedMotion) {
      this.tweens.add({ targets: background, x: width / 2 - 9, y: height / 2 + 4,
        scaleX: cover * 1.012, scaleY: cover * 1.012, duration: 18000,
        ease: 'Sine.inOut', yoyo: true, repeat: -1 });
      for (let i = 0; i < 9; i++) {
        const mote = this.add.circle(620 + (i * 47) % 370, 155 + (i * 61) % 350, i % 3 === 0 ? 1.6 : 1, 0xffdc95, .35);
        this.tweens.add({ targets: mote, y: mote.y - 32, x: mote.x + 10, alpha: .05,
          duration: 6500 + i * 470, delay: i * 480, ease: 'Sine.inOut', yoyo: true, repeat: -1 });
      }
    }
    // A left-only ink wash protects text without covering the sun and gateway.
    const wash = this.add.graphics();
    wash.fillGradientStyle(0x111016, 0x111016, 0x111016, 0x111016, .88, 0, .94, 0);
    wash.fillRect(0, 0, 740, height);
    this.chrome = this.add.container(0, 0);
    this.chrome.add([
      this.add.rectangle(width / 2, height - 18, width, 36, 0x111016, .82),
      this.add.rectangle(35, 49, 4, 46, 0xc04436),
      this.add.text(55, 22, 'CLOSE COMBAT', { fontSize: '34px', fontStyle: 'bold', color: '#fff0d2', fontFamily: 'Arial, sans-serif', stroke: '#151017', strokeThickness: 2 }),
      this.add.text(57, 65, 'ESCOLHA SUA LUTA', { fontSize: '10px', color: '#ddbd91', letterSpacing: 4 }),
    ]);
    this.menuElement = document.createElement('section');
    this.menuElement.className = 'arena-menu';
    this.menuElement.setAttribute('aria-label', 'Menu principal');
    document.body.append(this.menuElement);
    this.resizeObserver = new ResizeObserver(this.alignMenu);
    this.resizeObserver.observe(this.game.canvas);
    window.addEventListener('resize', this.alignMenu);
    this.alignMenu();
    this.root = this.add.container(0, 0); this.render();
    window.addEventListener('keydown', this.handleKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('keydown', this.handleKey);
      this.resizeObserver?.disconnect();
      window.removeEventListener('resize', this.alignMenu);
      this.idleImages.length = 0;
      this.menuElement?.remove(); this.menuElement = undefined;
      this.root = undefined;
    });
  }
  update(time: number): void {
    if (!this.idleImages.length) return;
    const clip = shotoSpriteManifest.clips.find(entry => entry.key === 'shoto-idle')!;
    const frame = this.motionPreference?.matches ? clip.start : getTimedAnimationFrame(clip, time * .06);
    for (const image of this.idleImages) image.setAttribute('x', String(-frame * shotoSpriteManifest.frameSize.width));
  }
  private text(x: number, y: number, label: string, size = 16, color = '#f8f0e4') {
    const text = this.add.text(x, y, label, { fontSize: `${size}px`, fontFamily: 'Arial, sans-serif', fontStyle: size >= 16 ? 'bold' : 'normal', color }); this.root!.add(text); return text;
  }
  private box(x: number, y: number, w: number, h: number, color: number, alpha = 1) {
    const box = this.add.rectangle(x, y, w, h, color, alpha).setOrigin(0); this.root!.add(box); return box;
  }
  private button(x: number, y: number, w: number, label: string, action: () => void) {
    const rect = this.box(x, y, w, 42, 0xa6372e).setInteractive({ useHandCursor: true });
    this.text(x + w / 2, y + 12, label, 14).setOrigin(.5, 0);
    rect.on('pointerover', () => rect.setFillStyle(0xc04436)).on('pointerout', () => rect.setFillStyle(0xa6372e)).on('pointerdown', action);
  }
  private render(): void {
    const root = this.root; if (!root) return; root.removeAll(true);
    const { width, height } = LOGICAL_VIEW;
    this.menuElement!.hidden = this.page !== 'home' && this.page !== 'fighter';
    this.chrome?.setVisible(this.menuElement!.hidden);
    this.idleImages.length = 0;
    this.menuElement!.replaceChildren();
    if (!this.menuElement!.hidden) { this.renderMenu(); return; }
    const titles = { home: '01 / MODOS', fighter: '02 / PERSONAGEM', stage: '03 / CENÁRIO', settings: 'CONFIGURAÇÕES' };
    this.text(width - 42, 40, titles[this.page], 13, '#fff0d2').setStroke('#171219', 3).setOrigin(1, 0);
    if (this.page === 'stage') {
      const stage = this.selectedStage;
      this.text(56, 119, 'ONDE VAMOS LUTAR?', 28);
      const x = 212, y = 168, w = 600;
      const scale = Math.min(w / stage.referenceSize.width, 300 / stage.referenceSize.height);
      const imageX = x + (w - stage.referenceSize.width * scale) / 2;
      this.box(x - 2, y - 2, w + 4, 303, 0xc04436);
      for (const layer of [...stage.layers].sort((a, b) => a.depth - b.depth)) {
        const content = layer.contentScale ?? 1, origin = layer.scaleOrigin ?? { x: 0, y: 0 };
        const image = this.add.image(imageX + scale * (layer.x + origin.x * (1 - content)), y + scale * (layer.y + origin.y * (1 - content)), stageTextureKey(stage, layer)).setOrigin(0).setScale(scale * content); root.add(image);
      }
      this.box(x, y + 245, w, 54, 0x101019, .90);
      this.text(x + 20, y + 258, stage.name.toUpperCase(), 23, '#f3d49e');
      this.text(x + w - 20, y + 267, 'CENÁRIO SELECIONADO', 11, '#c4b8c0').setOrigin(1, 0);
      this.button(58, 310, 112, '← ANTERIOR', () => this.chooseStage(-1));
      this.button(854, 310, 112, 'PRÓXIMO →', () => this.chooseStage(1));
      this.text(56, height - 25, '← →  CENÁRIO     ENTER  COMEÇAR     ESC  VOLTAR', 11, '#d3bea3');
      this.text(160, 490, `${this.fighters[this.fighterIndex].name.toUpperCase()}${this.mode === 'versus' ? ` × ${this.fighters[this.selection.indices[1]].name.toUpperCase()}` : ''} · ${MODES.find(m => m.id === this.mode)!.title}`, 14, '#d4b47d');
      this.button(630, 486, 234, 'COMEÇAR LUTA', () => this.startFight());
    } else {
      this.text(56, 144, 'CONFIGURAÇÕES', 26);
      this.text(56, 204, 'Configure as teclas no painel de controles.', 18, '#c4b8c0');
      this.button(56, 288, 180, 'VOLTAR', () => this.back());
      this.text(56, height - 25, 'ESC  VOLTAR AO MENU', 11, '#d3bea3');
    }
    sharpenSceneText(this);
  }
  private renderMenu(): void {
    const root = this.menuElement!;
    const fighter = this.fighters[this.fighterIndex];
    root.classList.remove('versus-selection');
    root.classList.toggle('arena-home', this.page === 'home');
    const node = (tag: string, className: string, text = ''): HTMLElement => {
      const element = document.createElement(tag); element.className = className; element.textContent = text; return element;
    };
    const button = (label: string, className: string, action: () => void): HTMLButtonElement => {
      const element = document.createElement('button'); element.className = className; element.textContent = label;
      element.onclick = action; return element;
    };
    const portrait = (crop: string, animated = false): SVGSVGElement => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', crop); svg.setAttribute('aria-hidden', 'true');
      const image = document.createElementNS(svg.namespaceURI, 'image');
      image.setAttribute('href', idlePortrait); image.setAttribute('width', '6144'); image.setAttribute('height', '768');
      if (animated) this.idleImages.push(image as SVGImageElement);
      svg.append(image); return svg;
    };
    const header = node('header', 'arena-header');
    header.append(node('span', 'arena-brand', 'CLOSE COMBAT'));
    if (this.page === 'fighter') header.append(node('span', 'arena-step', 'SELEÇÃO DE PERSONAGEM'));
    root.append(header);
    if (this.page === 'home') {
      const modes = node('nav', 'arena-modes'); modes.setAttribute('aria-label', 'Modos de jogo');
      const feature = node('div', 'arena-feature');
      feature.setAttribute('aria-hidden', 'true');
      const featureNumber = node('span', 'arena-feature-number');
      const featureTitle = node('strong', 'arena-feature-title');
      const featureHint = node('span', 'arena-feature-hint');
      feature.append(featureNumber, featureTitle, featureHint);
      MODES.forEach((mode, index) => {
        const item = button('', 'arena-mode', () => this.chooseMode(index));
        item.append(node('span', 'arena-number', String(index + 1).padStart(2, '0')),
          node('strong', '', mode.title), node('small', '', mode.tag), node('span', 'arena-mode-hint', mode.hint));
        item.addEventListener('pointerenter', () => this.selectHomeMode(index));
        item.addEventListener('focus', () => this.selectHomeMode(index));
        modes.append(item);
      });
      const hero = node('div', 'arena-home-hero'); hero.setAttribute('aria-hidden', 'true');
      hero.append(portrait('130 35 510 710', true));
      const note = node('div', 'arena-home-note', 'ESCOLHA SUA LUTA');
      const controls = node('footer', 'arena-home-controls', '↑ ↓ ESCOLHER   ·   ENTER CONFIRMAR');
      root.append(modes, feature, hero, note, controls);
      this.selectHomeMode(this.modeIndex);
    } else {
      const versus = this.mode === 'versus';
      root.classList.toggle('versus-selection', versus);
      const addFighter = (player: SelectionPlayer): void => {
        const entry = this.fighters[this.selection.indices[player]];
        const side = player === 0 ? 'left' : 'right';
        const hero = node('div', `arena-hero ${side}`); hero.append(portrait('130 35 510 710', true));
        const name = node('div', `arena-fighter-name ${side}`);
        name.append(node('span', 'arena-eyebrow', `PLAYER 0${player + 1}`), node('h1', '', entry.name));
        if (versus) name.append(button(this.selection.ready[player] ? `P${player + 1} · PRONTO` : `ESCOLHER P${player + 1}`, 'arena-player-switch', () => { this.selection.activePlayer = player; this.render(); }));
        root.append(hero, name);
      };
      addFighter(0);
      if (versus) addFighter(1);
      const selection = node('div', 'arena-selection');
      selection.append(node('span', 'arena-eyebrow', MODES.find(mode => mode.id === this.mode)!.title), node('h2', '', versus ? `ESCOLHA DE P${this.selection.activePlayer + 1}` : 'ESCOLHA SEU LUTADOR'));
      const grid = node('div', 'arena-roster'); grid.setAttribute('role', 'group'); grid.setAttribute('aria-label', 'Personagens disponíveis');
      this.fighters.forEach((entry, index) => {
        const tile = button('', 'arena-portrait', () => { this.selection.select(this.selection.activePlayer, index); this.render(); });
        tile.setAttribute('aria-label', entry.name); tile.setAttribute('aria-pressed', String(index === this.selection.indices[this.selection.activePlayer]));
        tile.append(portrait('280 65 180 180'), node('span', '', entry.name));
        if (versus) {
          const cursors = node('div', 'arena-cursors');
          for (const player of [0, 1] as const) if (this.selection.indices[player] === index) cursors.append(node('b', `cursor-p${player + 1}`, `P${player + 1}`));
          tile.append(cursors);
        }
        grid.append(tile);
      });
      for (let index = this.fighters.length; index < 12; index++) {
        const slot = node('div', 'arena-empty', '—'); slot.setAttribute('aria-hidden', 'true'); grid.append(slot);
      }
      const status = node('p', 'arena-opponent', versus
        ? `P1 ${this.selection.ready[0] ? 'PRONTO' : 'ESCOLHENDO'} · P2 ${this.selection.ready[1] ? 'PRONTO' : 'ESCOLHENDO'}`
        : `P2 · ${opponentFor(fighter.id, this.mode).name} · ${this.mode === 'arcade' ? 'Computador' : 'Adversário de treino'}`);
      status.setAttribute('role', 'status');
      selection.append(grid, status, button(versus ? `CONFIRMAR P${this.selection.activePlayer + 1}  →` : 'CONFIRMAR PERSONAGEM  →', 'arena-confirm', () => this.confirmFighter()), button('← VOLTAR', 'arena-back', () => this.back()));
      root.append(selection);
    }
    if (this.page === 'fighter') root.append(node('footer', 'arena-footer', this.mode === 'versus'
      ? 'P1: A / D · J CONFIRMAR     P2: ← / → · NUM1 CONFIRMAR     ENTER: CONFIRMAR VEZ     ESC: VOLTAR'
      : '← →  ESCOLHER     ENTER  CONFIRMAR     ESC  VOLTAR'));
  }
  private selectHomeMode(index: number): void {
    const root = this.menuElement;
    const featureNumber = root?.querySelector<HTMLElement>('.arena-feature-number');
    const featureTitle = root?.querySelector<HTMLElement>('.arena-feature-title');
    const featureHint = root?.querySelector<HTMLElement>('.arena-feature-hint');
    if (!root || !featureNumber || !featureTitle || !featureHint) return;
    const changed = index !== this.modeIndex;
    this.modeIndex = index;
    const mode = MODES[index];
    featureNumber.textContent = `0${index + 1} / ${mode.tag}`;
    featureTitle.textContent = mode.title;
    featureTitle.classList.toggle('long', mode.title.length > 13);
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
  private chooseStage(direction: number): void {
    this.stageIndex = (this.stageIndex + direction + selectableStages.length) % selectableStages.length;
    this.render();
  }
  private chooseMode(index: number): void {
    this.selection.reopen();
    this.modeIndex = index; const id = MODES[index].id;
    if (id === 'settings') { this.page = 'settings'; new ControlSettings(() => { this.page = 'home'; this.render(); }); } else { this.mode = id; this.page = 'fighter'; if (id === 'tutorial' || id === 'combo-tutorial') this.fighterIndex = 0; } this.render();
  }
  private back(): void {
    this.selection.reopen();
    this.page = this.page === 'stage' ? 'fighter' : 'home'; this.render();
  }
  private confirmFighter(player = this.selection.activePlayer): void {
    if (!this.selection.confirm(player, this.mode === 'versus')) { this.render(); return; }
    if (isTrainingMode(this.mode)) this.startFight();
    else { this.page = 'stage'; this.render(); }
  }
  private startFight(): void {
    if (this.transitioning) return; this.transitioning = true;
    const fighter = this.fighters[this.fighterIndex];
    this.scene.start('FightScene', { fighterId: fighter.id, opponentId: this.mode === 'versus' ? this.fighters[this.selection.indices[1]].id : opponentFor(fighter.id, this.mode).id, stageId: this.selectedStage.id, mode: this.mode, arcadeIndex: 0 });
  }
}
