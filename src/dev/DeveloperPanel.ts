import type Phaser from 'phaser';
import { characters, playableCharacters, type CharacterDefinition, type ComboRecipe } from '../engine/data/characters';
import { FighterSelection } from '../ui/FighterSelection';
import { renderFighterSelection } from '../ui/FighterSelectionView';
import { t } from '../i18n/i18n';
import { attackDurationFrames } from '../engine/combat/frameData';
import { stages } from '../rendering/stages/stageCatalog';
import { autoSpriteScale, type SheetMeasurements, type SpriteCalibration } from '../rendering/animations/spriteScale';
import { texasDisplayHeight, texasFootAnchor, getTexasFrameSize } from '../rendering/animations/texasSprites';
import { getShotoResolution, SHOTO_FRAME, shotoIdleScale, shotoIdleTexture, shotoSpriteScale } from '../rendering/animations/shotoSprites';
import { ALTERNATIVE_KINDS, alternativeArt, arcadeFrame, fighterArt, frameStyle, heroFrame, tileFrame, withAlternative, type AlternativeArtKind, type AlternativeFraming, type FighterArt, type IconWindow, type SelectionFrame, type VictoryFrame } from '../ui/fighterArt';
import { preloadAllMatchAssets } from '../rendering/matchAssets';
import { VictoryScreen } from '../ui/VictoryScreen';
import { applyContactFrames, contactFrameCut, contactFrameMargin, contactFrameSize, isContactSheet, type FrameCut } from '../rendering/contactEffects';
import { addAlternatives, discardAddition, gameImages, markRemoval, pendingAdditions, pendingRemovals, replaceImage, replacedImages, restoreImage, takePendingAlternatives } from './assetOverrides';
import { CSS_COLORS, HUD_COLORS, MOVE_FIELDS, RECIPE_FIELDS, SELECTION_FIELDS, type DevOverrides, type MoveTuning, type RecipeTuning, type SelectionTuning } from './devOverrides';
import { IMAGE_SECTIONS, imageFolder, textureFolder } from './imageCatalog';
import { devTuning } from './devTools';
import { gamepads } from '../input/GamepadHub';
import './developer.css';

const TABS = [['endings', 'Finais'], ['sprites', 'Sprites'], ['moves', 'Golpes'], ['combos', 'Combos'], ['colors', 'Cores'], ['selection', 'Seleção'], ['alternatives', 'Alternativas'], ['images', 'Imagens']] as const;
/** Areas of the panel that scroll, kept in place when an edit re-renders the same tab. */
const SCROLLED = '.developer-page, .developer-list, .developer-viewer, .developer-scroll';
type Tab = typeof TABS[number][0];
const FIELD_LABELS: Record<keyof MoveTuning, string> = {
  startup: 'Preparação', activeFrames: 'Ativo', recovery: 'Recuperação', damage: 'Dano', hitstun: 'Hitstun', blockstun: 'Blockstun',
  pushbackHit: 'Recuo acerto', pushbackBlock: 'Recuo defesa',
};
const RESULT_SPRITES = /victory|defeat|taunt|ippon|exit/;
const ALTERNATIVE_LABELS: Record<AlternativeArtKind, string> = { 'victory-poses': 'Poses de vitória', 'selection-backgrounds': 'Artes de seleção', 'selection-icons': 'Ícones' };
const IMAGE_LIMIT = 60;
const INTERNAL_TEXTURES = new Set(['__DEFAULT', '__MISSING', '__WHITE', '__NORMAL']);
/** Display names of the character and stage folders. */
const FOLDER_LABELS: Readonly<Record<string, string>> = {
  ...Object.fromEntries(stages.map(stage => [stage.id, stage.name])),
  ...Object.fromEntries(Object.entries(fighterArt).map(([id, art]) => [id, art.name])),
  random: 'Aleatório',
};
const CHARACTER_IDS = characters.map(fighter => fighter.id);
type Entry = { folder: string[]; label: string; id: string };
const sheetData = import.meta.glob<SheetMeasurements | SpriteCalibration>('../assets/sprites/characters/*/{measurements,calibration}.json', { eager: true, import: 'default' });
/**
 * What the engine needs to size each fighter's animations: measurements, validated scales and, per texture, the
 * game pixels per source pixel and the feet line of a frame (as `CombatantView` applies them).
 */
type Sizing = { measurements: SheetMeasurements; calibration: SpriteCalibration; pixelScale: (key: string) => number; footAnchor: (key: string) => number };
const fighterSizing = (id: string, pixelScale: Sizing['pixelScale'], footAnchor: Sizing['footAnchor']): Sizing => ({
  measurements: sheetData[`../assets/sprites/characters/${id}/measurements.json`] as SheetMeasurements,
  calibration: sheetData[`../assets/sprites/characters/${id}/calibration.json`] as SpriteCalibration, pixelScale, footAnchor,
});
const SIZING: Readonly<Record<string, Sizing>> = {
  texas: fighterSizing('texas', key => texasDisplayHeight / getTexasFrameSize(key), () => texasFootAnchor),
  shoto: fighterSizing('shoto', key => (key === shotoIdleTexture ? shotoIdleScale : shotoSpriteScale) / getShotoResolution(key),
    key => key === shotoIdleTexture ? 670 / 724 : 900 / SHOTO_FRAME),
};
const REFERENCE_SHEETS = ['idle-normal', 'idle'];
const SPRITE_FPS = 12;

/**
 * Developer tools, loaded only in development builds: endings, sprite playback, move and combo tuning, colours and
 * image replacement. Tuning lives in local storage (images in IndexedDB) and is applied over the authored data.
 */
export class DeveloperPanel {
  private readonly root = el('section', 'developer-panel');
  private readonly status = el('p', 'developer-status');
  private tab: Tab = 'endings';
  private fighterId = characters[0].id;
  private stageId = stages[0].id;
  private spriteFilter = '';
  private spritePath: string[] = [];
  private spriteKey?: string;
  private spriteFrame = 0;
  private spriteFps = SPRITE_FPS;
  private spritePlaying = true;
  private spriteFlip = false;
  private spriteTimer?: number;
  private renderedTab?: Tab;
  private artId = Object.keys(fighterArt)[0];
  /** Whether the selection previews show the screen's title, names and buttons over the art. */
  private selectionOverlay = true;
  private imageFilter = '';
  private imagePath: string[] = [];
  private alternativeKind: AlternativeArtKind = 'victory-poses';
  /** Alternative image whose framings are shown (the first of the kind when unset or gone). */
  private alternativeFile?: string;
  /** Recipe whose card shows the edit form. */
  private comboEditing?: string;
  private preview?: VictoryScreen;
  private readonly previousFocus = document.activeElement as HTMLElement | null;
  private readonly releasePad: () => void;
  private readonly onKey = (event: KeyboardEvent): void => {
    // Game shortcuts never see keys typed into the panel.
    event.stopImmediatePropagation();
    if (saving) { event.preventDefault(); return; }
    if (event.code !== 'Escape') return;
    event.preventDefault();
    if (this.preview) this.closePreview(); else this.destroy();
  };

  constructor(private readonly scene: Phaser.Scene, private readonly close: () => void, private readonly changed: () => void = () => undefined) {
    this.root.setAttribute('role', 'dialog'); this.root.setAttribute('aria-modal', 'true'); this.root.setAttribute('aria-label', 'Modo desenvolvedor');
    this.status.setAttribute('role', 'status');
    document.body.append(this.root);
    window.addEventListener('keydown', this.onKey, true);
    // Controllers are not supported here: holding them keeps their presses from reaching the screen underneath.
    this.releasePad = gamepads.subscribe(() => undefined);
    this.render();
    // Matches keep only their own fighters and stage: the sprite browser loads the rest while it is open.
    preloadAllMatchAssets(scene);
    if (scene.load.list.size) { scene.load.once('complete', () => { if (this.root.isConnected) this.render(); }); scene.load.start(); }
  }

