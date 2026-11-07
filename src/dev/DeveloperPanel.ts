import type Phaser from 'phaser';
import { characters, type CharacterDefinition, type ComboRecipe } from '../engine/data/characters';
import { attackDurationFrames } from '../engine/combat/frameData';
import { stages } from '../rendering/stages/stageCatalog';
import { autoSpriteScale, type SheetMeasurements, type SpriteCalibration } from '../rendering/animations/spriteScale';
import { cowboyDisplayHeight, cowboyFootAnchor, getCowboyFrameSize } from '../rendering/animations/cowboySprites';
import { getShotoResolution, SHOTO_FRAME, shotoIdleScale, shotoIdleTexture, shotoSpriteScale } from '../rendering/animations/shotoSprites';
import { fighterArt } from '../ui/fighterArt';
import { preloadAllMatchAssets } from '../rendering/matchAssets';
import { VictoryScreen } from '../ui/VictoryScreen';
import { gameImages, replaceImage, replacedImages, restoreImage } from './assetOverrides';
import { CSS_COLORS, HUD_COLORS, MOVE_FIELDS, type MoveTuning } from './devOverrides';
import { IMAGE_SECTIONS, imageFolder, textureFolder } from './imageCatalog';
import { devTuning } from './devTools';
import './developer.css';

