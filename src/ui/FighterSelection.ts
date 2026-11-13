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

  /** A color already confirmed by the other player on the same fighter cannot be chosen again. */
  isPaletteLocked(player: SelectionPlayer, palette: 0 | 1): boolean {
    const other = player === 0 ? 1 : 0;
    return this.ready[other] && !this.random[other] && this.indices[player] === this.indices[other] && this.palettes[other] === palette;
  }

  selectPalette(player: SelectionPlayer, palette: 0 | 1): void {
    if (!this.choosingColor[player] || this.isPaletteLocked(player, palette)) return;
    this.activePlayer = player;
    this.palettes[player] = palette;
    this.ready[player] = false;
    this.separatePalettes(player);
  }

  /** Same fighter on both sides never repeats a color: the other player keeps the leftover one. */
  private separatePalettes(player: SelectionPlayer): void {
    const other = player === 0 ? 1 : 0;
    if (this.random[other] || !this.choosingColor[other] || this.ready[other] || this.indices[player] !== this.indices[other]) return;
    const free = this.palettes[player] === 0 ? 1 : 0;
    if (this.palettes[other] === free) return;
    this.palettes[other] = free;
    this.ready[other] = false;
  }

  confirm(player: SelectionPlayer, versus: boolean): boolean {
    this.activePlayer = player;
    // The random pick is ready at once, with no colour step: fighter and colour are drawn when the fight starts.
    if (this.random[player]) { this.choosingColor[player] = false; this.ready[player] = true; return this.finish(versus); }
    if (!this.choosingColor[player]) {
      const other = player === 0 ? 1 : 0;
      if (versus && !this.random[other] && (this.choosingColor[other] || this.ready[other]) && this.indices[player] === this.indices[other])
        this.palettes[player] = this.palettes[other] === 0 ? 1 : 0;
      this.choosingColor[player] = true;
      this.ready[player] = false;
      return false;
    }
    this.ready[player] = true;
    return this.finish(versus);
  }

  private finish(versus: boolean): boolean {
    if (!versus) return true;
    this.activePlayer = this.ready[0] ? 1 : 0;
    return this.ready.every(Boolean);
  }

  /** Draws a fighter for each random selection; random always uses the original color. */
  resolveRandoms(random: () => number = Math.random, selectOpponent = true): void {
    for (const player of (selectOpponent ? [0, 1] : [0]) as readonly SelectionPlayer[]) {
      if (!this.random[player]) continue;
      this.indices[player] = Math.min(this.rosterSize - 1, Math.floor(random() * this.rosterSize));
      this.palettes[player] = 0;
      this.random[player] = false;
    }
  }

  reopen(): void {
    this.ready.fill(false);
    this.random.fill(false);
    this.choosingColor.fill(false);
    this.activePlayer = 0;
  }
}