  private render(): void {
    window.clearInterval(this.spriteTimer); this.spriteTimer = undefined;
    const panel = el('div', 'developer-card');
    const tabs = el('nav', 'developer-tabs'); tabs.setAttribute('role', 'tablist');
    for (const [id, label] of TABS) {
      const tab = button(label, () => { this.tab = id; this.status.textContent = ''; this.render(); });
      tab.setAttribute('role', 'tab'); tab.setAttribute('aria-selected', String(id === this.tab)); tabs.append(tab);
    }
    const header = el('header', 'developer-header'); header.append(el('h1', '', 'Modo desenvolvedor'), tabs);
    const page = el('div', 'developer-page');
    ({ endings: () => this.endings(page), sprites: () => this.sprites(page), moves: () => this.moves(page),
      combos: () => this.combos(page), colors: () => this.colors(page), selection: () => this.selection(page), alternatives: () => this.alternatives(page), images: () => this.images(page) })[this.tab]();
    const footer = el('footer', 'developer-footer');
    footer.append(this.saveAll(), button('Exportar ajustes (JSON)', () => this.export()), button('Fechar', () => this.destroy()));
    panel.append(header, page, this.status, footer);
    // Re-rendering after an edit keeps every scrolled area where it was; a new tab starts at the top.
    const scrolled = (root: ParentNode) => [...root.querySelectorAll<HTMLElement>(SCROLLED)];
    const positions = this.tab === this.renderedTab ? scrolled(this.root).map(node => [node.scrollTop, node.scrollLeft]) : [];
    this.root.replaceChildren(panel); this.renderedTab = this.tab;
    scrolled(panel).forEach((node, index) => { if (positions[index]) [node.scrollTop, node.scrollLeft] = positions[index]; });
    this.root.querySelector<HTMLElement>('[aria-selected="true"]')?.focus({ preventScroll: true });
  }

  private fighterPicker(page: HTMLElement): void {
    page.append(choice('Personagem', characters.map(fighter => [fighter.id, fighter.name]), this.fighterId, id => { this.fighterId = id; this.comboEditing = undefined; this.render(); }));
  }
  private get fighter(): CharacterDefinition { return characters.find(fighter => fighter.id === this.fighterId) ?? characters[0]; }

  /** Champion screens for every fighter with art, and a shortcut to the result poses of the playable ones. */
  private endings(page: HTMLElement): void {
    page.append(choice('Cenário', stages.map(stage => [stage.id, stage.name]), this.stageId, id => { this.stageId = id; }));
    const grid = el('div', 'developer-endings');
    for (const [id, art] of Object.entries(fighterArt)) {
      const card = el('article', 'developer-ending');
      const image = el('img'); image.src = art.icon; image.alt = '';
      const actions = el('div', 'developer-row');
      actions.append(button('Tela de vencedor', () => this.showEnding(id, art.name)));
      if (characters.some(fighter => fighter.id === id)) actions.append(button('Poses de resultado', () => {
        const folder = ['Personagens', FOLDER_LABELS[id], 'Sprites'];
        this.tab = 'sprites'; this.spriteFilter = ''; this.spritePath = folder;
        this.spriteKey = this.textures().find(entry => String(entry.folder) === String(folder) && RESULT_SPRITES.test(entry.id))?.id; this.render();
      }));
      card.append(image, el('h2', '', art.name), actions); grid.append(card);
    }
    page.append(grid, el('p', 'developer-hint', 'Esc ou clique fecham a tela de vencedor.'));
  }
  private showEnding(fighterId: string, name: string, art?: FighterArt): void {
    const stage = stages.find(entry => entry.id === this.stageId) ?? stages[0];
    this.root.hidden = true;
    this.preview = new VictoryScreen(this.scene.game.canvas, stage, fighterId, name, undefined, undefined, art);
    // The selection tab shows a miniature of the same screen (`.inline`): the click belongs to the full one.
    document.querySelector('.victory-screen:not(.inline)')?.addEventListener('click', () => this.closePreview(), { once: true });
  }
  private closePreview(): void { this.preview?.destroy(); this.preview = undefined; this.root.hidden = false; this.root.querySelector('button')?.focus(); }

