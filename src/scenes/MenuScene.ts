import { preloadShotoSprites, shotoSpriteManifest } from '../rendering/animations/shotoSprites';
import { getTimedAnimationFrame } from '../rendering/animations/AnimationPlayback';
import { ControlSettings } from '../ui/ControlSettings';
import Phaser from 'phaser';
import { playableCharacters } from '../engine/data/characters';
import type { CharacterDefinition } from '../engine/data/characters';
import { defaultStage, stageTextureKey } from '../rendering/stages/stageCatalog';
import { preloadStage } from '../rendering/stages/StageView';
import { opponentFor, type MatchMode } from './matchSetup';

const MODES = [
  { id: 'arcade', title: 'ARCADE', hint: 'Enfrente o Shoto controlado pelo computador.', tag: '1 JOGADOR' },
  { id: 'versus', title: 'LUTA PVP', hint: 'Dois jogadores no mesmo teclado.', tag: '2 JOGADORES' },
  { id: 'training', title: 'MODO TREINO', hint: 'Pratique comandos, alcances e punições.', tag: 'PRÁTICA LIVRE' },
  { id: 'tutorial', title: 'TUTORIAL BÁSICO', hint: 'Aprenda movimento, quatro básicos e defesa.', tag: 'PASSO A PASSO' },
  { id: 'combo-tutorial', title: 'TUTORIAL DE COMBOS', hint: 'Aguardando suas receitas manuais.', tag: 'COMBOS' },
  { id: 'settings', title: 'CONFIGURAÇÕES', hint: 'Teclas e controles dos dois jogadores.', tag: 'OPÇÕES' },
] as const;
const STYLES: Record<string, string> = { shoto: 'Base provisória · Quatro golpes básicos' };

