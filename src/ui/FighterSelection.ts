export type SelectionPlayer = 0 | 1;

/** Independent cursors and confirmations; the roster grid is shared by both players. */
export class FighterSelection {
  readonly indices: [number, number] = [0, 0];
  readonly ready: [boolean, boolean] = [false, false];
  readonly random: [boolean, boolean] = [false, false];
  readonly choosingColor: [boolean, boolean] = [false, false];
  readonly palettes: [0 | 1, 0 | 1] = [0, 0];
  activePlayer: SelectionPlayer = 0;

  constructor(private readonly rosterSize: number) {}

  select(player: SelectionPlayer, index: number): void {
    this.activePlayer = player;
    this.random[player] = false;
    this.choosingColor[player] = false;
    this.palettes[player] = 0;
    this.indices[player] = (index % this.rosterSize + this.rosterSize) % this.rosterSize;
    this.ready[player] = false;
  }

  selectRandom(player: SelectionPlayer): void {
    this.activePlayer = player;
    this.choosingColor[player] = false;
    this.random[player] = true;
    this.ready[player] = false;
  }

  move(player: SelectionPlayer, direction: -1 | 1): void {
    if (this.choosingColor[player]) { this.selectPalette(player, this.palettes[player] === 0 ? 1 : 0); return; }
    const current = this.random[player] ? this.rosterSize : this.indices[player];
    const next = (current + direction + this.rosterSize + 1) % (this.rosterSize + 1);
    if (next === this.rosterSize) this.selectRandom(player);
    else this.select(player, next);
  }

  selectPalette(player: SelectionPlayer, palette: 0 | 1): void {
    if (!this.choosingColor[player]) return;
    this.activePlayer = player;
    this.palettes[player] = palette;
    this.ready[player] = false;
  }

  confirm(player: SelectionPlayer, versus: boolean): boolean {
    this.activePlayer = player;
    if (this.random[player]) {
      this.indices[player] = Math.floor(Math.random() * this.rosterSize);
      this.random[player] = false;
    }
    if (!this.choosingColor[player]) {
      const other = player === 0 ? 1 : 0;
      if (versus && this.ready[other] && this.indices[player] === this.indices[other])
        this.palettes[player] = this.palettes[other] === 0 ? 1 : 0;
      this.choosingColor[player] = true;
      this.ready[player] = false;
      return false;
    }
    this.ready[player] = true;
    if (!versus) return true;
    this.activePlayer = this.ready[0] ? 1 : 0;
    return this.ready.every(Boolean);
  }

  reopen(): void {
    this.ready.fill(false);
    this.random.fill(false);
    this.choosingColor.fill(false);
    this.activePlayer = 0;
  }
}