  /**
   * Folder browser shared by the sprite and image tabs: breadcrumb and subfolders (with counts) of the open folder,
   * returning its own entries; a search lists every match instead, wherever it is.
   */
  private browse(page: HTMLElement, entries: readonly Entry[], path: string[], open: (path: string[]) => void, term: string): Entry[] {
    const inside = (entry: Entry) => path.every((part, index) => entry.folder[index] === part);
    if (term) return entries.filter(entry => `${entry.folder.join('/')}/${entry.id}`.toLowerCase().includes(term.toLowerCase()));
    const crumbs = el('nav', 'developer-crumbs'); crumbs.setAttribute('aria-label', 'Pasta');
    ['Tudo', ...path].forEach((part, depth) => {
      const crumb = button(part, () => open(path.slice(0, depth))); crumb.setAttribute('aria-current', String(depth === path.length)); crumbs.append(crumb);
    });
    const counts = new Map<string, number>();
    for (const entry of entries) if (inside(entry) && entry.folder.length > path.length) counts.set(entry.folder[path.length], (counts.get(entry.folder[path.length]) ?? 0) + 1);
    const order = (name: string) => path.length ? 0 : IMAGE_SECTIONS.indexOf(name as typeof IMAGE_SECTIONS[number]);
    const folders = el('div', 'developer-folders');
    for (const name of [...counts.keys()].sort((a, b) => order(a) - order(b) || a.localeCompare(b)))
      folders.append(button(`📁 ${name} · ${counts.get(name)}`, () => open([...path, name])));
    page.append(crumbs, folders);
    return entries.filter(entry => inside(entry) && entry.folder.length === path.length);
  }
  /** Search field that keeps the caret after the page is rebuilt for each keystroke. */
  private searchBox(value: string, placeholder: string, change: (value: string) => void): HTMLInputElement {
    const search = input('search', value, placeholder);
    search.oninput = () => {
      change(search.value); this.render();
      const next = this.root.querySelector<HTMLInputElement>('input[type="search"]');
      next?.focus(); next?.setSelectionRange(next.value.length, next.value.length);
    };
    return search;
  }
  private textures(): Entry[] {
    return this.scene.textures.getTextureKeys().filter(key => !INTERNAL_TEXTURES.has(key)).sort().map(key => ({
      id: key, folder: textureFolder(key, FOLDER_LABELS, CHARACTER_IDS),
      label: key.replace(/^(presentation|stage):[^:]+:/, '').replace(new RegExp(`^(${CHARACTER_IDS.join('|')})-`), ''),
    }));
  }
  /** Plays any loaded texture frame by frame, at an adjustable rate. */
  private sprites(page: HTMLElement): void {
    const search = this.searchBox(this.spriteFilter, 'Buscar em todas as pastas (ex.: victory, ready, hit)', value => { this.spriteFilter = value; });
    const list = el('div', 'developer-list');
    list.append(search);
    const shown = this.browse(list, this.textures(), this.spritePath, path => { this.spritePath = path; this.render(); }, this.spriteFilter);
    if (!this.spriteKey && shown.length) this.spriteKey = shown[0].id;
    for (const texture of shown) {
      const entry = button(this.spriteFilter ? texture.id : texture.label, () => { this.spriteKey = texture.id; this.spriteFrame = 0; this.spritePlaying = true; this.render(); });
      entry.setAttribute('aria-pressed', String(texture.id === this.spriteKey)); list.append(entry);
    }
    const viewer = el('div', 'developer-viewer');
    const canvas = el('canvas', 'developer-preview'); canvas.width = 360; canvas.height = 360;
    const info = el('p', 'developer-hint');
    const frames = this.spriteKey ? this.frameNames(this.spriteKey) : [];
    const sheet = this.spriteKey ? this.characterSheet(this.spriteKey) : undefined;
    const cuts = this.spriteKey && isContactSheet(this.spriteKey) ? this.frameCutControls(this.spriteKey, () => draw()) : undefined;
    const draw = () => {
      const context = canvas.getContext('2d');
      if (!context || !this.spriteKey || !frames.length) { info.textContent = 'Nenhuma textura.'; return; }
      this.spriteFrame = (this.spriteFrame + frames.length) % frames.length;
      const frame = this.scene.textures.getFrame(this.spriteKey, frames[this.spriteFrame]);
      context.clearRect(0, 0, canvas.width, canvas.height);
      const label = `${this.spriteKey} · quadro ${frames[this.spriteFrame]} (${this.spriteFrame + 1}/${frames.length}) · ${frame.realWidth}×${frame.realHeight}`;
      if (!sheet) {
        // Recut sheets show their fixed frame as an outline, so a drawing that overflows it stands out.
        const scale = Math.min(canvas.width / frame.realWidth, canvas.height / frame.realHeight) * (cuts ? .7 : 1);
        const top = (canvas.height - frame.realHeight * scale) / 2;
        this.drawFrame(context, frame, frame.realHeight * scale, top + frame.realHeight * scale, 1);
        if (cuts) {
          context.strokeStyle = '#efe4cc88'; context.setLineDash([6, 4]);
          const left = (canvas.width - frame.realWidth * scale) / 2;
          context.strokeRect(left, top, frame.realWidth * scale, frame.realHeight * scale);
          // The cut, outlined as in the sheet overview, where it sits inside the frame.
          context.setLineDash([]); context.strokeStyle = '#e23a1c'; context.lineWidth = 2;
          context.strokeRect(left + frame.x * scale, top + frame.y * scale, frame.cutWidth * scale, frame.cutHeight * scale);
          context.lineWidth = 1; cuts.show(this.spriteFrame);
        }
        info.textContent = label; return;
      }
      // Game proportions: the idle's first drawing at its automatic size as a faint outline behind, on the same feet line.
      // Frames are sized in game pixels, so sheets drawn on different frame grids (Bob's legacy idle) compare as in the game.
      const scale = sheet.scale(sheet.name, this.spriteFrame), reference = this.scene.textures.getFrame(sheet.referenceKey, this.frameNames(sheet.referenceKey)[0]);
      const referenceScale = sheet.scale(sheet.reference, 0) / (sheet.reference === sheet.name ? sheet.adjustment : 1);
      const referenceBox = reference.realHeight * sheet.pixelScale(sheet.referenceKey) * referenceScale;
      const unit = canvas.height * .7 / (sheet.referenceHeight * referenceBox), feet = canvas.height * .95;
      this.drawFrame(context, reference, unit * referenceBox, feet, .28, sheet.footAnchor(sheet.referenceKey));
      this.drawFrame(context, frame, unit * frame.realHeight * sheet.pixelScale(this.spriteKey) * scale, feet, 1, sheet.footAnchor(this.spriteKey));
      info.textContent = `${label} · escala ×${scale.toFixed(3)} (automática ×${(scale / sheet.adjustment).toFixed(3)})`;
    };
    const step = (delta: number) => { this.spritePlaying = false; play.textContent = 'Executar'; this.spriteFrame += delta; draw(); };
    const play = button(this.spritePlaying ? 'Pausar' : 'Executar', () => { this.spritePlaying = !this.spritePlaying; this.render(); });
    const fps = number(this.spriteFps, value => { this.spriteFps = Math.max(1, Math.min(60, value ?? SPRITE_FPS)); this.render(); });
    const flip = button(this.spriteFlip ? 'Virado ←' : 'Virado →', () => { this.spriteFlip = !this.spriteFlip; draw(); flip.textContent = this.spriteFlip ? 'Virado ←' : 'Virado →'; });
    const controls = el('div', 'developer-row');
    controls.append(button('◀ Quadro', () => step(-1)), play, button('Quadro ▶', () => step(1)), labelled('Quadros/s', fps), flip);
    viewer.append(canvas, info, controls);
    if (sheet) viewer.append(this.sizeControls(sheet.fighter, sheet.name, sheet.adjustment));
    const actions = el('div', 'developer-row');
    if (cuts) { viewer.append(cuts.element); actions.append(this.saveToCode('cortes', ['frameCuts', 'frameSizes'], '/__dev/overrides')); }
    if (sheet) actions.append(this.saveToCode('tamanhos', ['spriteScales'], '/__dev/sprite-scales'));
    viewer.append(actions); actions.append(this.spriteReset());
    const layout = el('div', 'developer-split'); layout.append(list, viewer);
    page.append(layout);
    draw();
    if (this.spritePlaying && frames.length > 1) this.spriteTimer = window.setInterval(() => { this.spriteFrame += 1; draw(); }, 1000 / this.spriteFps);
  }
  /** A fighter's body sheet, with the scale the engine gives each of its frames and the idle it is compared with. */
  private characterSheet(key: string) {
    const fighter = CHARACTER_IDS.find(id => key.startsWith(`${id}-`)), sizing = fighter && SIZING[fighter];
    const name = fighter && key.slice(fighter.length + 1), definition = characters.find(entry => entry.id === fighter);
    if (!sizing || !name || !definition || !sizing.measurements[name]) return undefined;
    const reference = REFERENCE_SHEETS.find(sheet => sizing.measurements[sheet] && this.scene.textures.exists(`${fighter}-${sheet}`))!;
    return {
      fighter, name, reference, referenceKey: `${fighter}-${reference}`, pixelScale: sizing.pixelScale, footAnchor: sizing.footAnchor,
      referenceHeight: sizing.measurements[reference].maxHeight,
      adjustment: devTuning.overrides.spriteScales[`${fighter}:${name}`] ?? 1,
      scale: (sheet: string, frame: number) => autoSpriteScale(definition, sizing.measurements, sheet, frame, sizing.calibration),
    };
  }
  /**
   * Cut of the shown frame in the sheet and its place inside the fixed frame, beside the whole sheet with the cut
   * outlined. Editing pauses on that frame and applies at once in the game; `redraw` repaints the preview while dragging.
   */
  private frameCutControls(key: string, redraw: () => void): { element: HTMLElement; show: (frame: number) => void } {
    const image = this.scene.textures.get(key).getSourceImage() as HTMLImageElement;
    const overview = el('canvas'); overview.width = 360; overview.height = Math.round(360 * image.height / image.width);
    const fields = [['x', 'Corte X'], ['y', 'Corte Y'], ['width', 'Largura'], ['height', 'Altura'], ['left', 'Posição X'], ['top', 'Posição Y']] as const;
    const inputs = fields.map(([field]) => {
      const editor = input('number', ''); editor.step = '1';
      editor.onchange = () => {
        if (editor.value === '') return;
        this.spritePlaying = false;
        // Positions are typed against the dashed frame but kept against the grid frame, so resizing the frame moves no drawing.
        const value = Math.round(Number(editor.value)) - (field === 'left' ? margin.x : field === 'top' ? margin.y : 0);
        devTuning.setFrameCut(key, this.spriteFrame, { ...contactFrameCut(key, this.spriteFrame), [field]: value });
        applyContactFrames(this.scene.textures, key); this.changed(); this.render();
      };
      return editor;
    });
    const margin = contactFrameMargin(key), size = contactFrameSize(key);
    const row = el('div', 'developer-row');
    const restore = button('Restaurar quadro', () => {
      devTuning.setFrameCut(key, this.spriteFrame, undefined); applyContactFrames(this.scene.textures, key); this.changed(); this.render();
    });
    row.append(...fields.map(([, label], index) => labelled(label, inputs[index])), restore,
      el('p', 'developer-hint', 'Corte: retângulo vermelho na folha; arraste as bordas para redimensioná-lo sem mover o desenho, ou o interior para deslocá-lo. Posição: canto do corte dentro do quadro tracejado.'));
    // The dashed frame is the same for the whole sheet; it grows around its center and the game compensates its scale.
    const resize = (dimension: 'width' | 'height') => number(size[dimension], value => {
      const next = { ...size, [dimension]: Math.max(1, Math.round(value ?? 0)) };
      devTuning.setFrameSize(key, value ? next : undefined); applyContactFrames(this.scene.textures, key); this.changed(); this.render();
    });
    const sizeRow = el('div', 'developer-row'); sizeRow.classList.toggle('developer-changed', Boolean(devTuning.overrides.frameSizes[key]));
    sizeRow.append(labelled('Largura do quadro', resize('width')), labelled('Altura do quadro', resize('height')),
      button('Restaurar tamanho do quadro', () => { devTuning.setFrameSize(key, undefined); applyContactFrames(this.scene.textures, key); this.changed(); this.render(); }),
      el('p', 'developer-hint', 'Quadro tracejado da folha inteira: cresce a partir do centro para envolver os desenhos, sem mudar o tamanho do efeito no jogo.'));
    // Dragging an edge of the outline resizes the cut and keeps the drawing in place; dragging inside moves the cut.
    overview.onpointerdown = down => {
      const start = contactFrameCut(key, this.spriteFrame), box = overview.getBoundingClientRect(), scale = box.width / image.width;
      const at = (event: PointerEvent) => ({ x: (event.clientX - box.left) / scale, y: (event.clientY - box.top) / scale });
      const origin = at(down), near = (value: number, edge: number) => Math.abs(value - edge) * scale <= 6;
      const within = (value: number, from: number, size: number) => value > from - 6 / scale && value < from + size + 6 / scale;
      if (!within(origin.x, start.x, start.width) || !within(origin.y, start.y, start.height)) return;
      const edges = { left: near(origin.x, start.x), right: near(origin.x, start.x + start.width), top: near(origin.y, start.y), bottom: near(origin.y, start.y + start.height) };
      const move = !Object.values(edges).some(Boolean);
      window.clearInterval(this.spriteTimer); this.spritePlaying = false; overview.setPointerCapture(down.pointerId);
      overview.onpointermove = event => {
        const point = at(event), dx = Math.round(point.x - origin.x), dy = Math.round(point.y - origin.y), cut = { ...start };
        if (move) { cut.x += dx; cut.y += dy; }
        if (edges.left) { const d = Math.min(dx, start.width - 1); cut.x += d; cut.width -= d; cut.left += d; }
        if (edges.top) { const d = Math.min(dy, start.height - 1); cut.y += d; cut.height -= d; cut.top += d; }
        if (edges.right) cut.width = Math.max(1, start.width + dx);
        if (edges.bottom) cut.height = Math.max(1, start.height + dy);
        devTuning.setFrameCut(key, this.spriteFrame, cut); applyContactFrames(this.scene.textures, key); redraw();
      };
      overview.onpointerup = () => { overview.onpointermove = overview.onpointerup = null; this.changed(); this.render(); };
    };
    const element = el('div', 'developer-cuts'); element.append(overview, row, sizeRow);
    const show = (frame: number) => {
      const cut: FrameCut = contactFrameCut(key, frame), scale = overview.width / image.width, context = overview.getContext('2d');
      const shown = { ...cut, left: cut.left + margin.x, top: cut.top + margin.y };
      fields.forEach(([field], index) => { if (document.activeElement !== inputs[index]) inputs[index].value = String(shown[field]); });
      row.classList.toggle('developer-changed', Boolean(devTuning.overrides.frameCuts[key]?.[frame]));
      if (!context) return;
      context.clearRect(0, 0, overview.width, overview.height); context.drawImage(image, 0, 0, overview.width, overview.height);
      context.strokeStyle = '#e23a1c'; context.lineWidth = 2; context.strokeRect(cut.x * scale, cut.y * scale, cut.width * scale, cut.height * scale);
    };
    return { element, show };
  }
  /** Animation size over the automatic (or validated) scale; it applies at once in the game. */
  private sizeControls(fighter: string, name: string, adjustment: number): HTMLElement {
    const key = `${fighter}:${name}`;
    const percent = number(Math.round(adjustment * 100), value => {
      devTuning.setSpriteScale(key, value ? value / 100 : undefined); this.changed(); this.render();
    });
    percent.min = '10'; percent.setAttribute('aria-label', 'Tamanho da animação em porcentagem');
    const row = el('div', 'developer-row'); row.classList.toggle('developer-changed', adjustment !== 1);
    row.append(labelled('Tamanho da animação (%)', percent),
      button('−1%', () => { devTuning.setSpriteScale(key, Math.max(.1, adjustment - .01)); this.changed(); this.render(); }),
      button('+1%', () => { devTuning.setSpriteScale(key, adjustment + .01); this.changed(); this.render(); }),
      button('Automático', () => { devTuning.setSpriteScale(key, undefined); this.changed(); this.render(); }),
      el('p', 'developer-hint', 'Contorno claro: idle no tamanho automático, na mesma proporção do jogo. O ajuste vale na hora em qualquer luta; «Salvar tamanhos no código» grava na calibração.'));
    return row;
  }
  /** Clears every animation size adjustment and the playback rate, after a confirmation so work is not lost by accident. */
  private spriteReset(): HTMLElement {
    return confirmRow('Resetar tamanhos e quadros/s', 'Sim, resetar',
      () => `Tem certeza? Isso remove ${Object.keys(devTuning.overrides.spriteScales).length} ajuste(s) de tamanho de animação e volta para ${SPRITE_FPS} quadros/s.`,
      () => {
        devTuning.assign({ spriteScales: {} }); this.spriteFps = SPRITE_FPS; this.changed();
        this.status.textContent = 'Ajustes de tamanho e quadros/s restaurados.'; this.render();
      });
  }
  /**
   * Asks, then writes the given tuning sections into the sources through the development server. They are cleared
   * first: the sources already hold them once saved and reload the game, and they come back if saving fails.
   */
  private saveToCode(what: string, sections: readonly (keyof DevOverrides)[], endpoint: string): HTMLElement {
    const count = () => countAdjustments(sections);
    return confirmRow(`Salvar ${what} no código`, 'Salvar e aplicar',
      () => `Gravar ${count()} ajuste(s) de ${what} nos arquivos do jogo? O jogo recarrega com os novos valores.`,
      () => void this.save(what, sections, endpoint, count()));
  }
  private async save(what: string, sections: readonly (keyof DevOverrides)[], endpoint: string, count: number): Promise<void> {
    if (!count) { this.status.textContent = `Nenhum ajuste de ${what} para salvar.`; return; }
    const saved = Object.fromEntries(sections.map(section => [section, structuredClone(devTuning.overrides[section])])) as Partial<DevOverrides>;
    this.status.textContent = `Salvando ${what}…`;
    devTuning.assign(Object.fromEntries(sections.map(section => [section, {}])));
    const response = await post(endpoint, JSON.stringify(saved));
    if (response === 'reloading') return;
    if (!response?.ok) devTuning.assign(saved);
    this.status.textContent = response?.ok ? `Ajustes de ${what} gravados no código.` :
      `Falha ao salvar; ajustes mantidos. ${await response?.text() ?? 'Servidor de desenvolvimento indisponível.'}`;
    this.changed(); this.render();
  }
  /** Writes every replaced image over its source file, then drops the replacement the file now holds. */
  private saveImages(): HTMLElement {
    return confirmRow('Salvar imagens no código', 'Salvar e aplicar',
      () => `Gravar ${replacedImages().size} imagem(ns) substituída(s) sobre os arquivos originais do jogo?${unsavedPoseFrames() ? ' Os ajustes de seleção vão junto: a tela de vencedor de uma pose trocada foi ajustada e ainda não foi salva.' : ''}`,
      () => void this.writeImages());
  }
  private async writeImages(): Promise<void> {
    // A victory pose is trimmed to the drawing once written, with its frame in the code corrected to match; a frame
    // still unsaved here was tuned for the untrimmed image, so the selection framings go first, in the same request.
    await this.writeEverything(unsavedPoseFrames() ? ['selection'] : [], { alternatives: false });
  }
  /** The replaced images as form fields named by their source path, with those whose type differs from the file they replace. */
  private async collectImages(): Promise<{ files: FormData; sent: [string, Blob][]; failures: string[] }> {
    const failures: string[] = [], files = new FormData(), sent: [string, Blob][] = [];
    for (const [url, replacement] of replacedImages()) {
      const path = gameImages[url], file = await (await fetch(replacement)).blob();
      const extension = path.split('.').pop()!.replace('jpg', 'jpeg');
      if (file.type !== `image/${extension}`) { failures.push(`${path}: o arquivo novo é ${file.type || 'de tipo desconhecido'}, não ${extension}`); continue; }
      files.append(path, file); sent.push([url, file]);
    }
    return { files, sent, failures };
  }
  /** Writes every pending adjustment of every tab, replaced image and alternative art in one request (see `/__dev/everything`). */
  private saveAll(): HTMLElement {
    const sections = Object.keys(devTuning.overrides) as (keyof DevOverrides)[];
    return confirmRow('Salvar tudo no código', 'Salvar tudo',
      () => `Gravar ${pendingSummary(sections, true, true)} nos arquivos do jogo? O jogo recarrega com tudo aplicado.`,
      () => void this.writeEverything(sections));
  }
  /**
   * Writes in one request, in the order the art needs: the adjustments of `sections`, then the alternative art added
   * and removed (`alternatives`) and every replaced image (`images`). Like the other saves, what is written leaves the
   * browser first and comes back if writing fails.
   */
  private async writeEverything(sections: readonly (keyof DevOverrides)[], { images = true, alternatives = true } = {}): Promise<void> {
    const { files, sent, failures } = images ? await this.collectImages() : { files: new FormData(), sent: [], failures: [] };
    if (failures.length) { this.status.textContent = `Nada foi gravado: ${failures.join('; ')}.`; return; }
    const count = countAdjustments(sections), changes = alternatives ? pendingAdditions().length + pendingRemovals().size : 0;
    if (!count && !sent.length && !changes) { this.status.textContent = 'Nada para salvar.'; return; }
    const saved = Object.fromEntries(sections.map(section => [section, structuredClone(devTuning.overrides[section])])) as Partial<DevOverrides>;
    if (count) files.append('tuning', JSON.stringify(saved));
    this.status.textContent = 'Salvando…';
    devTuning.assign(Object.fromEntries(sections.map(section => [section, {}])));
    for (const [url] of sent) await restoreImage(url);
    const pending = alternatives ? await takePendingAlternatives() : undefined;
    for (const entry of pending?.added ?? []) files.append(`alternative:${entry.fighter}/${entry.kind}`, entry.blob);
    for (const path of pending?.removed ?? []) files.append('remove-alternative', path);
    const response = await post('/__dev/everything', files);
    if (response === 'reloading') return;
    if (!response?.ok) {
      devTuning.assign(saved);
      for (const [url, file] of sent) await replaceImage(url, file);
      await pending?.restore();
    }
    this.status.textContent = response?.ok ? 'Gravado no código.' :
      `Falha ao salvar; tudo mantido no navegador. ${await response?.text() ?? 'Servidor de desenvolvimento indisponível.'}`;
    this.changed(); this.render();
  }
  private drawFrame(context: CanvasRenderingContext2D, frame: Phaser.Textures.Frame, box: number, feet: number, alpha: number, footAnchor = 1): void {
    const scale = box / frame.realHeight, center = context.canvas.width / 2, top = feet - footAnchor * box;
    context.save(); context.globalAlpha = alpha;
    context.translate(center, 0); if (this.spriteFlip) context.scale(-1, 1);
    context.drawImage(frame.source.image as CanvasImageSource, frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight,
      (frame.x - frame.realWidth / 2) * scale, top + frame.y * scale, frame.cutWidth * scale, frame.cutHeight * scale);
    context.restore();
  }
  private frameNames(key: string): string[] {
    const names = this.scene.textures.get(key).getFrameNames();
    return names.length ? names.sort((a, b) => Number(a) - Number(b) || a.localeCompare(b)) : ['__BASE'];
  }