/** Fluxo público: modo → personagem de P1 → cenário → luta. */
export class MenuScene extends Phaser.Scene {
  private page: 'home' | 'fighter' | 'stage' | 'settings' = 'home';
  private mode: MatchMode = 'arcade';
  private modeIndex = 0;
  private fighterIndex = 0;
  private root?: Phaser.GameObjects.Container;
  private loading?: Phaser.GameObjects.Text;
  private transitioning = false;
  private readonly handledKeyEvents = new WeakSet<KeyboardEvent>();
  private readonly handleKey = (event: KeyboardEvent): void => {
    // A fila do Phaser pode revisitar o mesmo evento antes de ser esvaziada.
    // Uma confirmação deve avançar somente uma página, mesmo nesse caso.
    if (ControlSettings.active || event.repeat || this.transitioning || this.handledKeyEvents.has(event)) return;
    this.handledKeyEvents.add(event);
    const key = event.key;
    if (this.page === 'home') {
      if (key === 'ArrowDown' || key === 'ArrowUp') { this.modeIndex = (this.modeIndex + (key === 'ArrowDown' ? 1 : -1) + MODES.length) % MODES.length; this.render(); }
      else if (key === 'Enter') this.chooseMode(this.modeIndex);
      else { const i = ['a', 'v', 't', 'b', 'o', 'c'].indexOf(key.toLowerCase()); if (i >= 0) this.chooseMode(i); }
    } else if (key === 'Escape') this.back();
    else if (this.page === 'fighter') {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) {
        this.fighterIndex = (this.fighterIndex + (['ArrowLeft', 'ArrowUp'].includes(key) ? -1 : 1) + this.fighters.length) % this.fighters.length; this.render();
      } else if (key === 'Enter') { this.page = 'stage'; this.render(); }
    } else if (this.page === 'stage' && key === 'Enter') this.startFight();
  };

  private get fighters() {
    return playableCharacters;
  }

  constructor() { super('MenuScene'); }
  init(data: { fighterId?: string } = {}): void {
    this.page = 'home'; this.mode = 'arcade'; this.transitioning = false;
    const index = this.fighters.findIndex(f => f.id === data.fighterId);
    if (index >= 0) this.fighterIndex = index;
  }
  preload(): void {
    this.loading = this.add.text(this.scale.width / 2, this.scale.height / 2, 'PREPARANDO A ARENA…', { fontSize: '18px', color: '#e6c78d' }).setOrigin(.5);
    preloadStage(this, defaultStage);
    preloadShotoSprites(this);
  }
  create(): void {
    this.loading?.destroy(); this.loading = undefined;
    const { width, height } = this.scale;
    const layer = defaultStage.layers[0];
    this.add.image(width / 2, height / 2, stageTextureKey(defaultStage, layer)).setScale(Math.max(width / defaultStage.referenceSize.width, height / defaultStage.referenceSize.height)).setAlpha(.30);
    this.add.rectangle(width / 2, height / 2, width, height, 0x0b0d15, .77);
    this.add.rectangle(35, 49, 5, 44, 0xc84b5c);
    this.add.text(55, 25, 'CLOSE COMBAT', { fontSize: '32px', fontStyle: 'bold', color: '#f8f0e4', fontFamily: 'Arial, sans-serif' });
    this.add.text(56, 67, 'ESCOLHA SUA LUTA', { fontSize: '11px', color: '#ae99a2', letterSpacing: 3 });
    this.root = this.add.container(0, 0); this.render();
    this.input.keyboard?.on('keydown', this.handleKey);
    this.input.keyboard?.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'ENTER', 'ESC']);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown', this.handleKey);
      this.input.keyboard?.removeCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'ENTER', 'ESC']);
      this.root = undefined;
    });
  }
  private text(x: number, y: number, label: string, size = 16, color = '#f8f0e4') {
    const text = this.add.text(x, y, label, { fontSize: `${size}px`, fontFamily: 'Arial, sans-serif', color }); this.root!.add(text); return text;
  }
  private box(x: number, y: number, w: number, h: number, color: number, alpha = 1) {
    const box = this.add.rectangle(x, y, w, h, color, alpha).setOrigin(0); this.root!.add(box); return box;
  }
  private button(x: number, y: number, w: number, label: string, action: () => void) {
    const rect = this.box(x, y, w, 42, 0xa63c50).setInteractive({ useHandCursor: true });
    this.text(x + w / 2, y + 12, label, 14).setOrigin(.5, 0);
    rect.on('pointerover', () => rect.setFillStyle(0xc24b60)).on('pointerout', () => rect.setFillStyle(0xa63c50)).on('pointerdown', action);
  }
  private preview(fighter: CharacterDefinition, x: number, y: number, zoom: number) {
    if (fighter.id === 'shoto' && this.textures.exists('shoto-idle')) {
      this.textures.get('shoto-idle').setFilter(Phaser.Textures.FilterMode.LINEAR);
      const sprite = this.add.image(x, y, 'shoto-idle', '0').setOrigin(.5, 720 / 768).setScale(.225 * zoom);
      this.root!.add(sprite);
      const start = this.time.now;
      const animate = (time: number): void => { sprite.setFrame(String(getTimedAnimationFrame(shotoSpriteManifest.clips[0], (time - start) * .06))); };
      this.events.on('update', animate);
      sprite.once('destroy', () => this.events.off('update', animate));
      return;
    }
    this.box(x - 24 * zoom, y - 144 * zoom, 48 * zoom, 144 * zoom, 0xb7aabf).setStrokeStyle(2, 0xf1dfc4);
    this.box(x + 12 * zoom, y - 128 * zoom, 6 * zoom, 6 * zoom, 0xffffff);
  }
  private render(): void {
    const root = this.root; if (!root) return; root.removeAll(true);
    const { width, height } = this.scale;
    const titles = { home: '01 / MODOS', fighter: '02 / PERSONAGEM', stage: '03 / CENÁRIO', settings: 'CONFIGURAÇÕES' };
    this.text(width - 42, 40, titles[this.page], 13, '#d9bd8d').setOrigin(1, 0);
    if (this.page === 'home') {
      this.text(56, 123, 'COMO VOCÊ QUER JOGAR?', 21);
      MODES.forEach((mode, i) => {
        const y = 158 + i * 56, selected = this.modeIndex === i;
        const card = this.box(56, y, 526, 50, selected ? 0x3a2532 : 0x1a1a23, .96).setStrokeStyle(1, selected ? 0xce6373 : 0x403440).setInteractive({ useHandCursor: true });
        if (selected) this.box(56, y, 4, 50, 0xe37988);
        this.text(75, y + 10, mode.title, 16, selected ? '#fff1d8' : '#f0e5e7');
        this.text(75, y + 30, mode.hint, 12, '#b8aab2');
        this.text(566, y + 13, mode.tag, 9, '#d4b47d').setOrigin(1, 0);
        card.on('pointerover', () => card.setStrokeStyle(1, 0xe37988)).on('pointerout', () => card.setStrokeStyle(1, selected ? 0xce6373 : 0x403440)).on('pointerdown', () => this.chooseMode(i));
      });
      this.box(645, 147, 323, 337, 0x191823, .72).setStrokeStyle(1, 0x493442);
      this.text(667, 168, 'NA ARENA', 12, '#ddbd8b');
      this.preview(this.fighters[this.fighterIndex], 807, 446, 1.55);
      this.text(807, 457, this.fighters[this.fighterIndex].name.toUpperCase(), 16, '#e9c98e').setOrigin(.5, 0);
      this.text(56, height - 29, '↑ ↓  ESCOLHER     ENTER  CONFIRMAR     A ARCADE · V PVP · T TREINO · B BÁSICO · O COMBOS · C OPÇÕES', 11, '#a899a3');
    } else if (this.page === 'fighter') {
      this.text(56, 117, 'QUEM ENTRA NA LUTA?', 23);
      this.text(56, 149, 'Somente P1 escolhe. O adversário de P2 é definido pelo modo.', 12, '#b8aab2');
      const gap = 18, w = (width - 112 - gap * (this.fighters.length - 1)) / this.fighters.length;
      this.fighters.forEach((fighter, i) => {
        const x = 56 + i * (w + gap), selected = i === this.fighterIndex;
        const card = this.box(x, 181, w, 291, selected ? 0x3a2532 : 0x1a1a23, .97).setStrokeStyle(2, selected ? 0xda7580 : 0x4a3946).setInteractive({ useHandCursor: true });
        this.text(x + 18, 196, fighter.name.toUpperCase(), 23, selected ? '#ffe5b3' : '#f0e5e7');
        this.text(x + 18, 226, STYLES[fighter.id] ?? '', 11, '#bdacb6');
        this.preview(fighter, x + w / 2, 444, 1.04);
        card.on('pointerover', () => card.setStrokeStyle(2, 0xda7580)).on('pointerout', () => card.setStrokeStyle(2, selected ? 0xda7580 : 0x4a3946)).on('pointerdown', () => { this.fighterIndex = i; this.render(); });
      });
      const opponent = opponentFor(this.fighters[this.fighterIndex].id, this.mode);
      this.text(56, 490, `${this.mode === 'arcade' ? 'PRIMEIRO ADVERSÁRIO' : 'P2'} · ${opponent.name.toUpperCase()}${this.mode === 'arcade' ? ' · COMPUTADOR' : this.mode === 'training' || this.mode === 'tutorial' || this.mode === 'combo-tutorial' ? ' · ADVERSÁRIO DE TREINO' : ' · SEGUNDO JOGADOR'}`, 12, '#d4b47d');
      this.button(width - 282, 488, 226, 'CONFIRMAR PERSONAGEM', () => { this.page = 'stage'; this.render(); });
      this.text(56, height - 25, '← →  ESCOLHER     ENTER  CONFIRMAR     ESC  VOLTAR', 11, '#a899a3');
    } else if (this.page === 'stage') {
      this.text(56, 119, 'ONDE VAMOS LUTAR?', 23);
      const x = 160, y = 168, w = 704, scale = w / defaultStage.referenceSize.width;
      this.box(x - 2, y - 2, w + 4, 303, 0x72515c);
      for (const layer of [...defaultStage.layers].sort((a, b) => a.depth - b.depth)) {
        const content = layer.contentScale ?? 1, origin = layer.scaleOrigin ?? { x: 0, y: 0 };
        const image = this.add.image(x + scale * (layer.x + origin.x * (1 - content)), y + scale * (layer.y + origin.y * (1 - content)), stageTextureKey(defaultStage, layer)).setOrigin(0).setScale(scale * content); root.add(image);
      }
      this.box(x, y + 245, w, 54, 0x101019, .90);
      this.text(x + 20, y + 258, 'CAIS', 23, '#f3d49e');
      this.text(x + w - 20, y + 267, 'CENÁRIO SELECIONADO', 11, '#c4b8c0').setOrigin(1, 0);
      this.text(160, 490, `${this.fighters[this.fighterIndex].name.toUpperCase()} · ${MODES.find(m => m.id === this.mode)!.title}`, 14, '#d4b47d');
      this.button(630, 486, 234, 'COMEÇAR LUTA', () => this.startFight());
      this.text(56, height - 25, 'ENTER  COMEÇAR     ESC  VOLTAR', 11, '#a899a3');
    } else {
      this.text(56, 144, 'CONFIGURAÇÕES', 26);
      this.text(56, 204, 'Configure as teclas no painel de controles.', 18, '#c4b8c0');
      this.button(56, 288, 180, 'VOLTAR', () => this.back());
      this.text(56, height - 25, 'ESC  VOLTAR AO MENU', 11, '#a899a3');
    }
  }
  private chooseMode(index: number): void {
    this.modeIndex = index; const id = MODES[index].id;
    if (id === 'settings') { this.page = 'settings'; new ControlSettings(() => { this.page = 'home'; this.render(); }); } else { this.mode = id; this.page = 'fighter'; if (id === 'tutorial' || id === 'combo-tutorial') this.fighterIndex = 0; } this.render();
  }
  private back(): void {
    this.page = this.page === 'stage' ? 'fighter' : 'home'; this.render();
  }
  private startFight(): void {
    if (this.transitioning) return; this.transitioning = true;
    const fighter = this.fighters[this.fighterIndex];
    this.scene.start('FightScene', { fighterId: fighter.id, opponentId: opponentFor(fighter.id, this.mode).id, stageId: defaultStage.id, mode: this.mode, arcadeIndex: 0 });
  }
}
