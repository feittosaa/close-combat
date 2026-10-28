export type SelectionPlayer = 0 | 1;

/** Independent cursors and confirmations; the roster grid is shared by both players. */
export class FighterSelection {
  readonly indices: [number, number] = [0, 0];
  readonly ready: [boolean, boolean] = [false, false];
  activePlayer: SelectionPlayer = 0;

  constructor(private readonly rosterSize: number) {}

  select(player: SelectionPlayer, index: number): void {
    this.activePlayer = player;
    this.indices[player] = (index % this.rosterSize + this.rosterSize) % this.rosterSize;
    this.ready[player] = false;
  }

  confirm(player: SelectionPlayer, versus: boolean): boolean {
    this.ready[player] = true;
    if (!versus) return true;
    this.activePlayer = this.ready[0] ? 1 : 0;
    return this.ready.every(Boolean);
  }

  reopen(): void {
    this.ready.fill(false);
    this.activePlayer = 0;
  }
}