  /** Frame data of every move; edited cells differ from the authored value and apply to the next action. */
  private moves(page: HTMLElement): void {
    this.fighterPicker(page);
    const fighter = this.fighter, fields = [...MOVE_FIELDS, 'pushbackHit', 'pushbackBlock'] as const;
    const table = el('table', 'developer-table');
    const head = el('tr'); head.append(el('th', '', 'Golpe'), ...fields.map(field => el('th', '', FIELD_LABELS[field])), el('th', '', 'Total'));
    table.append(head);
    for (const move of fighter.moves) {
      const original = devTuning.original(move), line = el('tr');
      const value = (field: typeof fields[number]) => field === 'pushbackHit' ? move.pushback.hit : field === 'pushbackBlock' ? move.pushback.block : move[field];
      const authored = (field: typeof fields[number]) => field === 'pushbackHit' ? original.pushback.hit : field === 'pushbackBlock' ? original.pushback.block : original[field];
      const name = el('td'); name.append(el('strong', '', move.name), el('small', '', ` ${move.id}`));
      line.append(name, ...fields.map(field => {
        const cell = el('td'), editor = number(value(field), next => {
          devTuning.setMove(fighter.id, move.id, field, next === undefined || next === authored(field) ? undefined : next); this.changed(); this.render();
        });
        editor.title = `Original: ${authored(field)}`; editor.setAttribute('aria-label', `${move.name} · ${FIELD_LABELS[field]}`);
        cell.classList.toggle('developer-changed', value(field) !== authored(field)); cell.append(editor); return cell;
      }), el('td', '', `${attackDurationFrames(move)}F`));
      table.append(line);
    }
    const scroll = el('div', 'developer-scroll'); scroll.append(table);
    page.append(scroll, el('p', 'developer-hint', 'Valores em quadros de 60 Hz. Células destacadas diferem dos dados do personagem; passe o mouse para ver o original.'),
      confirmRow('Restaurar golpes deste personagem', 'Restaurar golpes',
        () => `Descartar ${Object.keys(devTuning.overrides.moves[fighter.id] ?? {}).length} golpe(s) ajustado(s) de ${fighter.name} que ainda não foram salvos no código? Os combos não mudam.`,
        () => { devTuning.resetMoves(fighter.id); this.changed(); this.status.textContent = `Ajustes de golpes de ${fighter.name} descartados.`; this.render(); }),
      this.saveToCode('golpes', ['moves'], '/__dev/overrides'));
  }

