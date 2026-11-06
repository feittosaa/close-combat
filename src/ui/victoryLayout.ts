/** Longest side that still lets vertical text fit: `natural` is the text length at a 1 px font, `available` the strip length. */
export function fitFontSize(natural: number, available: number, max: number): number {
  if (!(natural > 0) || !(available > 0)) return max;
  return Math.min(max, available / natural);
}

/** Text shown on the side strips; the right one carries the champion's name. */
export const VICTORY_TITLE = 'CLOSE COMBAT';
export const VICTORY_WINNER = 'WINNER';
export const winnerLine = (name: string): string => `${VICTORY_WINNER}  ${name.toUpperCase()}`;
