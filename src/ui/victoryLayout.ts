/** Words on the side strips, each set apart in the loop: the left one names the game, the right one the champion. */
export const VICTORY_TITLE = ['CLOSE', 'COMBAT'] as const;
export const VICTORY_WINNER = 'WINNER';
/** `WINNER`, then `PLAYER 1`/`PLAYER 2` in a PvP match, then the champion's name in capitals. */
export const winnerWords = (name: string, player?: 1 | 2): string[] =>
  [VICTORY_WINNER, ...(player ? [`PLAYER ${player}`] : []), name.toUpperCase()];
