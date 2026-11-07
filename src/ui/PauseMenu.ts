import { getPlayerLayout } from '../input/controlSettings';
import { commandNode, formatCommand, formatMoveTitle } from './commandNotation';
import type { CharacterDefinition } from '../engine/data/characters';
import { t } from '../i18n/i18n';
import { fighterMoveList, filterMoveList, type MoveListCategory, type MoveListEntry } from '../training/MoveList';

const CATEGORIES: readonly MoveListCategory[] = ['all', 'basics', 'combos', 'crouching', 'power', 'throw', 'special', 'ultimate'];
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag); if (text) node.textContent = text; if (className) node.className = className; return node;
};
/** Accessible DOM overlay. Only reads each fighter's book; it never executes combat. */
export class PauseMenu {
  private readonly root = el('section', undefined, 'combat-pause');
  private readonly body = el('div', undefined, 'pause-body');
  private readonly categories = el('nav', undefined, 'pause-categories');
  private readonly rows = el('div', undefined, 'pause-moves');
  private readonly details = el('article', undefined, 'pause-details');
  private readonly search = el('input');
  private readonly count = el('p', '', 'pause-count');
  private entries: readonly MoveListEntry[] = [];
  private category: MoveListCategory = 'all';
  private fighterIndex = 0;
  private visible = false;
  private readonly onKey = (event: KeyboardEvent): void => {
    if (event.key !== 'Tab') return;
    const focusable = [...this.root.querySelectorAll<HTMLElement>('button,input')].filter(node => !node.hasAttribute('disabled') && node.getClientRects().length > 0);
    const index = focusable.indexOf(document.activeElement as HTMLElement);
    if (event.shiftKey && index === 0) { event.preventDefault(); focusable[focusable.length - 1]?.focus(); }
    else if (!event.shiftKey && index === focusable.length - 1) { event.preventDefault(); focusable[0]?.focus(); }
  };

  constructor(private readonly fighters: readonly CharacterDefinition[], training: boolean,
    resume: () => void, menu: () => void, private readonly pin: (entry: MoveListEntry, playerIndex: number) => void, step?: () => void, controls?: () => void, fillRage?: () => void, developer?: { label: string; open: () => void }) {
    this.root.classList.toggle('match-pause', !training);
    this.root.setAttribute('role', 'dialog'); this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-label', t(training ? 'pause.trainingLabel' : 'pause.matchLabel'));
    const panel = el('div', undefined, 'pause-panel');
    const header = el('header'); header.append(el('p', 'CLOSE COMBAT', 'pause-eyebrow'), el('h1', t(training ? 'pause.trainingTitle' : 'pause.matchTitle')));
    const actions = el('div', undefined, 'pause-actions');
    const resumeButton = el('button', t('pause.resume')); resumeButton.onclick = resume;
    const menuButton = el('button', t('pause.menu')); menuButton.onclick = menu;
    const controlsButton = el('button', t('pause.controls')); controlsButton.onclick = () => controls?.();
    actions.append(resumeButton, controlsButton, menuButton);
    if (developer) { const developerButton = el('button', developer.label); developerButton.onclick = developer.open; controlsButton.after(developerButton); }
    if (training) {
      const inspect = el('button', t('pause.inspect'));
      inspect.onclick = () => {
        const inspecting = this.root.classList.toggle('inspection');
        inspect.textContent = t(inspecting ? 'pause.moveList' : 'pause.inspect');
      };
      const next = el('button', t('pause.step')); next.onclick = () => step?.();
      const rage = el('button', t('pause.fillRage')); rage.onclick = () => fillRage?.();
      actions.prepend(inspect, next, rage);
    }
    header.append(actions); panel.append(header);
    if (training) {
      const tools = el('div', undefined, 'pause-tools');
      fighters.forEach((fighter, index) => {
        const button = el('button', `P${index + 1} · ${fighter.name}`);
        button.onclick = () => { this.fighterIndex = index; this.category = 'all'; this.search.value = ''; this.loadFighter(); };
        tools.append(button);
      });
      this.search.type = 'search'; this.search.placeholder = t('pause.search'); this.search.setAttribute('aria-label', t('pause.search'));
      this.search.oninput = () => this.renderRows(); tools.append(this.search, this.count); panel.append(tools);
      this.categories.setAttribute('aria-label', t('pause.categories')); this.rows.setAttribute('aria-label', t('pause.moves'));
      this.body.append(this.categories, this.rows, this.details); panel.append(this.body);
      panel.append(el('p', t('pause.legend'), 'pause-legend'));
      this.loadFighter();
    } else panel.append(el('p', t('pause.matchLegend'), 'pause-legend'));
    panel.dataset.banner = t('pause.banner');
    this.root.append(panel); this.root.hidden = true; document.body.append(this.root);
    this.root.addEventListener('keydown', this.onKey);
  }