  /** Authored and manually created recipes, each editable in place; every step is an existing move and still needs its own input. */
  private combos(page: HTMLElement): void {
    this.fighterPicker(page);
    const fighter = this.fighter, custom = new Set((devTuning.overrides.combos[fighter.id] ?? []).map(recipe => recipe.id));
    const list = el('div', 'developer-combos');
    for (const recipe of fighter.combos ?? []) {
      if (recipe.id === this.comboEditing) { list.append(this.comboForm(fighter, recipe)); continue; }
      const card = el('article', 'developer-combo'), edited = Boolean(devTuning.overrides.recipes[fighter.id]?.[recipe.id]);
      card.classList.toggle('developer-changed', edited);
      card.append(el('h2', '', recipe.name), el('p', '', `${recipe.notation} · ${recipe.moveIds.join(' → ')}${recipe.finisherMoveId ? ` ⇒ ${recipe.finisherMoveId}` : ''}`),
        el('p', '', `Preparação: ${recipe.startupFrames?.join(', ') ?? '—'} · Recuperação final: ${recipe.recoveryFrames ?? '—'}`));
      const row = el('div', 'developer-row');
      row.append(button('Editar', () => { this.comboEditing = recipe.id; this.render(); }));
      if (custom.has(recipe.id)) row.append(button('Excluir', () => { devTuning.removeCombo(fighter.id, recipe.id); this.changed(); this.render(); }));
      else if (edited) row.append(button('Restaurar original', () => { devTuning.setRecipe(fighter.id, recipe.id, {}); this.changed(); this.render(); }));
      card.append(row); list.append(card);
    }
    const edits = Object.keys(devTuning.overrides.recipes[fighter.id] ?? {}).length;
    page.append(list, this.comboForm(fighter), this.saveToCode('combos', ['recipes', 'combos'], '/__dev/overrides'),
      confirmRow('Restaurar combos deste personagem', 'Restaurar combos',
        () => `Descartar ${custom.size} combo(s) criado(s) e ${edits} combo(s) editado(s) de ${fighter.name} que ainda não foram salvos no código? Os golpes não mudam.`,
        () => { devTuning.resetCombos(fighter.id); this.changed(); this.status.textContent = `Combos de ${fighter.name} restaurados.`; this.render(); }));
  }
  /** Form of a new recipe or, given one, of an existing recipe: authored ones keep only what differs from the original. */
  private comboForm(fighter: CharacterDefinition, recipe?: ComboRecipe): HTMLElement {
    const form = el('form', `developer-combo${recipe ? '' : ' developer-new'}`);
    const options: [string, string][] = fighter.moves.map(move => [move.id, `${move.name} (${move.notation ?? move.input.buttons.join('+')})`]);
    const name = input('text', recipe?.name ?? '', 'Nome do combo'), notation = input('text', recipe?.notation ?? '', 'Notação (ex.: 1,1,2)');
    // Adding or removing a step redraws only the steps, so the rest of the form keeps what was typed.
    const stepIds = [...(recipe?.moveIds ?? [])], steps = el('div', 'developer-row');
    const drawSteps = () => {
      steps.replaceChildren(...stepIds.flatMap((moveId, index) => [
        choice(`Etapa ${index + 1}`, options, moveId, id => { stepIds[index] = id; }),
        button('×', () => { stepIds.splice(index, 1); drawSteps(); }),
      ]), button('+ Etapa', () => { stepIds.push(fighter.moves[0].id); drawSteps(); }));
    };
    drawSteps();
    const finisher = choice('Finalizador dedicado (opcional)', [['', '—'], ...options], recipe?.finisherMoveId ?? '', () => undefined);
    const startup = input('text', recipe?.startupFrames?.join(', ') ?? '', 'Preparação por etapa (opcional)');
    const recovery = number(recipe?.recoveryFrames, () => undefined);
    const continueOnHit = checkbox('Acerto final continua em outra receita', recipe?.continueOnHit);
    const endsBasicChain = checkbox('Encerra golpes comuns', recipe?.endsBasicChain);
    const actions = el('div', 'developer-row');
    actions.append(button(recipe ? 'Salvar combo' : 'Criar combo', () => form.requestSubmit()));
    if (recipe) actions.append(button('Cancelar', () => { this.comboEditing = undefined; this.render(); }));
    form.append(el('h2', '', recipe ? `Editar “${recipe.name}”` : 'Novo combo'), labelled('Nome', name), labelled('Notação', notation), steps, finisher,
      labelled('Preparação por etapa', startup), labelled('Recuperação final', recovery), continueOnHit, endsBasicChain, actions);
    form.onsubmit = event => {
      event.preventDefault();
      if (!name.value.trim() || !notation.value.trim() || stepIds.length < 2) { this.status.textContent = 'Informe nome, notação e pelo menos duas etapas.'; return; }
      const frames = frameList(startup.value), finisherId = finisher.querySelector('select')!.value;
      const fields: Omit<ComboRecipe, 'id'> = withoutEmpty({
        name: name.value.trim(), notation: notation.value.trim(), moveIds: [...stepIds],
        startupFrames: frames.length ? frames : undefined, recoveryFrames: recovery.value === '' ? undefined : Number(recovery.value),
        finisherMoveId: finisherId || undefined,
        continueOnHit: continueOnHit.querySelector('input')!.checked || undefined, endsBasicChain: endsBasicChain.querySelector('input')!.checked || undefined,
      });
      const custom = devTuning.overrides.combos[fighter.id]?.some(entry => entry.id === recipe?.id), original = recipe && devTuning.originalRecipe(recipe);
      if (!recipe) devTuning.addCombo(fighter.id, { id: `dev-${Date.now().toString(36)}`, ...fields });
      else if (custom || !original) devTuning.replaceCombo(fighter.id, { id: recipe.id, ...fields });
      else devTuning.setRecipe(fighter.id, recipe.id, recipeChanges(original, fields));
      this.comboEditing = undefined; this.changed();
      this.status.textContent = `Combo “${fields.name}” ${recipe ? 'salvo' : 'criado'}.`; this.render();
    };
    return form;
  }

