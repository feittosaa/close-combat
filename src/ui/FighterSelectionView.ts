import { arcadeFrame, fighterArt, frameStyle, heroFrame, holdSelectionArt, randomArt, tileFrame } from './fighterArt';
import { t } from '../i18n/i18n';
import type { CharacterDefinition } from '../engine/data/characters';
import type { FighterSelection, SelectionPlayer } from './FighterSelection';

interface SelectionViewOptions {
  fighters: readonly CharacterDefinition[];
  selection: FighterSelection;
  opponent: CharacterDefinition;
  versus: boolean;
  selectOpponent: boolean;
  /** Arcade: only P1's fighter, over the whole screen; the opponent stays hidden. */
  solo: boolean;
  modeTitle: string;
  refresh: () => void;
  confirm: () => void;
  back: () => void;
}

/** One selection layout for every mode, with mode-specific confirmation only. */
export function renderFighterSelection(root: HTMLElement, options: SelectionViewOptions): void {
  const { fighters, selection, versus, selectOpponent } = options;
  holdSelectionArt();
  const node = (tag: string, className: string, text = ''): HTMLElement => {
    const element = document.createElement(tag); element.className = className; element.textContent = text; return element;
  };
  const button = (label: string, className: string, action: () => void): HTMLButtonElement => {
    const element = document.createElement('button'); element.className = className; element.textContent = label; element.onclick = action; return element;
  };
  const panelFrame = options.solo ? arcadeFrame : heroFrame;
  const fighterPortrait = (id: string, small: boolean): HTMLImageElement => {
    const image = document.createElement('img');
    // Decoded ahead of time: painting waits for the decoded copy instead of showing an empty frame for an instant.
    image.decoding = 'sync';
    const art = fighterArt[id];
    image.src = small ? art.icon : art.background;
    image.style.cssText = frameStyle(small ? tileFrame(art) : panelFrame(art));
    image.alt = '';
    return image;
  };
  for (const player of (options.solo ? [0] : [0, 1]) as readonly SelectionPlayer[]) {
    const entry = player === 1 && !selectOpponent ? options.opponent : fighters[selection.indices[player]];
    const side = player === 0 ? 'left' : 'right';
    // A player who picked the random tile sees the mystery silhouette instead of the fighter last highlighted.
    const randomPick = selection.random[player] && (player === 0 || selectOpponent);
    const hero = node('div', `arena-hero ${side}`);
    if (randomPick) { const image = document.createElement('img'); image.decoding = 'sync'; image.src = randomArt.background; image.alt = ''; hero.append(image); }
    else hero.append(fighterPortrait(entry.id, false));
    const name = node('div', `arena-fighter-name ${side}`);
    if ((player === 0 || selectOpponent) && selection.choosingColor[player]) {
      const colors = entry.id === 'texas'
        ? [['#b72b36', '#f5bd35', '#328bde'], ['#2c5eac', '#f5bd35', '#f2a53a']]
        : entry.id === 'grappler'
        ? [['#7c402c', '#f85d03', '#f89a04'], ['#7c402c', '#03bff8', '#04d9f8']]
        : [['#50683b', '#e4b34e', '#714a2d'], ['#d22529', '#e4b34e', '#714a2d']];
      const palette = node('div', 'arena-palettes');
      palette.setAttribute('role', 'group');
      palette.setAttribute('aria-label', t('fighter.colorsOf', { name: entry.name, player: player + 1 }));
      colors.forEach((color, index) => {
        const swatch = button('', 'arena-palette', () => { selection.selectPalette(player, index as 0 | 1); options.refresh(); });
        const colorName = t(index === 0 ? 'fighter.originalColor' : 'fighter.alternateColor');
        swatch.setAttribute('aria-label', colorName);
        swatch.setAttribute('aria-pressed', String(selection.palettes[player] === index));
        if (selection.isPaletteLocked(player, index as 0 | 1)) { swatch.disabled = true; swatch.setAttribute('aria-label', t('fighter.colorUnavailable', { color: colorName })); }
        swatch.style.setProperty('--palette-main', color[0]);
        swatch.style.setProperty('--palette-accent', color[1]);
        swatch.style.setProperty('--palette-detail', color[2]);
        palette.append(swatch);
      });
      name.append(palette);
    }
    const who = player === 1 && !versus ? t('fighter.opponent') : `P${player + 1}`;
    name.append(node('span', 'arena-eyebrow', player === 1 && !versus ? t('fighter.opponent') : t('fighter.player', { player: player + 1 })), node('h1', '', randomPick ? t('fighter.randomName') : entry.name));
    if (selectOpponent) name.append(button(t(selection.ready[player] ? 'fighter.ready' : 'fighter.choose', { who }), 'arena-player-switch', () => { selection.activePlayer = player; options.refresh(); }));
    root.append(hero, name);
  }
  const panel = node('div', 'arena-selection');
  panel.append(node('span', 'arena-eyebrow', options.modeTitle), node('h2', '', versus ? t('fighter.choiceOf', { player: selection.activePlayer + 1 }) : t(selectOpponent && selection.activePlayer === 1 ? 'fighter.chooseOpponent' : 'fighter.chooseFighter')));
  const grid = node('div', 'arena-roster'); grid.setAttribute('role', 'group'); grid.setAttribute('aria-label', t('fighter.roster'));
  fighters.forEach((entry, index) => {
    const tile = button('', 'arena-portrait', () => { selection.select(selection.activePlayer, index); options.refresh(); });
    tile.setAttribute('aria-label', entry.name); tile.setAttribute('aria-pressed', String(!selection.random[selection.activePlayer] && index === selection.indices[selection.activePlayer]));
    tile.append(fighterPortrait(entry.id, true));
    tile.append(node('span', '', entry.name));
    if (versus) {
      const cursors = node('div', 'arena-cursors');
      for (const player of [0, 1] as const) if (!selection.random[player] && selection.indices[player] === index) cursors.append(node('b', `cursor-p${player + 1}`, `P${player + 1}`));
      tile.append(cursors);
    }
    grid.append(tile);
  });
  const upcoming = Object.entries(fighterArt).filter(([id]) => !fighters.some(fighter => fighter.id === id));
  for (const [id, art] of upcoming) {
    const tile = button('', 'arena-portrait', () => {
      const side = selection.activePlayer === 0 ? 'left' : 'right';
      const hero = root.querySelector(`.arena-hero.${side} img`) as HTMLImageElement | null;
      const heading = root.querySelector(`.arena-fighter-name.${side} h1`);
      const status = root.querySelector('.arena-opponent');
      if (hero) { hero.src = art.background; hero.style.cssText = frameStyle(panelFrame(art)); }
      const eyebrow = root.querySelector(`.arena-fighter-name.${side} .arena-eyebrow`);
      if (heading) heading.textContent = art.name;
      if (eyebrow) eyebrow.textContent = t('fighter.unavailable');
      if (status) status.textContent = t('fighter.previewing', { name: art.name.toUpperCase() });
    });
    tile.classList.add('unavailable');
    tile.setAttribute('aria-label', t('fighter.inDevelopmentLabel', { name: art.name }));
    tile.title = t('fighter.viewArt');
    tile.append(fighterPortrait(id, true), node('span', '', art.name), node('em', 'arena-unavailable', t('fighter.unavailable')));
    grid.append(tile);
  }
  for (let index = fighters.length + upcoming.length; index < 9; index++) {
    const empty = node('div', 'arena-empty');
    empty.setAttribute('aria-hidden', 'true');
    grid.append(empty);
  }
  const random = button('?', 'arena-random', () => { selection.selectRandom(selection.activePlayer); options.refresh(); });
  random.setAttribute('aria-label', t('fighter.random'));
  random.setAttribute('aria-pressed', String(selection.random[selection.activePlayer]));
  if (versus) {
    const cursors = node('div', 'arena-cursors');
    for (const player of [0, 1] as const) if (selection.random[player]) cursors.append(node('b', `cursor-p${player + 1}`, `P${player + 1}`));
    random.append(cursors);
  }
  const status = node('p', 'arena-opponent', selectOpponent
    ? `P1 ${t(selection.ready[0] ? 'fighter.statusReady' : 'fighter.statusChoosing')} · ${versus ? 'P2' : t('fighter.opponent')} ${t(selection.ready[1] ? 'fighter.statusReady' : 'fighter.statusChoosing')}`
    : `P2 · ${options.opponent.name} · ${options.modeTitle}`);
  status.setAttribute('role', 'status');
  grid.append(random);
  panel.append(grid, status, button(selection.choosingColor[selection.activePlayer] ? t('fighter.confirmColor') : selectOpponent && selection.activePlayer === 1 && !versus ? t('fighter.confirmOpponent') : versus ? t('fighter.confirmPlayer', { player: selection.activePlayer + 1 }) : t('fighter.confirmFighter'), 'arena-confirm', options.confirm), button(t('common.backArrow'), 'arena-back', options.back));
  root.append(panel);
}
