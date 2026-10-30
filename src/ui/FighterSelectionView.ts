import type { CharacterDefinition } from '../engine/data/characters';
import type { FighterSelection, SelectionPlayer } from './FighterSelection';

interface SelectionViewOptions {
  fighters: readonly CharacterDefinition[];
  selection: FighterSelection;
  opponent: CharacterDefinition;
  versus: boolean;
  modeTitle: string;
  portrait: (crop: string, animated?: boolean) => SVGSVGElement;
  refresh: () => void;
  confirm: () => void;
  back: () => void;
}

/** One selection layout for every mode, with mode-specific confirmation only. */
export function renderFighterSelection(root: HTMLElement, options: SelectionViewOptions): void {
  const { fighters, selection, versus, portrait } = options;
  const node = (tag: string, className: string, text = ''): HTMLElement => {
    const element = document.createElement(tag); element.className = className; element.textContent = text; return element;
  };
  const button = (label: string, className: string, action: () => void): HTMLButtonElement => {
    const element = document.createElement('button'); element.className = className; element.textContent = label; element.onclick = action; return element;
  };
  for (const player of [0, 1] as const satisfies readonly SelectionPlayer[]) {
    const entry = player === 1 && !versus ? options.opponent : fighters[selection.indices[player]];
    const side = player === 0 ? 'left' : 'right';
    const hero = node('div', `arena-hero ${side}`); if (entry.id === 'shoto') hero.append(portrait('130 35 510 710', true));
    else hero.append(node('div', 'arena-placeholder', 'ARTE PENDENTE'));
    const name = node('div', `arena-fighter-name ${side}`);
    name.append(node('span', 'arena-eyebrow', player === 1 && !versus ? 'ADVERSÁRIO' : `PLAYER 0${player + 1}`), node('h1', '', entry.name));
    if (versus) name.append(button(selection.ready[player] ? `P${player + 1} · PRONTO` : `ESCOLHER P${player + 1}`, 'arena-player-switch', () => { selection.activePlayer = player; options.refresh(); }));
    root.append(hero, name);
  }
  const panel = node('div', 'arena-selection');
  panel.append(node('span', 'arena-eyebrow', options.modeTitle), node('h2', '', versus ? `ESCOLHA DE P${selection.activePlayer + 1}` : 'ESCOLHA SEU LUTADOR'));
  const grid = node('div', 'arena-roster'); grid.setAttribute('role', 'group'); grid.setAttribute('aria-label', 'Personagens disponíveis');
  fighters.forEach((entry, index) => {
    const tile = button('', 'arena-portrait', () => { selection.select(selection.activePlayer, index); options.refresh(); });
    tile.setAttribute('aria-label', entry.name); tile.setAttribute('aria-pressed', String(!selection.random[selection.activePlayer] && index === selection.indices[selection.activePlayer]));
    if (entry.id === 'shoto') tile.append(portrait('280 65 180 180'));
    tile.append(node('span', '', entry.name));
    if (versus) {
      const cursors = node('div', 'arena-cursors');
      for (const player of [0, 1] as const) if (!selection.random[player] && selection.indices[player] === index) cursors.append(node('b', `cursor-p${player + 1}`, `P${player + 1}`));
      tile.append(cursors);
    }
    grid.append(tile);
  });
  for (let index = fighters.length; index < 9; index++) {
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
  const status = node('p', 'arena-opponent', versus
    ? `P1 ${selection.ready[0] ? 'PRONTO' : 'ESCOLHENDO'} · P2 ${selection.ready[1] ? 'PRONTO' : 'ESCOLHENDO'}`
    : `P2 · ${options.opponent.name} · ${options.modeTitle}`);
  status.setAttribute('role', 'status');
  panel.append(grid, random, status, button(versus ? `CONFIRMAR P${selection.activePlayer + 1}  →` : 'CONFIRMAR PERSONAGEM  →', 'arena-confirm', options.confirm), button('← VOLTAR', 'arena-back', options.back));
  root.append(panel);
}