  /** Interface colours: CSS tokens apply at once; HUD tokens when the HUD is next drawn. */
  private colors(page: HTMLElement): void {
    const grid = el('div', 'developer-colors');
    const swatch = (key: string, label: string, current: string, authored: string) => {
      const picker = input('color', current); picker.setAttribute('aria-label', label);
      picker.onchange = () => { devTuning.setColor(key, picker.value === authored ? undefined : picker.value); this.changed(); this.render(); };
      const line = el('div', 'developer-color'); line.classList.toggle('developer-changed', current !== authored);
      line.append(picker, el('span', '', label), button('↺', () => { devTuning.setColor(key, undefined); this.changed(); this.render(); }));
      grid.append(line);
    };
    grid.append(el('h2', '', 'Menus e sobreposições (CSS)'));
    for (const name of CSS_COLORS) swatch(`css:${name}`, name, devTuning.overrides.colors[`css:${name}`] ?? cssDefault(name), cssDefault(name));
    grid.append(el('h2', '', 'HUD de combate'));
    for (const token of HUD_COLORS) swatch(`hud:${token}`, `HUD.${token}`, devTuning.overrides.colors[`hud:${token}`] ?? devTuning.hudDefault(token), devTuning.hudDefault(token));
    page.append(grid, button('Restaurar todas as cores', () => { devTuning.assign({ colors: {} }); this.changed(); this.render(); }), this.saveToCode('cores', ['colors'], '/__dev/overrides'));
  }

  /** Replaces any shipped image (icons, effects, sprite sheets, titles, scenery) without touching the source file. */
  private images(page: HTMLElement): void {
    const search = this.searchBox(this.imageFilter, 'Buscar em todas as pastas (ex.: ready, hit-light, selection-icon)', value => { this.imageFilter = value; });
    page.append(search);
    const images = Object.entries(gameImages).sort((a, b) => a[1].localeCompare(b[1]))
      .map(([url, path]) => ({ id: url, label: path, folder: imageFolder(path, FOLDER_LABELS) }));
    const matches = this.browse(page, images, this.imagePath, path => { this.imagePath = path; this.render(); }, this.imageFilter);
    const list = el('div', 'developer-images');
    const limit = this.imageFilter ? IMAGE_LIMIT : matches.length;
    for (const { id: url, label: path } of matches.slice(0, limit)) list.append(this.imageLine(url, path, this.imageFilter ? path : path.split('/').pop()!));
    page.append(el('p', 'developer-hint', `${matches.length} imagens${matches.length > limit ? ` (mostrando ${limit}; refine a busca)` : ''}. Folhas de sprites exigem o mesmo tamanho e a mesma grade do original.`),
      list, button('Recarregar o jogo', () => window.location.reload()), this.saveImages());
  }
  /** A shipped image with its thumbnail and the buttons that replace or restore it. */
  private imageLine(url: string, path: string, label: string): HTMLElement {
    const line = el('div', 'developer-image'); line.classList.toggle('developer-changed', replacedImages().has(url));
    const thumb = el('img'); thumb.loading = 'lazy'; thumb.alt = ''; thumb.src = url;
    const file = input('file', ''); file.accept = 'image/*'; file.hidden = true;
    file.onchange = () => { if (file.files?.[0]) void this.replace(url, path, file.files[0]); };
    const actions = el('div', 'developer-row'); actions.append(button('Substituir', () => file.click()));
    if (replacedImages().has(url)) actions.append(button('Restaurar', () => void restoreImage(url).then(() => { this.status.textContent = `${path} restaurada. Recarregue para atualizar o que já foi carregado.`; this.render(); })));
    line.append(thumb, el('span', '', label), file, actions);
    return line;
  }

