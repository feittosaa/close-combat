import type { CharacterDefinition } from '../engine/data/characters';
import { CATEGORY_LABELS } from '../engine/data/combat/CombatBook';
import { fighterMoveList, filterMoveList, type MoveListCategory, type MoveListEntry } from '../training/MoveList';
import { moveInputLabel } from './combatLabels';

const labels: Record<MoveListCategory, string> = { all: 'Todos', basics: CATEGORY_LABELS.basics, strings: CATEGORY_LABELS.strings, combos: 'Combos', specials: CATEGORY_LABELS.specials, throws: CATEGORY_LABELS.throws, starters: CATEGORY_LABELS.starters, crouching: CATEGORY_LABELS.crouching, rising: CATEGORY_LABELS.rising, stances: CATEGORY_LABELS.stances, defense: CATEGORY_LABELS.defense, wall: CATEGORY_LABELS.wall };
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
    resume: () => void, menu: () => void, private readonly pin: (entry: MoveListEntry) => void, step?: () => void) {
    this.root.setAttribute('role', 'dialog'); this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-label', training ? 'Treino pausado — lista de golpes' : 'Partida pausada');
    const panel = el('div', undefined, 'pause-panel');
    const header = el('header'); header.append(el('p', 'CLOSE COMBAT', 'pause-eyebrow'), el('h1', training ? 'Treino pausado' : 'Partida pausada'));
    const actions = el('div', undefined, 'pause-actions');
    const resumeButton = el('button', 'Continuar · P / Esc'); resumeButton.onclick = resume;
    const menuButton = el('button', 'Voltar ao menu'); menuButton.onclick = menu;
    actions.append(resumeButton, menuButton);
    if (training) {
      const inspect = el('button', 'Inspecionar luta');
      inspect.onclick = () => {
        const inspecting = this.root.classList.toggle('inspection');
        inspect.textContent = inspecting ? 'Ver lista de golpes' : 'Inspecionar luta';
      };
      const next = el('button', 'Avançar 1 frame · .'); next.onclick = () => step?.();
      actions.prepend(inspect, next);
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
      panel.append(el('p', '1 / 2: socos · 3 / 4: chutes · F: frente · B: trás · D: baixo · U: cima · N: neutro · WS: ao levantar · FC: agachamento completo · “:” execução precisa · ~ ligação rápida · * segurar. SS usa esquiva 2D. DVK/H: Fulgor · R: vida até 25%.', 'pause-legend'));
      this.loadFighter();
    } else panel.append(el('p', 'A luta, o cronômetro e os projéteis estão pausados.', 'pause-legend'));
    this.root.append(panel); this.root.hidden = true; document.body.append(this.root);
    this.root.addEventListener('keydown', this.onKey);
  }

  setVisible(visible: boolean): void {
    this.visible = visible; this.root.hidden = !visible;
    if (visible) { this.root.classList.remove('inspection'); this.root.querySelectorAll('button').forEach(button => { if (button.textContent === 'Ver lista de golpes') button.textContent = 'Inspecionar luta'; }); }
    if (visible) this.root.querySelector<HTMLButtonElement>('button')?.focus();
    else document.querySelector<HTMLCanvasElement>('#game canvas')?.focus();
  }
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
    const entries = filterMoveList(this.entries, this.category, this.search.value);
    this.count.textContent = `${this.fighters[this.fighterIndex].name} · ${entries.length} de ${this.entries.length}`;
    this.rows.replaceChildren();
    for (const entry of entries) {
      const button = el('button', undefined, 'pause-move');
      button.append(el('strong', entry.notation), el('span', entry.title));
      if (entry.move?.combat?.animation.status === 'provisional') button.append(el('small', 'Arte provisória'));
      button.onclick = () => this.showDetails(entry); this.rows.append(button);
    }
    if (!entries.length) { this.rows.append(el('p', 'Nenhum golpe encontrado.')); this.details.replaceChildren(); }
    else this.showDetails(entries[0]);
  }

  private showDetails(entry: MoveListEntry): void {
    this.details.replaceChildren(el('p', this.fighters[this.fighterIndex].name, 'pause-eyebrow'), el('h2', entry.title), el('p', entry.notation, 'pause-command'));
    if (entry.move) {
      const move = entry.move;
      const levels = { high: 'Alto', mid: 'Médio', low: 'Baixo', air: 'Aéreo', throw: 'Agarrão', special: 'Especial' };
      this.details.append(el('p', `${levels[move.hitLevel]} · dano ${move.damage} · ${move.combat ? { punch: 'Soco', kick: 'Chute', knee: 'Joelhada', elbow: 'Cotovelo', weapon: 'Arma', body: 'Corpo' }[move.combat.limb] : 'Golpe'}`));
      const timeline = el('div', undefined, 'pause-timeline');
      for (const [label, frames, cls] of [['Preparo', move.startup, 'startup'], ['Atividade', move.activeFrames, 'active'], ['Recuperação', move.recovery, 'recovery']] as const) {
        const block = el('span', `${label} ${frames}F`, cls); block.style.flexGrow = String(Math.max(1, frames)); timeline.append(block);
      }
      this.details.append(timeline);
      if (move.combat) {
        const combat = move.combat;
        this.details.append(el('p', `Contato(s): ${combat.strikes.map(strike => `${strike.from + 1}–${strike.to + 1}F`).join(' / ') || 'Postura, sem hitbox'}`));
        const command = combat.command;
        if (command.parentId) {
          const parent = this.fighters[this.fighterIndex].moves.find(other => other.id === command.parentId);
          this.details.append(el('p', `Continuação de ${parent ? moveInputLabel(parent) : command.parentId}. Entrada após o contato; janela ${command.followupWindow?.from}–${command.followupWindow?.to}F.${command.followupWindow?.onHit ? ' Exige acerto.' : ''}`));
        }
        if (command.directionAliases?.length) this.details.append(el('p', `Atalhos: ${command.directionAliases.map(sequence => sequence.join(',') + '+' + command.buttons.join('+')).join(' / ')}`));
        if (combat.recoveryOnContact !== undefined) this.details.append(el('p', `Recuperação no contato: ${combat.recoveryOnContact}F; ao errar: ${move.recovery}F.`));
        if (command.stance) this.details.append(el('p', `Postura exigida: ${command.stance}. SS: F+1+2+3+4; BT: B+1+2+3+4. WS: soltar agachamento após 6F.`));
        if (command.requiresPower) this.details.append(el('p', 'Exige Fulgor: ativar 2+3 uma vez por round; 600F. Variantes DVK adaptadas ao plano 2D.'));
        if (command.requiresRage) this.details.append(el('p', 'Exige vida até 25%; uma execução por round.'));
        if (command.holdFrames) this.details.append(el('p', `Segurar o botão por ${command.holdFrames}F; soltar antes produz a variante normal.`));
        if (combat.reference) this.details.append(el('p', `Referência T8: ${combat.reference.startup} · bloqueio ${combat.reference.block || '—'} · acerto ${combat.reference.hit || '—'}`));
        if (combat.estimatedFields?.length) this.details.append(el('p', `Dados a confirmar: ${combat.estimatedFields.join(', ')}. Os valores exibidos são provisórios.`, 'pause-note'));
        this.details.append(el('p', 'Caixas e tempos são dados de combate; os desenhos atuais apenas representam as fases. Arte provisória pendente de geração.', 'pause-note'));
      }
      if (move.throw) this.details.append(el('p', `Quebra: ${move.throw.breakAlternatives?.map(buttons => buttons.join('+')).join(' ou ') ?? (move.throw.breakButtons.join('+') || 'sem quebra')} · janela ${move.throw.breakFrames}F`));
    }
    if (entry.combo) {
      this.details.append(el('p', entry.combo.condition ?? 'Executar os comandos, respeitando contato, altura e distância.'), el('p', 'Rotas de referência adaptadas: não há execução automática. Ajustes de posição e timing fazem parte do treino; quebras de cenário usam parede fixa 2D.', 'pause-note'));
    }
    const pin = el('button', 'Fixar comando no treino'); pin.onclick = () => this.pin(entry); this.details.append(pin);
  }
}
