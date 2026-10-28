import { getPlayerLayout } from '../input/controlSettings';
import { commandNode, formatCommand, formatMoveTitle } from './commandNotation';
import type { CharacterDefinition } from '../engine/data/characters';
import { fighterMoveList, filterMoveList, type MoveListCategory, type MoveListEntry } from '../training/MoveList';

const labels: Record<MoveListCategory, string> = { all: 'Todos', basics: 'Básicos', combos: 'Combos', crouching: 'Abaixados', power: 'Potentes', throw: 'Agarrões', special: 'Especiais', ultimate: 'Ultimate' };
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
    resume: () => void, menu: () => void, private readonly pin: (entry: MoveListEntry, playerIndex: number) => void, step?: () => void, controls?: () => void, fillRage?: () => void) {
    this.root.classList.toggle('match-pause', !training);
    this.root.setAttribute('role', 'dialog'); this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-label', training ? 'Treino pausado — lista de golpes' : 'Partida pausada');
    const panel = el('div', undefined, 'pause-panel');
    const header = el('header'); header.append(el('p', 'CLOSE COMBAT', 'pause-eyebrow'), el('h1', training ? 'Treino pausado' : 'Partida pausada'));
    const actions = el('div', undefined, 'pause-actions');
    const resumeButton = el('button', 'Continuar · P / Esc'); resumeButton.onclick = resume;
    const menuButton = el('button', 'Voltar ao menu'); menuButton.onclick = menu;
    const controlsButton = el('button', 'Controles'); controlsButton.onclick = () => controls?.();
    actions.append(resumeButton, controlsButton, menuButton);
    if (training) {
      const inspect = el('button', 'Inspecionar luta');
      inspect.onclick = () => {
        const inspecting = this.root.classList.toggle('inspection');
        inspect.textContent = inspecting ? 'Ver lista de golpes' : 'Inspecionar luta';
      };
      const next = el('button', 'Avançar 1 frame · .'); next.onclick = () => step?.();
      const rage = el('button', 'Encher rage · treino'); rage.onclick = () => fillRage?.();
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
      this.search.type = 'search'; this.search.placeholder = 'Buscar golpe ou comando'; this.search.setAttribute('aria-label', 'Buscar golpe ou comando');
      this.search.oninput = () => this.renderRows(); tools.append(this.search, this.count); panel.append(tools);
      this.categories.setAttribute('aria-label', 'Categorias de golpes'); this.rows.setAttribute('aria-label', 'Lista de golpes');
      this.body.append(this.categories, this.rows, this.details); panel.append(this.body);
      panel.append(el('p', 'Vírgula: sequência · +: simultâneo · Frente/trás relativos ao personagem · Teclas conforme seus controles.', 'pause-legend'));
      this.loadFighter();
    } else panel.append(el('p', 'A luta e o cronômetro estão pausados.', 'pause-legend'));
    this.root.append(panel); this.root.hidden = true; document.body.append(this.root);
    this.root.addEventListener('keydown', this.onKey);
  }

  setVisible(visible: boolean): void {
    this.visible = visible; this.root.hidden = !visible;
    if (visible) { this.root.classList.remove('inspection'); this.root.querySelectorAll('button').forEach(button => { if (button.textContent === 'Ver lista de golpes') button.textContent = 'Inspecionar luta'; }); }
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
    for (const category of Object.keys(labels) as MoveListCategory[]) {
      const count = category === 'all' ? this.entries.length : this.entries.filter(entry => entry.categories.includes(category)).length;
      if (!count && category !== 'all') continue;
      const button = el('button', `${labels[category]} · ${count}`);
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
    this.count.textContent = `${this.fighters[this.fighterIndex].name} · ${entries.length} de ${this.entries.length}`;
    this.rows.replaceChildren();
    for (const entry of entries) {
      const button = el('button', undefined, 'pause-move');
      const command = el('strong'); command.append(commandNode(entry.notation,layout));
      button.append(command, el('span', formatMoveTitle(entry.title,layout)));
      button.onclick = () => this.showDetails(entry); this.rows.append(button);
    }
    if (!entries.length) { this.rows.append(el('p', 'Nenhum golpe encontrado.')); this.details.replaceChildren(); }
    else this.showDetails(entries[0]);
  }

  private showDetails(entry: MoveListEntry): void {
    const layout = getPlayerLayout(this.fighterIndex);
    const commandLine = el('p', undefined, 'pause-command'); commandLine.append(commandNode(entry.notation,layout));
    this.details.replaceChildren(el('p', this.fighters[this.fighterIndex].name, 'pause-eyebrow'), el('h2', formatMoveTitle(entry.title,layout)), commandLine);
    if (entry.move) {
      const move = entry.move;
      if (move.category === 'throw') this.details.append(el('p', 'Ao iniciar o comando, segure frente para lançar à frente ou trás para lançar atrás. Sem direção, lança à frente.'));
      if (move.rageCost) this.details.append(el('p', `Exige ${move.rageCost} de rage; consome ao iniciar.`));
      if (move.invulnerability) this.details.append(el('p', `Invulnerável ${move.invulnerability.kind === 'all' ? 'a ataques' : 'a projéteis'} por ${move.invulnerability.until}F.`));
      if (move.projectile) this.details.append(el('p', `Projétil · velocidade ${move.projectile.speed} · duração ${move.projectile.life}F.`));
      const levels = { high: 'Alto', mid: 'Médio', low: 'Baixo', air: 'Aéreo', throw: 'Agarrão', special: 'Especial' };
      this.details.append(el('p', `${levels[move.hitLevel]} · dano ${move.damage}`));
      const timeline = el('div', undefined, 'pause-timeline');
      for (const [label, frames, cls] of [['Preparo', move.startup, 'startup'], ['Atividade', move.activeFrames, 'active'], ['Recuperação', move.recovery, 'recovery']] as const) {
        const block = el('span', `${label} ${frames}F`, cls); block.style.flexGrow = String(frames); timeline.append(block);
      }
      this.details.append(timeline, el('p', 'Valores provisórios para balanceamento. Receitas fechadas funcionam também no vazio, após a atividade do golpe. Fora delas, só o acerto permite trocar de golpe e continuar. Forte impede voltar ao fraco até o fim da sequência.', 'pause-note'));
    }
    if (entry.combo) this.details.append(el('p', 'Receita manual aprovada pelo usuário.'));
    const pin = el('button', 'Fixar comando no treino'); pin.onclick = () => this.pin(entry,this.fighterIndex); this.details.append(pin);
  }
}