  /** Framing of a fighter's art on the selection screen (panel, arcade and tile), the HUD icon window and the victory frame, with the three images. */
  private selection(page: HTMLElement): void {
    const id = this.artId, art = fighterArt[id];
    page.append(choice('Personagem', Object.entries(fighterArt).map(([key, entry]) => [key, entry.name]), id, key => { this.artId = key; this.render(); }));
    this.framings(page, id, art, devTuning.authoredSelection(id)!, SELECTION_FIELDS, (field, value) => devTuning.setSelection(id, field, value));
    const images = el('div', 'developer-images');
    for (const [label, url] of [['Arte de seleção', art.background], ['Ícone', art.icon], ['Pose de vitória', art.fullbody]] as const) images.append(this.imageLine(url, gameImages[url] ?? label, `${label} — ${gameImages[url] ?? ''}`));
    page.append(images, el('p', 'developer-hint', 'Foco e zoom valem para a tela de seleção; o foco é o ponto da arte que fica fixo ao ampliar. Entre parênteses, o valor gravado no código. Versões alternativas ficam na aba «Alternativas».'),
      button('Ver tela de vencedor', () => this.showEnding(id, art.name)), this.saveToCode('seleção', ['selection'], '/__dev/overrides'), this.saveImages());
  }
  /**
   * Previews of `art` (the selection panel, arcade select, grid tile, HUD icon window or champion screen), each beside
   * the fields of its framing, for the given `fields`. `authored` holds the values in the code; `set` stores a framing,
   * and `undefined` returns it to the code.
   */
  private framings(page: HTMLElement, id: string, art: FighterArt, authored: Required<SelectionTuning>, fields: readonly (keyof SelectionTuning)[],
    set: (field: keyof SelectionTuning, value: SelectionFrame | IconWindow | VictoryFrame | undefined) => void): void {
    const group = (field: keyof SelectionTuning, title: string, labels: Record<string, [string, number]>, current: SelectionFrame | IconWindow | VictoryFrame) => {
      const original = authored[field], row = el('div', 'developer-row'), values: Record<string, number> = { ...current }, base: Record<string, number> = { ...original };
      row.classList.toggle('developer-changed', JSON.stringify(current) !== JSON.stringify(original));
      row.append(el('h2', '', title));
      for (const [key, [label, step]] of Object.entries(labels)) {
        const box = input('number', String(values[key])); box.step = String(step);
        box.onchange = () => {
          const value = Number(box.value); if (!Number.isFinite(value)) return;
          const next = { ...values, [key]: value } as unknown as typeof current;
          set(field, JSON.stringify(next) === JSON.stringify(original) ? undefined : next); this.changed(); this.render();
        };
        row.append(labelled(`${label} (${base[key]})`, box));
      }
      row.append(button('↺', () => { set(field, undefined); this.changed(); this.render(); }));
      return row;
    };
    const focal: Record<string, [string, number]> = { zoom: ['Zoom', .05], x: ['Foco X %', 1], y: ['Foco Y %', 1] };
    const framed = (className: string, url: string, frame: SelectionFrame, overlay?: HTMLElement) => {
      const box = el('div', className), image = el('img'); image.alt = ''; image.src = url; image.style.cssText = frameStyle(frame);
      box.append(image, ...(overlay ? [overlay] : [])); return box;
    };
    const previews: Record<keyof SelectionTuning, () => [string, HTMLElement, HTMLElement]> = {
      hero: () => ['Painel de seleção', framed('developer-hero', art.background, heroFrame(art), selectionScreen(id, false)), group('hero', 'Painel de seleção (zoom e foco da arte)', focal, heroFrame(art))],
      arcade: () => ['Seleção do arcade', framed('developer-arcade', art.background, arcadeFrame(art), selectionScreen(id, true)), group('arcade', 'Seleção do arcade (zoom e foco da arte na tela inteira)', focal, arcadeFrame(art))],
      tile: () => ['Quadro da grade', framed('developer-tile', art.icon, tileFrame(art)), group('tile', 'Quadro da grade (zoom e foco do ícone)', focal, tileFrame(art))],
      iconWindow: () => {
        const icon = el('div', 'developer-icon'), iconImage = el('img'), cropBox = el('div', 'developer-icon-window');
        iconImage.alt = ''; iconImage.src = art.icon; icon.append(iconImage, cropBox);
        iconImage.onload = () => {
          const { x, y, size } = art.iconWindow, { naturalWidth: width, naturalHeight: height } = iconImage;
          Object.assign(cropBox.style, { left: `${x / width * 100}%`, top: `${y / height * 100}%`, width: `${size / width * 100}%`, height: `${size / height * 100}%` });
        };
        return ['Janela do ícone no HUD', icon, group('iconWindow', 'Janela do ícone (HUD de vida, px da imagem)', { x: ['X', 1], y: ['Y', 1], size: ['Lado', 1] }, art.iconWindow)];
      },
      victory: () => {
        // The champion screen in miniature, with the game's proportions and the stage chosen in «Finais».
        const victory = el('div', 'developer-victory'), canvas = this.scene.game.canvas;
        victory.style.aspectRatio = `${canvas.width} / ${canvas.height}`;
        new VictoryScreen(victory, stages.find(entry => entry.id === this.stageId) ?? stages[0], id, art.name, undefined, undefined, art);
        return ['Tela de vencedor', victory, group('victory', 'Tela de vencedor (altura e topo, em telas)', { height: ['Altura', .01], top: ['Topo', .001] }, art.victory)];
      },
    };
    // Each preview sits beside its own fields, so a change is seen while it is typed.
    const list = el('div', 'developer-selection');
    list.classList.toggle('developer-no-overlay', !this.selectionOverlay);
    if (fields.includes('hero') || fields.includes('arcade')) {
      const overlay = checkbox('Mostrar título, nomes e botões da tela sobre as prévias de seleção', this.selectionOverlay);
      overlay.querySelector('input')!.onchange = event => { this.selectionOverlay = (event.target as HTMLInputElement).checked; list.classList.toggle('developer-no-overlay', !this.selectionOverlay); };
      page.append(overlay);
    }
    for (const field of fields) {
      const [title, preview, controls] = previews[field](), box = el('figure', 'developer-figure'), item = el('div', 'developer-tuning');
      box.append(preview, el('figcaption', '', title)); item.append(box, controls); list.append(item);
    }
    page.append(list);
  }
  /**
   * Alternative art of one fighter, by kind: a gallery where images are added and removed (pending until saved, like
   * every other edit), and the framings of the saved image chosen.
   */
  private alternatives(page: HTMLElement): void {
    const id = this.artId, kind = this.alternativeKind, main = fighterArt[id], images = alternativeArt[kind][id] ?? [];
    const added = (of: AlternativeArtKind) => pendingAdditions().filter(entry => entry.fighter === id && entry.kind === of);
    const removed = (of: AlternativeArtKind) => (alternativeArt[of][id] ?? []).filter(image => pendingRemovals().has(gameImages[image.url]));
    page.append(choice('Personagem', Object.entries(fighterArt).map(([key, entry]) => [key, entry.name]), id, key => { this.artId = key; this.render(); }));
    const kinds = el('nav', 'developer-row');
    for (const [key, label] of Object.entries(ALTERNATIVE_LABELS) as [AlternativeArtKind, string][]) {
      const tab = button(`${label} · ${(alternativeArt[key][id]?.length ?? 0) - removed(key).length + added(key).length}`, () => { this.alternativeKind = key; this.render(); });
      tab.setAttribute('aria-pressed', String(key === kind)); kinds.append(tab);
    }
    const gallery = el('div', 'developer-alternative-gallery');
    const chosen = images.find(image => image.file === this.alternativeFile) ?? images[0];
    const item = (url: string, caption: string, changed: boolean, action: HTMLElement, pick?: () => void) => {
      const figure = el('figure', 'developer-alternative'), thumb = el('button', 'developer-alternative-pick'), picture = el('img');
      thumb.type = 'button'; thumb.setAttribute('aria-label', caption); thumb.disabled = !pick;
      if (pick) thumb.onclick = pick;
      picture.loading = 'lazy'; picture.alt = ''; picture.src = url; thumb.append(picture);
      figure.classList.toggle('developer-changed', changed); figure.append(thumb, el('figcaption', '', caption), action);
      gallery.append(figure); return thumb;
    };
    for (const image of images) {
      const path = gameImages[image.url], removing = pendingRemovals().has(path);
      const toggle = button(removing ? 'Desfazer remoção' : 'Remover', () => void markRemoval(path, !removing).then(() => this.render()));
      const thumb = item(image.url, removing ? `${image.file} · será removida` : image.file, removing || Boolean(devTuning.overrides.alternatives[`${id}/${kind}/${image.file}`]),
        toggle, () => { this.alternativeFile = image.file; this.render(); });
      thumb.setAttribute('aria-pressed', String(image === chosen)); thumb.classList.toggle('developer-removed', removing);
    }
    for (const entry of added(kind)) item(entry.url, 'nova · não salva', true, button('Descartar', () => void discardAddition(entry.key).then(() => this.render())));
    const file = input('file', ''); file.accept = 'image/png'; file.multiple = true; file.hidden = true;
    file.onchange = () => { if (file.files?.length) void addAlternatives(id, kind, [...file.files]).then(() => this.render()); };
    page.append(kinds, gallery, file, button('Adicionar', () => file.click()));
    if (chosen) {
      // Framings the image has in the code, or else those of the main art; the panel's edits go over them.
      const key = `${id}/${kind}/${chosen.file}`, fields = ALTERNATIVE_KINDS[kind].framings;
      const authored = { ...devTuning.authoredSelection(id)!, ...chosen.framings };
      const art = withAlternative(main, kind, chosen, { ...authored, ...devTuning.overrides.alternatives[key] });
      page.append(el('h2', '', `${chosen.file} — enquadramento`));
      this.framings(page, id, art, authored, fields, (field, value) => devTuning.setAlternative(key, field as AlternativeFraming, value));
      if (kind === 'victory-poses') page.append(button('Ver tela de vencedor', () => this.showEnding(id, main.name, art)));
    } else page.append(el('p', 'developer-hint', 'Nenhuma versão alternativa salva deste tipo ainda.'));
    page.append(el('p', 'developer-hint', 'Adições, remoções e enquadramentos ficam pendentes até salvar (PNG; poses e ícones passam pela limpeza do fundo rosa). Uma imagem nova pode ser enquadrada depois de salva. Sem enquadramento próprio, a arte usa o da principal; entre parênteses, o valor gravado no código.'),
      confirmRow('Salvar alternativas no código', 'Salvar e aplicar', () => `Gravar ${pendingSummary(['alternatives'], false, true)} nos arquivos do jogo? O jogo recarrega com tudo aplicado.`,
        () => void this.writeEverything(['alternatives'], { images: false })));
  }
  private async replace(url: string, path: string, file: File): Promise<void> {
    const preview = URL.createObjectURL(file);
    const [original, replacement] = await Promise.all([imageSize(url), imageSize(preview)]);
    URL.revokeObjectURL(preview);
    await replaceImage(url, file);
    const mismatch = original.width !== replacement.width || original.height !== replacement.height;
    this.status.textContent = `${path} substituída${mismatch ? ` — atenção: ${replacement.width}×${replacement.height} difere do original ${original.width}×${original.height}` : ''}. Recarregue para aplicar em sprites e cenários.`;
    this.render();
  }

