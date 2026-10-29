export type SelectionPlayer = 0 | 1;

/** Independent cursors and confirmations; the roster grid is shared by both players. */
export class FighterSelection {
  readonly indices: [number, number] = [0, 0];
  readonly ready: [boolean, boolean] = [false, false];
  readonly random: [boolean, boolean] = [false, false];
  activePlayer: SelectionPlayer = 0;

  constructor(private readonly rosterSize: number) {}

  select(player: SelectionPlayer, index: number): void {
    this.activePlayer = player;
    this.random[player] = false;
    this.indices[player] = (index % this.rosterSize + this.rosterSize) % this.rosterSize;
    this.ready[player] = false;
  }

  selectRandom(player: SelectionPlayer): void {
    this.activePlayer = player;
    this.random[player] = true;
    this.ready[player] = false;
  }

  move(player: SelectionPlayer, direction: -1 | 1): void {
    const current = this.random[player] ? this.rosterSize : this.indices[player];
    const next = (current + direction + this.rosterSize + 1) % (this.rosterSize + 1);
    if (next === this.rosterSize) this.selectRandom(player);
    else this.select(player, next);
  }

  confirm(player: SelectionPlayer, versus: boolean): boolean {
    if (this.random[player]) {
      this.indices[player] = Math.floor(Math.random() * this.rosterSize);
      this.random[player] = false;
    }
    this.ready[player] = true;
    if (!versus) return true;
    this.activePlayer = this.ready[0] ? 1 : 0;
    return this.ready.every(Boolean);
  }

  reopen(): void {
    this.ready.fill(false);
    this.random.fill(false);
    this.activePlayer = 0;
  }
}
