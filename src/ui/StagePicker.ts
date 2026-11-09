import { resolveChoice, type StageChoice, type StageGroup } from '../rendering/stages/stageGroups';

/**
 * State of the stage selector. Both players choose at the same time, each with their own cursor, and a scenery with
 * variations opens a plate for one player at a time (the other waits). `active` lists who chooses: one player in the
 * Arcade and in a rematch (the previous winner), two otherwise.
 */
export class StagePicker {
  readonly cursors: number[] = [0, 0];
  readonly ready = [false, false];
  readonly choices: (StageChoice | undefined)[] = [undefined, undefined];
  readonly variants: Record<string, string> = {};
  plateFor?: 0 | 1;
  /** Whose cursor drives the preview and the name. */
  focus: 0 | 1;
  private queue: (0 | 1)[] = [];

  constructor(readonly active: readonly (0 | 1)[], readonly groups: readonly StageGroup[]) { this.focus = active[0]; }

  /** Tiles plus the random tile after them. */
  get total(): number { return this.groups.length + 1; }
  get done(): boolean { return this.active.every(player => this.ready[player]); }
  private groupAt(player: 0 | 1): StageGroup | undefined { return this.groups[this.cursors[player]]; }
  private currentVariant(group: StageGroup): string { return this.variants[group.id] ?? group.variants[0]; }

  /** Moves a cursor; ignored once the player is ready or while a plate is open. */
  move(player: 0 | 1, direction: number): void {
    if (!this.active.includes(player) || this.ready[player] || this.plateFor !== undefined) return;
    this.cursors[player] = (this.cursors[player] + direction + this.total) % this.total; this.focus = player;
  }
  /** Puts a cursor on a tile (hover) without choosing it. */
  point(player: 0 | 1, index: number): void {
    if (!this.active.includes(player) || this.ready[player] || this.plateFor !== undefined || index < 0 || index >= this.total) return;
    this.cursors[player] = index; this.focus = player;
  }
  /** Confirms the tile under a cursor, or the variation shown on the player's plate. Returns true when everyone has chosen. */
  confirm(player: 0 | 1): boolean {
    if (!this.active.includes(player) || this.ready[player]) return false;
    if (this.plateFor === player) return this.commitVariant(player, this.currentVariant(this.groupAt(player)!));
    const group = this.groupAt(player);
    if (!group) return this.commit(player, { groupId: 'random' });
    if (group.variants.length === 1) return this.commit(player, { groupId: group.id });
    if (this.plateFor === undefined) { this.plateFor = player; this.focus = player; } else if (!this.queue.includes(player)) this.queue.push(player);
    return false;
  }
  /** Picks a variation on the plate that is open (mouse). */
  chooseVariant(stageId: string): boolean {
    return this.plateFor === undefined ? false : this.commitVariant(this.plateFor, stageId);
  }
  moveVariant(player: 0 | 1, direction: number): void {
    const group = this.plateFor === player ? this.groupAt(player) : undefined;
    if (!group) return;
    const current = group.variants.indexOf(this.currentVariant(group));
    this.variants[group.id] = group.variants[(current + direction + group.variants.length) % group.variants.length];
  }
  /** Esc: closes the plate, else takes back every choice, else asks to leave. */
  cancel(): 'plate' | 'choices' | 'leave' {
    if (this.plateFor !== undefined) { this.plateFor = this.queue.shift(); return 'plate'; }
    if (this.ready.some(Boolean)) { this.ready.fill(false); this.choices.fill(undefined); return 'choices'; }
    return 'leave';
  }

  private commitVariant(player: 0 | 1, stageId: string): boolean {
    const group = this.groupAt(player)!;
    this.variants[group.id] = stageId;
    return this.commit(player, { groupId: group.id, variantId: stageId });
  }
  private commit(player: 0 | 1, choice: StageChoice): boolean {
    this.ready[player] = true; this.choices[player] = choice;
    if (this.plateFor === player) this.plateFor = this.queue.shift();
    this.queue = this.queue.filter(waiting => waiting !== player);
    return this.done;
  }
  /** Scenery stood for by one player's choice. */
  stageOf(player: 0 | 1, groups: readonly StageGroup[], random?: () => number): string {
    return resolveChoice(this.choices[player]!, groups, random);
  }
}