  private export(): void {
    const link = el('a'); link.download = 'close-combat-ajustes.json';
    link.href = URL.createObjectURL(new Blob([JSON.stringify(devTuning.overrides, null, 2)], { type: 'application/json' }));
    link.click(); URL.revokeObjectURL(link.href);
  }

  destroy(): void {
    window.clearInterval(this.spriteTimer);
    this.preview?.destroy();
    window.removeEventListener('keydown', this.onKey, true);
    this.releasePad();
    this.root.remove(); this.previousFocus?.focus(); this.close();
  }
}

/** What a save would write: adjustments of `sections`, and replaced images and alternative art when included. */
function pendingSummary(sections: readonly (keyof DevOverrides)[], images: boolean, alternatives: boolean): string {
  return [`${countAdjustments(sections)} ajuste(s)`, ...(images ? [`${replacedImages().size} imagem(ns) substituída(s)`] : []),
    ...(alternatives ? [`${pendingAdditions().length} alternativa(s) nova(s)`, `${pendingRemovals().size} remoção(ões)`] : [])].join(', ');
}
/** Whether a replaced victory pose has a victory frame still unsaved (tuned for the image before its trim). */
function unsavedPoseFrames(): boolean {
  return [...replacedImages().keys()].some(url => {
    const id = /art\/characters\/([\w-]+)\/fullbody[\w-]*\.png$/.exec(gameImages[url] ?? '')?.[1];
    return Boolean(id && devTuning.overrides.selection[id]?.victory);
  });
}
/** How many adjustments the given sections hold (a nested entry counts each of its keys). */
function countAdjustments(sections: readonly (keyof DevOverrides)[]): number {
  return sections.reduce((total, section) => total + Object.values(devTuning.overrides[section]).reduce<number>(
    (sum, value) => sum + (typeof value === 'object' ? Object.keys(value).length : 1), 0), 0);
}
/** The real character select without its art (versus, or Arcade when `solo`), laid over a preview to show what covers the fighter. */
function selectionScreen(id: string, solo: boolean): HTMLElement {
  const screen = el('div', `arena-menu fighter-selection developer-overlay${solo ? ' arcade-selection' : ''}`);
  const header = el('header', 'arena-header'); header.append(el('h1', 'arena-step', t('menu.fighterStep')));
  screen.append(header);
  const index = Math.max(0, playableCharacters.findIndex(entry => entry.id === id)), selection = new FighterSelection(playableCharacters.length);
  selection.select(0, index);
  const idle = () => undefined;
  renderFighterSelection(screen, { fighters: playableCharacters, selection, opponent: playableCharacters[index], versus: !solo, selectOpponent: !solo, solo,
    modeTitle: t(solo ? 'mode.arcade.title' : 'mode.versus.title'), refresh: idle, confirm: idle, back: idle });
  screen.append(el('footer', 'arena-footer', t(solo ? 'menu.fighterControls' : 'menu.versusControls')));
  screen.querySelector('.arena-fighter-name.left h1')!.textContent = fighterArt[id].name;
  screen.inert = true;
  return screen;
}
function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag); if (className) node.className = className; if (text) node.textContent = text; return node;
}
/** A button that asks before acting: the question replaces it, with confirm and cancel. */
function confirmRow(label: string, confirmLabel: string, question: () => string, action: () => void): HTMLElement {
  const row = el('div', 'developer-row');
  const idle = () => row.replaceChildren(button(label, ask));
  const ask = () => row.replaceChildren(el('p', 'developer-hint', question()), button(confirmLabel, action), button('Cancelar', idle));
  idle();
  return row;
}
function button(text: string, action: () => void): HTMLButtonElement {
  const node = el('button', '', text); node.type = 'button'; node.onclick = action; return node;
}
function input(type: string, value: string, placeholder = ''): HTMLInputElement {
  const node = el('input'); node.type = type; node.value = value; if (placeholder) { node.placeholder = placeholder; node.setAttribute('aria-label', placeholder); } return node;
}
function number(value: number | undefined, change: (value: number | undefined) => void): HTMLInputElement {
  const node = input('number', value === undefined ? '' : String(value)); node.min = '0'; node.step = '1';
  node.onchange = () => change(node.value === '' ? undefined : Math.max(0, Math.round(Number(node.value))));
  return node;
}
function labelled(text: string, control: HTMLElement): HTMLElement {
  const label = el('label', 'developer-field'); label.append(el('span', '', text), control); return label;
}
function checkbox(text: string, checked = false): HTMLElement { const box = input('checkbox', ''); box.checked = checked; return labelled(text, box); }
function choice(text: string, options: readonly (readonly [string, string])[], value: string, change: (value: string) => void): HTMLElement {
  const select = el('select');
  for (const [id, label] of options) { const option = el('option', '', label); option.value = id; select.append(option); }
  select.value = value; select.onchange = () => change(select.value);
  return labelled(text, select);
}
function cssDefault(name: string): string {
  const style = document.documentElement.style, override = style.getPropertyValue(name);
  style.removeProperty(name);
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (override) style.setProperty(name, override);
  return value;
}
/** Per-step frame counts typed as `12, 10, 10`; blanks are ignored. */
function frameList(text: string): number[] {
  return text.split(',').map(part => part.trim()).filter(Boolean).map(Number).filter(Number.isFinite);
}
function withoutEmpty<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}
/** Fields of an edited authored recipe that differ from the original; `null` drops an optional field. */
function recipeChanges(original: ComboRecipe, edited: Omit<ComboRecipe, 'id'>): RecipeTuning {
  const changes: Record<string, unknown> = {};
  for (const field of RECIPE_FIELDS) {
    if (JSON.stringify(original[field]) !== JSON.stringify(edited[field])) changes[field] = edited[field] ?? null;
  }
  return changes as RecipeTuning;
}
/**
 * Sends a save to the development server. Writing the files makes the server reload the page, which aborts the request:
 * that is a success (`'reloading'`), and restoring the adjustments then would bring back what the code now holds.
 */
async function post(url: string, body: BodyInit): Promise<Response | 'reloading' | undefined> {
  let reloading = false;
  const leave = () => { reloading = true; };
  window.addEventListener('beforeunload', leave);
  // A notice over the whole screen while the files are written: nothing can be clicked or saved twice meanwhile, and it
  // stays up through the reload that follows.
  const notice = el('div', 'developer-saving');
  notice.setAttribute('role', 'alertdialog'); notice.setAttribute('aria-modal', 'true'); notice.setAttribute('aria-busy', 'true');
  notice.append(el('p', '', 'Salvando…'), el('p', 'developer-hint', 'Gravando nos arquivos do jogo. A página recarrega sozinha ao terminar.'));
  document.body.append(notice); saving = true;
  const response = await fetch(url, { method: 'POST', body }).catch(() => undefined);
  window.removeEventListener('beforeunload', leave);
  if (!reloading) { notice.remove(); saving = false; }
  return reloading ? 'reloading' : response;
}
/** Whether a save is being written (the panel ignores its keys meanwhile). */
let saving = false;
function imageSize(url: string): Promise<{ width: number; height: number }> {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve({ width: 0, height: 0 });
    image.src = url;
  });
}