  setVisible(visible: boolean): void {
    this.visible = visible; this.root.hidden = !visible;
    if (visible) { this.root.classList.remove('inspection'); this.root.querySelectorAll('button').forEach(button => { if (button.textContent === t('pause.moveList')) button.textContent = t('pause.inspect'); }); }
    if (visible) this.root.querySelector<HTMLButtonElement>('button')?.focus();
    else document.querySelector<HTMLCanvasElement>('#game canvas')?.focus();
  }
  refresh(): void { this.loadFighter(); }
  isVisible(): boolean { return this.visible; }
  isEditing(): boolean { return this.root.contains(document.activeElement) && document.activeElement === this.search; }
  destroy(): void { this.root.removeEventListener('keydown', this.onKey); this.root.remove(); }

  private loadFighter(): void {
    this.entries = fighterMoveList(this.fighters[this.fighterIndex]);
    this.categories.replaceChildren();
    for (const category of CATEGORIES) {
      const count = category === 'all' ? this.entries.length : this.entries.filter(entry => entry.categories.includes(category)).length;
      if (!count && category !== 'all') continue;
      const button = el('button', `${t(`category.${category}`)} · ${count}`);
      button.setAttribute('aria-pressed', String(category === this.category));
      button.onclick = () => {
        this.category = category;
        this.categories.querySelectorAll('button').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
        this.renderRows();
      };
      this.categories.append(button);
    }
    this.renderRows();
  }

  private renderRows(): void {
    const layout = getPlayerLayout(this.fighterIndex);
    const term = this.search.value.trim().toLocaleLowerCase();
    const entries = filterMoveList(this.entries, this.category, '').filter(entry => !term ||
      `${entry.title} ${entry.notation} ${formatMoveTitle(entry.title,layout)} ${formatCommand(entry.notation,layout)}`.toLocaleLowerCase().includes(term));
    this.count.textContent = t('pause.count', { name: this.fighters[this.fighterIndex].name, shown: entries.length, total: this.entries.length });
    this.rows.replaceChildren();
    for (const entry of entries) {
      const button = el('button', undefined, 'pause-move');
      const command = el('strong'); command.append(commandNode(entry.notation,layout));
      button.append(command, el('span', formatMoveTitle(entry.title,layout)));
      button.onclick = () => this.showDetails(entry); this.rows.append(button);
    }
    if (!entries.length) { this.rows.append(el('p', t('pause.noMoves'))); this.details.replaceChildren(); }
    else this.showDetails(entries[0]);
  }

  private showDetails(entry: MoveListEntry): void {
    const layout = getPlayerLayout(this.fighterIndex);
    const commandLine = el('p', undefined, 'pause-command'); commandLine.append(commandNode(entry.notation,layout));
    this.details.replaceChildren(el('p', this.fighters[this.fighterIndex].name, 'pause-eyebrow'), el('h2', formatMoveTitle(entry.title,layout)), commandLine);
    if (entry.move) {
      const move = entry.move;
      if (move.category === 'throw') {
        const cowboy = this.fighters[this.fighterIndex].id === 'cowboy';
        if (cowboy && move.id === 'throw-24') this.details.append(el('p', t('pause.lowLasso')));
        else this.details.append(el('p', t('pause.throwDirection')));
        if (cowboy) this.details.append(el('p', t('pause.throwEscape', { buttons: move.input.buttons.join(t('pause.or')) })));
      }
      if (move.rageCost) this.details.append(el('p', t('pause.rageCost', { cost: move.rageCost })));
      if (move.invulnerability) this.details.append(el('p', t(move.invulnerability.kind === 'all' ? 'pause.invulnerableAttacks' : 'pause.invulnerableProjectiles', { frames: move.invulnerability.until })));
      if (move.projectile) this.details.append(el('p', t('pause.projectile', { speed: move.projectile.speed, life: move.projectile.life })));
      const level = (id: typeof move.hitLevel) => t(`level.${id}`);
      const hitLevel = move.screenVolley?.firstHitLevel ? t('pause.firstShot', { first: level(move.screenVolley.firstHitLevel), rest: level(move.hitLevel) }) : level(move.hitLevel);
      this.details.append(el('p', t('pause.damage', { level: hitLevel, damage: move.damage })));
      const timeline = el('div', undefined, 'pause-timeline');
      for (const [label, frames, cls] of [[t('pause.startup'), move.startup, 'startup'], [t('pause.active'), move.activeFrames, 'active'], [t('pause.recovery'), move.recovery, 'recovery']] as const) {
        const block = el('span', `${label} ${frames}F`, cls); block.style.flexGrow = String(frames); timeline.append(block);
      }
      this.details.append(timeline, el('p', t('pause.note'), 'pause-note'));
    }
    if (entry.combo) this.details.append(el('p', t('pause.recipe')));
    const pin = el('button', t('pause.pin')); pin.onclick = () => this.pin(entry,this.fighterIndex); this.details.append(pin);
  }
}
