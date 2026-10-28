import type { AttackButton, Direction, FrameInput } from '../input/types';
import type { KeyboardLayout } from '../input/KeyboardInput';
import { BUTTON_COLORS, getPlayerLayout, keyLabel } from '../input/controlSettings';
export const DIRECTION_ARROWS: Record<Direction,string> = {N:'•',F:'→',B:'←',U:'↑',D:'↓',DF:'↘',DB:'↙',UF:'↗',UB:'↖'};
export interface CommandToken { text: string; button?: AttackButton }
/** Only command notation is translated. Frame data, move IDs and engine commands stay unchanged. */
export function commandTokens(notation: string, layout = getPlayerLayout()): CommandToken[] {
  const parts = notation.split(/(\b(?:df|fd|db|bd|uf|ub|f|b|u|d|n)\b|(?<!\d)[1-4](?!\d))/gi);
  return parts.filter(Boolean).map(part => {
    if (/^[1-4]$/.test(part)) return { text: keyLabel(layout.buttons[part as AttackButton]), button: part as AttackButton };
    const direction = part.toUpperCase().replace(/^FD$/, 'DF').replace(/^BD$/, 'DB') as Direction;
    return { text: DIRECTION_ARROWS[direction] ?? part.replace(/\s>\s/g,'  ›  ') };
  });
}
export function formatCommand(notation: string, layout?: KeyboardLayout): string { return commandTokens(notation,layout).map(token=>token.text).join(''); }
export function formatMoveTitle(title: string, layout?: KeyboardLayout): string {
  const split = title.indexOf(' · ');
  return split >= 0 ? title.slice(0,split+3) + formatCommand(title.slice(split+3),layout) : title;
}
export function commandNode(notation: string, layout = getPlayerLayout()): HTMLSpanElement {
  const root = document.createElement('span'); root.className = 'command-notation';
  commandTokens(notation,layout).forEach(token => {
    const node = document.createElement('span'); node.textContent = token.text;
    if (/[→←↑↓↗↖↘↙•]/.test(token.text)) node.className = 'command-direction';
    if (token.button) { node.className = 'command-button'; node.style.color = BUTTON_COLORS[token.button]; }
    root.append(node);
  });
  return root;
}
export function formatFrameInput(input: FrameInput, layout: KeyboardLayout): string {
  const arrow = DIRECTION_ARROWS[input.direction];
  const buttons = [...input.buttons].sort().map(button => keyLabel(layout.buttons[button])).join('+');
  return `${arrow}${buttons ? ' '+buttons : ''}`;
}

export function formatCommandProse(text: string, layout = getPlayerLayout()): string {
  return text.replace(/\b(?:(?:(?:f|b|d|u|df|db|uf|ub|n)[,+])+(?:[1-4](?:[,+][1-4])*)?|(?:ws|fc)[1-4]|[1-4](?:[,+][1-4])+)\b/gi, command => formatCommand(command,layout));
}

export function screenDirection(direction: Direction, facing: 'left'|'right'): Direction {
  return facing === 'right' ? direction : ({F:'B',B:'F',DF:'DB',DB:'DF',UF:'UB',UB:'UF'} as Partial<Record<Direction,Direction>>)[direction] ?? direction;
}
