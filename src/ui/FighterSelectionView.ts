import { fighterArt } from './fighterArt';
import type { CharacterDefinition } from '../engine/data/characters';
import type { FighterSelection, SelectionPlayer } from './FighterSelection';

interface SelectionViewOptions {
  fighters: readonly CharacterDefinition[];
  selection: FighterSelection;
  opponent: CharacterDefinition;
  versus: boolean;
  selectOpponent: boolean;
  modeTitle: string;
  refresh: () => void;
  confirm: () => void;
  back: () => void;
}

/** One selection layout for every mode, with mode-specific confirmation only. */
export function renderFighterSelection(root: HTMLElement, options: SelectionViewOptions): void {
  const { fighters, selection, versus, selectOpponent } = options;
  const node = (tag: string, className: string, text = ''): HTMLElement => {
    const element = document.createElement(tag); element.className = className; element.textContent = text; return element;
  };
  const button = (label: string, className: string, action: () => void): HTMLButtonElement => {
    const element = document.createElement('button'); element.className = className; element.textContent = label; element.onclick = action; return element;
  };
  const fighterPortrait = (id: string, small: boolean): HTMLImageElement => {
    const image = document.createElement('img');
    image.src = small ? fighterArt[id].icon : fighterArt[id].background;
    image.alt = '';
    return image;
  };
  for (const player of [0, 1] as const satisfies readonly SelectionPlayer[]) {
    const entry = player === 1 && !selectOpponent ? options.opponent : fighters[selection.indices[player]];
    const side = player === 0 ? 'left' : 'right';
    const hero = node('div', `arena-hero ${side}`); hero.append(fighterPortrait(entry.id, false));
    const name = node('div', `arena-fighter-name ${side}`);
    if ((player === 0 || selectOpponent) && selection.choosingColor[player]) {
      const colors = entry.id === 'cowboy'
        ? [['#b72b36', '#f5bd35', '#328bde'], ['#201d22', '#f5bd35', '#a55de3']]
        : [['#50683b', '#e4b34e', '#714a2d'], ['#d22529', '#e4b34e', '#714a2d']];
      const palette = node('div', 'arena-palettes');
      palette.setAttribute('role', 'group');
      palette.setAttribute('aria-label', `Cores de ${entry.name}, jogador ${player + 1}`);
      colors.forEach((color, index) => {
        const swatch = button('', 'arena-palette', () => { selection.selectPalette(player, index as 0 | 1); options.refresh(); });
        swatch.setAttribute('aria-label', index === 0 ? 'Cor original' : 'Cor alternativa');
        swatch.setAttribute('aria-pressed', String(selection.palettes[player] === index));
        swatch.style.setProperty('--palette-main', color[0]);
        swatch.style.setProperty('--palette-accent', color[1]);
        swatch.style.setProperty('--palette-detail', color[2]);
        palette.append(swatch);
      });
      name.append(palette);
    }
    name.append(node('span', 'arena-eyebrow', player === 1 && !versus ? 'ADVERSÁRIO' : `PLAYER 0${player + 1}`), node('h1', '', entry.name));
    if (selectOpponent) name.append(button(selection.ready[player] ? `${player === 1 && !versus ? 'ADVERSÁRIO' : `P${player + 1}`} · PRONTO` : `ESCOLHER ${player === 1 && !versus ? 'ADVERSÁRIO' : `P${player + 1}`}`, 'arena-player-switch', () => { selection.activePlayer = player; options.refresh(); }));
    root.append(hero, name);
  }
  const panel = node('div', 'arena-selection');
  panel.append(node('span', 'arena-eyebrow', options.modeTitle), node('h2', '', versus ? `ESCOLHA DE P${selection.activePlayer + 1}` : selectOpponent && selection.activePlayer === 1 ? 'ESCOLHA O ADVERSÁRIO' : 'ESCOLHA SEU LUTADOR'));
  const grid = node('div', 'arena-roster'); grid.setAttribute('role', 'group'); grid.setAttribute('aria-label', 'Personagens disponíveis');
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
      if (hero) hero.src = art.background;
      if (heading) heading.textContent = `${art.name} · EM DESENVOLVIMENTO`;
      if (status) status.textContent = `VISUALIZANDO ${art.name.toUpperCase()} · INDISPONÍVEL PARA LUTA`;
    });
    tile.setAttribute('aria-label', `${art.name} · em desenvolvimento`);
    tile.title = 'Ver arte · indisponível para luta';
    tile.append(fighterPortrait(id, true), node('span', '', art.name));
    grid.append(tile);
  }
  for (let index = fighters.length + upcoming.length; index < 9; index++) {
    const empty = node('div', 'arena-empty');
    empty.setAttribute('aria-hidden', 'true');
    grid.append(empty);
  }
  const random = button('?', 'arena-random', () => { selection.selectRandom(selection.activePlayer); options.refresh(); });
  random.setAttribute('aria-label', 'Personagem aleatório');
  random.setAttribute('aria-pressed', String(selection.random[selection.activePlayer]));
  if (versus) {
    const cursors = node('div', 'arena-cursors');
    for (const player of [0, 1] as const) if (selection.random[player]) cursors.append(node('b', `cursor-p${player + 1}`, `P${player + 1}`));
    random.append(cursors);
  }
  const status = node('p', 'arena-opponent', selectOpponent
    ? `P1 ${selection.ready[0] ? 'PRONTO' : 'ESCOLHENDO'} · ${versus ? 'P2' : 'ADVERSÁRIO'} ${selection.ready[1] ? 'PRONTO' : 'ESCOLHENDO'}`
    : `P2 · ${options.opponent.name} · ${options.modeTitle}`);
  status.setAttribute('role', 'status');
  grid.append(random);
  panel.append(grid, status, button(selection.choosingColor[selection.activePlayer] ? 'CONFIRMAR COR  →' : selectOpponent && selection.activePlayer === 1 && !versus ? 'CONFIRMAR ADVERSÁRIO  →' : versus ? `CONFIRMAR P${selection.activePlayer + 1}  →` : 'CONFIRMAR PERSONAGEM  →', 'arena-confirm', options.confirm), button('← VOLTAR', 'arena-back', options.back));
  root.append(panel);
}