const TABS = [['endings', 'Finais'], ['sprites', 'Sprites'], ['moves', 'Golpes'], ['combos', 'Combos'], ['colors', 'Cores'], ['images', 'Imagens']] as const;
type Tab = typeof TABS[number][0];
const FIELD_LABELS: Record<keyof MoveTuning, string> = {
  startup: 'Preparação', activeFrames: 'Ativo', recovery: 'Recuperação', damage: 'Dano', hitstun: 'Hitstun', blockstun: 'Blockstun',
  pushbackHit: 'Recuo acerto', pushbackBlock: 'Recuo defesa',
};
const RESULT_SPRITES = /victory|defeat|taunt|ippon|exit/;
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
  cowboy: fighterSizing('cowboy', key => cowboyDisplayHeight / getCowboyFrameSize(key), () => cowboyFootAnchor),
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
  private imageFilter = '';
  private imagePath: string[] = [];
  private comboSteps: string[] = [];
  private preview?: VictoryScreen;
  private readonly previousFocus = document.activeElement as HTMLElement | null;
  private readonly onKey = (event: KeyboardEvent): void => {
    // Game shortcuts never see keys typed into the panel.
    event.stopImmediatePropagation();
    if (event.code !== 'Escape') return;
    event.preventDefault();
    if (this.preview) this.closePreview(); else this.destroy();
  };

  constructor(private readonly scene: Phaser.Scene, private readonly close: () => void, private readonly changed: () => void = () => undefined) {
    this.root.setAttribute('role', 'dialog'); this.root.setAttribute('aria-modal', 'true'); this.root.setAttribute('aria-label', 'Modo desenvolvedor');
    this.status.setAttribute('role', 'status');
    document.body.append(this.root);
    window.addEventListener('keydown', this.onKey, true);
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
      combos: () => this.combos(page), colors: () => this.colors(page), images: () => this.images(page) })[this.tab]();
    const footer = el('footer', 'developer-footer');
    footer.append(button('Exportar ajustes (JSON)', () => this.export()), button('Fechar', () => this.destroy()));
    panel.append(header, page, this.status, footer);
    this.root.replaceChildren(panel);
    this.root.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();
  }

  private fighterPicker(page: HTMLElement): void {
    page.append(choice('Personagem', characters.map(fighter => [fighter.id, fighter.name]), this.fighterId, id => { this.fighterId = id; this.comboSteps = []; this.render(); }));
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
  private showEnding(fighterId: string, name: string): void {
    const stage = stages.find(entry => entry.id === this.stageId) ?? stages[0];
    this.root.hidden = true;
    this.preview = new VictoryScreen(this.scene.game.canvas, stage, fighterId, name);
    document.querySelector('.victory-screen')?.addEventListener('click', () => this.closePreview(), { once: true });
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
    const canvas = el('canvas'); canvas.width = 360; canvas.height = 360;
    const info = el('p', 'developer-hint');
    const frames = this.spriteKey ? this.frameNames(this.spriteKey) : [];
    const sheet = this.spriteKey ? this.characterSheet(this.spriteKey) : undefined;
    const draw = () => {
      const context = canvas.getContext('2d');
      if (!context || !this.spriteKey || !frames.length) { info.textContent = 'Nenhuma textura.'; return; }
      this.spriteFrame = (this.spriteFrame + frames.length) % frames.length;
      const frame = this.scene.textures.getFrame(this.spriteKey, frames[this.spriteFrame]);
      context.clearRect(0, 0, canvas.width, canvas.height);
      const label = `${this.spriteKey} · quadro ${frames[this.spriteFrame]} (${this.spriteFrame + 1}/${frames.length}) · ${frame.realWidth}×${frame.realHeight}`;
      if (!sheet) {
        const scale = Math.min(canvas.width / frame.realWidth, canvas.height / frame.realHeight);
        this.drawFrame(context, frame, frame.realHeight * scale, (canvas.height + frame.realHeight * scale) / 2, 1);
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
    viewer.append(this.spriteSave(), this.spriteReset());
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
        devTuning.resetSpriteScales(); this.spriteFps = SPRITE_FPS; this.changed();
        this.status.textContent = 'Ajustes de tamanho e quadros/s restaurados.'; this.render();
      });
  }
  /**
   * Writes the animation size adjustments into each fighter's `calibration.json` through the development server.
   * They are cleared first: the new calibration already holds them and reloads the game, and they come back on failure.
   */
  private spriteSave(): HTMLElement {
    return confirmRow('Salvar tamanhos no código', 'Salvar e aplicar',
      () => `Gravar ${Object.keys(devTuning.overrides.spriteScales).length} ajuste(s) de tamanho no calibration.json dos personagens? O jogo recarrega com os novos tamanhos.`,
      () => void this.saveSpriteScales());
  }
  private async saveSpriteScales(): Promise<void> {
    const spriteScales = { ...devTuning.overrides.spriteScales };
    if (!Object.keys(spriteScales).length) { this.status.textContent = 'Nenhum ajuste de tamanho para salvar.'; return; }
    this.status.textContent = 'Salvando tamanhos…';
    devTuning.resetSpriteScales();
    const response = await fetch('/__dev/sprite-scales', { method: 'POST', body: JSON.stringify({ spriteScales }) }).catch(() => undefined);
    if (response?.ok) { this.status.textContent = 'Tamanhos gravados no calibration.json.'; this.changed(); this.render(); return; }
    for (const [key, scale] of Object.entries(spriteScales)) devTuning.setSpriteScale(key, scale);
    this.status.textContent = `Falha ao salvar; ajustes mantidos. ${await response?.text() ?? 'Servidor de desenvolvimento indisponível.'}`;
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
      button('Restaurar golpes e combos deste personagem', () => { devTuning.resetFighter(fighter.id); this.changed(); this.status.textContent = 'Ajustes do personagem removidos.'; this.render(); }));
  }

  /** Recipe timings plus manually authored recipes: each step is an existing move and still needs its own input. */
  private combos(page: HTMLElement): void {
    this.fighterPicker(page);
    const fighter = this.fighter, custom = new Set((devTuning.overrides.combos[fighter.id] ?? []).map(recipe => recipe.id));
    const list = el('div', 'developer-combos');
    for (const recipe of fighter.combos ?? []) {
      const card = el('article', 'developer-combo');
      card.append(el('h2', '', recipe.name), el('p', '', `${recipe.notation} · ${recipe.moveIds.join(' → ')}${recipe.finisherMoveId ? ` ⇒ ${recipe.finisherMoveId}` : ''}`));
      const startup = input('text', recipe.startupFrames?.join(', ') ?? '', 'Preparação por etapa (ex.: 12, 10, 10)');
      const recovery = number(recipe.recoveryFrames, () => undefined);
      const save = () => {
        const frames = frameList(startup.value);
        const tuning = { startupFrames: frames.length ? frames : undefined, recoveryFrames: recovery.value === '' ? undefined : Number(recovery.value) };
        if (custom.has(recipe.id)) {
          devTuning.removeCombo(fighter.id, recipe.id);
          devTuning.addCombo(fighter.id, { ...recipe, ...withoutEmpty(tuning) });
        } else devTuning.setRecipe(fighter.id, recipe.id, sameAs(devTuning.originalRecipe(recipe), tuning) ? {} : withoutEmpty(tuning));
        this.changed(); this.status.textContent = `Tempos de “${recipe.name}” salvos.`; this.render();
      };
      const row = el('div', 'developer-row');
      row.append(labelled('Preparação por etapa', startup), labelled('Recuperação final', recovery), button('Salvar tempos', save));
      if (custom.has(recipe.id)) row.append(button('Excluir', () => { devTuning.removeCombo(fighter.id, recipe.id); this.changed(); this.render(); }));
      card.append(row); list.append(card);
    }
    page.append(list, this.comboForm(fighter));
  }
  private comboForm(fighter: CharacterDefinition): HTMLElement {
    const form = el('form', 'developer-combo developer-new');
    const options: [string, string][] = fighter.moves.map(move => [move.id, `${move.name} (${move.notation ?? move.input.buttons.join('+')})`]);
    const name = input('text', '', 'Nome do combo'), notation = input('text', '', 'Notação (ex.: 1,1,2)');
    const steps = el('div', 'developer-row');
    this.comboSteps.forEach((moveId, index) => {
      steps.append(choice(`Etapa ${index + 1}`, options, moveId, id => { this.comboSteps[index] = id; }),
        button('×', () => { this.comboSteps.splice(index, 1); this.render(); }));
    });
    steps.append(button('+ Etapa', () => { this.comboSteps.push(fighter.moves[0].id); this.render(); }));
    const finisher = choice('Finalizador dedicado (opcional)', [['', '—'], ...options], '', () => undefined);
    const startup = input('text', '', 'Preparação por etapa (opcional)');
    const recovery = number(undefined, () => undefined);
    const continueOnHit = checkbox('Acerto final continua em outra receita'), endsBasicChain = checkbox('Encerra golpes comuns');
    form.append(el('h2', '', 'Novo combo'), labelled('Nome', name), labelled('Notação', notation), steps, finisher,
      labelled('Preparação por etapa', startup), labelled('Recuperação final', recovery), continueOnHit, endsBasicChain, button('Criar combo', () => form.requestSubmit()));
    form.onsubmit = event => {
      event.preventDefault();
      if (!name.value.trim() || !notation.value.trim() || this.comboSteps.length < 2) { this.status.textContent = 'Informe nome, notação e pelo menos duas etapas.'; return; }
      const frames = frameList(startup.value);
      const finisherId = finisher.querySelector('select')!.value;
      const recipe: ComboRecipe = {
        id: `dev-${Date.now().toString(36)}`, name: name.value.trim(), notation: notation.value.trim(), moveIds: [...this.comboSteps],
        ...(frames.length ? { startupFrames: frames } : {}), ...(recovery.value !== '' ? { recoveryFrames: Number(recovery.value) } : {}),
        ...(finisherId ? { finisherMoveId: finisherId } : {}),
        ...(continueOnHit.querySelector('input')!.checked ? { continueOnHit: true } : {}), ...(endsBasicChain.querySelector('input')!.checked ? { endsBasicChain: true } : {}),
      };
      devTuning.addCombo(fighter.id, recipe); this.comboSteps = []; this.changed();
      this.status.textContent = `Combo “${recipe.name}” criado.`; this.render();
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
    page.append(grid, button('Restaurar todas as cores', () => { devTuning.resetColors(); this.changed(); this.render(); }));
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
    for (const { id: url, label: path } of matches.slice(0, limit)) {
      const line = el('div', 'developer-image'); line.classList.toggle('developer-changed', replacedImages().has(url));
      const thumb = el('img'); thumb.loading = 'lazy'; thumb.alt = ''; thumb.src = url;
      const file = input('file', ''); file.accept = 'image/*'; file.hidden = true;
      file.onchange = () => { if (file.files?.[0]) void this.replace(url, path, file.files[0]); };
      const actions = el('div', 'developer-row'); actions.append(button('Substituir', () => file.click()));
      if (replacedImages().has(url)) actions.append(button('Restaurar', () => void restoreImage(url).then(() => { this.status.textContent = `${path} restaurada. Recarregue para atualizar o que já foi carregado.`; this.render(); })));
      line.append(thumb, el('span', '', this.imageFilter ? path : path.split('/').pop()!), file, actions); list.append(line);
    }
    page.append(el('p', 'developer-hint', `${matches.length} imagens${matches.length > limit ? ` (mostrando ${limit}; refine a busca)` : ''}. Folhas de sprites exigem o mesmo tamanho e a mesma grade do original.`),
      list, button('Recarregar o jogo', () => window.location.reload()));
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
    this.root.remove(); this.previousFocus?.focus(); this.close();
  }
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
function checkbox(text: string): HTMLElement { const box = input('checkbox', ''); return labelled(text, box); }
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
function sameAs(recipe: ComboRecipe | undefined, tuning: { startupFrames?: number[]; recoveryFrames?: number }): boolean {
  return String(recipe?.startupFrames ?? '') === String(tuning.startupFrames ?? '') && recipe?.recoveryFrames === tuning.recoveryFrames;
}
function imageSize(url: string): Promise<{ width: number; height: number }> {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve({ width: 0, height: 0 });
    image.src = url;
  });
}
