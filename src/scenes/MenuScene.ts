import { LOGICAL_VIEW, configureUiCamera, sharpenSceneText } from '../rendering/presentation';
import { prepareShotoSprites, preloadShotoSprites, shotoSpriteManifest } from '../rendering/animations/shotoSprites';
import { getTimedAnimationFrame } from '../rendering/animations/AnimationPlayback';

import menuBackground from '../../assets/art/menu/patio-solar.png';

import { ControlSettings } from '../ui/ControlSettings';
import Phaser from 'phaser';
import { playableCharacters } from '../engine/data/characters';
import type { CharacterDefinition } from '../engine/data/characters';
import { defaultStage, stageTextureKey } from '../rendering/stages/stageCatalog';
import { preloadStage } from '../rendering/stages/StageView';
import { opponentFor, isTrainingMode, type MatchMode } from './matchSetup';

const MODES = [
  { id: 'arcade', title: 'ARCADE', hint: 'Enfrente o Shoto controlado pelo computador.', tag: '1 JOGADOR' },
  { id: 'versus', title: 'LUTA PVP', hint: 'Dois jogadores no mesmo teclado.', tag: '2 JOGADORES' },
  { id: 'training', title: 'MODO TREINO', hint: 'Pratique comandos, alcances e punições.', tag: 'PRÁTICA LIVRE' },
  { id: 'tutorial', title: 'TUTORIAL BÁSICO', hint: 'Aprenda movimento, quatro básicos e defesa.', tag: 'PASSO A PASSO' },
  { id: 'combo-tutorial', title: 'TUTORIAL DE COMBOS', hint: 'Pratique as sequências manuais do personagem.', tag: 'COMBOS' },
  { id: 'settings', title: 'CONFIGURAÇÕES', hint: 'Teclas e controles dos dois jogadores.', tag: 'OPÇÕES' },
] as const;
const STYLES: Record<string, string> = { shoto: 'Anfitrião · Golpes, especiais e combos manuais' };

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
      } else if (key === 'Enter') { this.confirmFighter(); }
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
    configureUiCamera(this.cameras.main, this.scale);
    this.loading = this.add.text(LOGICAL_VIEW.width / 2, LOGICAL_VIEW.height / 2, 'PREPARANDO A ARENA…', { fontSize: '18px', color: '#e6c78d' }).setOrigin(.5);
    this.load.image('menu-solar', menuBackground);
    preloadStage(this, defaultStage);
    preloadShotoSprites(this);
  }
  create(): void {
    prepareShotoSprites(this);
    this.loading?.destroy(); this.loading = undefined;
    const { width, height } = LOGICAL_VIEW;
    // Overscan keeps the slow camera drift inside the illustration at every phase.
    this.textures.get('menu-solar').setFilter(Phaser.Textures.FilterMode.LINEAR);
    const background = this.add.image(width / 2, height / 2, 'menu-solar');
    const cover = Math.max(width / background.width, height / background.height) * 1.045;
    background.setScale(cover);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
    this.add.rectangle(width / 2, height - 18, width, 36, 0x111016, .82);
    this.add.rectangle(35, 49, 4, 46, 0xdab275);
    this.add.text(55, 22, 'CLOSE COMBAT', { fontSize: '34px', fontStyle: 'bold', color: '#fff0d2', fontFamily: 'Georgia, serif', stroke: '#151017', strokeThickness: 2 });
    this.add.text(57, 65, 'ESCOLHA SUA LUTA', { fontSize: '10px', color: '#ddbd91', letterSpacing: 4 });
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
    const text = this.add.text(x, y, label, { fontSize: `${size}px`, fontFamily: size >= 16 ? 'Georgia, serif' : 'Arial, sans-serif', color }); this.root!.add(text); return text;
  }
  private box(x: number, y: number, w: number, h: number, color: number, alpha = 1) {
    const box = this.add.rectangle(x, y, w, h, color, alpha).setOrigin(0); this.root!.add(box); return box;
  }
  private button(x: number, y: number, w: number, label: string, action: () => void) {
    const rect = this.box(x, y, w, 42, 0x843e35).setInteractive({ useHandCursor: true });
    this.text(x + w / 2, y + 12, label, 14).setOrigin(.5, 0);
    rect.on('pointerover', () => rect.setFillStyle(0xa85440)).on('pointerout', () => rect.setFillStyle(0x843e35)).on('pointerdown', action);
  }
  private preview(fighter: CharacterDefinition, x: number, y: number, zoom: number) {
    if (fighter.id === 'shoto' && this.textures.exists('shoto-idle')) {
      this.textures.get('shoto-idle').setFilter(Phaser.Textures.FilterMode.LINEAR);
      const sprite = this.add.image(x, y, 'shoto-idle', '0').setOrigin(.5, 720 / 768).setScale(shotoSpriteManifest.displaySize!.height / shotoSpriteManifest.frameSize.height * zoom);
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
    const { width, height } = LOGICAL_VIEW;
    const titles = { home: '01 / MODOS', fighter: '02 / PERSONAGEM', stage: '03 / CENÁRIO', settings: 'CONFIGURAÇÕES' };
    this.text(width - 42, 40, titles[this.page], 13, '#fff0d2').setStroke('#171219', 3).setOrigin(1, 0);
    if (this.page === 'home') {
      this.text(56, 112, 'COMO VOCÊ QUER JOGAR?', 19, '#ebd3ac');
      MODES.forEach((mode, i) => {
        const y = 148 + i * 58, selected = this.modeIndex === i;
        const card = this.box(56, y, 510, 52, selected ? 0x763d32 : 0x17151b, selected ? .96 : .86).setStrokeStyle(1, selected ? 0xe5b877 : 0x78604d).setInteractive({ useHandCursor: true });
        if (selected) this.box(56, y, 4, 52, 0xf0c68a);
        this.text(75, y + 7, mode.title, 18, selected ? '#fff1d8' : '#f4e4ce');
        this.text(75, y + 30, mode.hint, 12, '#d4c2ae');
        this.text(550, y + 12, mode.tag, 9, '#d4b47d').setOrigin(1, 0);
        card.on('pointerover', () => card.setStrokeStyle(1, 0xf0c68a)).on('pointerout', () => card.setStrokeStyle(1, selected ? 0xe5b877 : 0x78604d)).on('pointerdown', () => this.chooseMode(i));
      });
      this.text(56, height - 29, '↑ ↓  ESCOLHER     ENTER  CONFIRMAR     A ARCADE · V PVP · T TREINO · B BÁSICO · O COMBOS · C OPÇÕES', 11, '#d3bea3');
    } else if (this.page === 'fighter') {
      this.text(56, 117, 'QUEM ENTRA NA LUTA?', 23);
      this.text(56, 149, 'Somente P1 escolhe. O adversário de P2 é definido pelo modo.', 12, '#d4c2ae');
      const gap = 18, w = (width - 112 - gap * (this.fighters.length - 1)) / this.fighters.length;
      this.fighters.forEach((fighter, i) => {
        const x = 56 + i * (w + gap), selected = i === this.fighterIndex;
        const card = this.box(x, 181, w, 291, selected ? 0x44302b : 0x17151b, .97).setStrokeStyle(2, selected ? 0xe5b877 : 0x78604d).setInteractive({ useHandCursor: true });
        this.text(x + 18, 196, fighter.name.toUpperCase(), 23, selected ? '#ffe5b3' : '#f4e4ce');
        this.text(x + 18, 226, STYLES[fighter.id] ?? '', 11, '#bdacb6');
        this.preview(fighter, x + w / 2, 444, 1.6);
        card.on('pointerover', () => card.setStrokeStyle(2, 0xe5b877)).on('pointerout', () => card.setStrokeStyle(2, selected ? 0xe5b877 : 0x78604d)).on('pointerdown', () => { this.fighterIndex = i; this.render(); });
      });
      const opponent = opponentFor(this.fighters[this.fighterIndex].id, this.mode);
      this.text(56, 490, `${this.mode === 'arcade' ? 'PRIMEIRO ADVERSÁRIO' : 'P2'} · ${opponent.name.toUpperCase()}${this.mode === 'arcade' ? ' · COMPUTADOR' : this.mode === 'training' || this.mode === 'tutorial' || this.mode === 'combo-tutorial' ? ' · ADVERSÁRIO DE TREINO' : ' · SEGUNDO JOGADOR'}`, 12, '#d4b47d');
      this.button(width - 282, 488, 226, 'CONFIRMAR PERSONAGEM', () => this.confirmFighter());
      this.text(56, height - 25, '← →  ESCOLHER     ENTER  CONFIRMAR     ESC  VOLTAR', 11, '#d3bea3');
    } else if (this.page === 'stage') {
      this.text(56, 119, 'ONDE VAMOS LUTAR?', 23);
      const x = 212, y = 168, w = 600;
      const scale = Math.min(w / defaultStage.referenceSize.width, 300 / defaultStage.referenceSize.height);
      const imageX = x + (w - defaultStage.referenceSize.width * scale) / 2;
      this.box(x - 2, y - 2, w + 4, 303, 0xa88859);
      for (const layer of [...defaultStage.layers].sort((a, b) => a.depth - b.depth)) {
        const content = layer.contentScale ?? 1, origin = layer.scaleOrigin ?? { x: 0, y: 0 };
        const image = this.add.image(imageX + scale * (layer.x + origin.x * (1 - content)), y + scale * (layer.y + origin.y * (1 - content)), stageTextureKey(defaultStage, layer)).setOrigin(0).setScale(scale * content); root.add(image);
      }
      this.box(x, y + 245, w, 54, 0x101019, .90);
      this.text(x + 20, y + 258, defaultStage.name.toUpperCase(), 23, '#f3d49e');
      this.text(x + w - 20, y + 267, 'CENÁRIO SELECIONADO', 11, '#c4b8c0').setOrigin(1, 0);
      this.text(160, 490, `${this.fighters[this.fighterIndex].name.toUpperCase()} · ${MODES.find(m => m.id === this.mode)!.title}`, 14, '#d4b47d');
      this.button(630, 486, 234, 'COMEÇAR LUTA', () => this.startFight());
      this.text(56, height - 25, 'ENTER  COMEÇAR     ESC  VOLTAR', 11, '#d3bea3');
    } else {
      this.text(56, 144, 'CONFIGURAÇÕES', 26);
      this.text(56, 204, 'Configure as teclas no painel de controles.', 18, '#c4b8c0');
      this.button(56, 288, 180, 'VOLTAR', () => this.back());
      this.text(56, height - 25, 'ESC  VOLTAR AO MENU', 11, '#d3bea3');
    }
    sharpenSceneText(this);
  }
  private chooseMode(index: number): void {
    this.modeIndex = index; const id = MODES[index].id;
    if (id === 'settings') { this.page = 'settings'; new ControlSettings(() => { this.page = 'home'; this.render(); }); } else { this.mode = id; this.page = 'fighter'; if (id === 'tutorial' || id === 'combo-tutorial') this.fighterIndex = 0; } this.render();
  }
  private back(): void {
    this.page = this.page === 'stage' ? 'fighter' : 'home'; this.render();
  }
  private confirmFighter(): void {
    if (isTrainingMode(this.mode)) this.startFight();
    else { this.page = 'stage'; this.render(); }
  }
  private startFight(): void {
    if (this.transitioning) return; this.transitioning = true;
    const fighter = this.fighters[this.fighterIndex];
    this.scene.start('FightScene', { fighterId: fighter.id, opponentId: opponentFor(fighter.id, this.mode).id, stageId: defaultStage.id, mode: this.mode, arcadeIndex: 0 });
  }
}
