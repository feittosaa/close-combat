/**
 * Procura rotas de combo para o tutorial testando entradas legais na simulação real.
 * Só combina golpes e receitas já existentes; não cria receitas, regras nem dados de combate.
 * Também audita as regras (sem combo infinito, nada depois da ultimate) e lista violações sem corrigi-las.
 * Uso: npm run combos:find  (grava src/training/comboRoutes.json); `-- --only shoto` refaz só esse personagem e preserva os demais;
 * com personagem e comandos, testa uma rota (ver testRoute).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { Simulation } from '../src/engine/simulation/Simulation';
import { characters, type CharacterDefinition } from '../src/engine/data/characters';
import type { CharacterState } from '../src/engine/characters/CharacterState';
import type { HitEvent } from '../src/engine/combat/AttackResolver';
import type { ProjectileState } from '../src/engine/combat/ProjectileState';
import type { ComboRecord } from '../src/engine/simulation/Simulation';
import type { FrameInput } from '../src/input/types';
import { minimumWait, parseCommand, routeInputs, type AdvancedRoute, type ComboRoute, type FighterRoutes, type RouteStep } from '../src/training/comboRoute';
import { TUTORIAL_DISTANCE, lessonCommands, moveCommand, playExample, routeNotation, tutorialGameConfig } from '../src/training/tutorialLessons';

const OUTPUT = new URL('../src/training/comboRoutes.json', import.meta.url);
const WAIT_RANGE = 40;
/** Long enough for an ultimate's cinematic activation before its first hit. */
const LOOKAHEAD = 400;
const MAX_STEPS = 14;
/** Frames after a press within which the fighter must start the move. */
const START_WINDOW = 8;
const BEAM = 400;
/** Per route, a move repeats at most as often as the longest authored strings (1,1,1); specials and power moves less, so loops do not fill the tutorial. */
const MAX_REPEATS = 3;
const MAX_SPECIAL_REPEATS = 2;
/** Routes without an ultimate picked along the easy-to-hard frontier, plus the user's examples and up to two ultimate endings. */
const PLAIN_ROUTES = 6;
const ULTIMATE_ROUTES = 2;
/** Routes the user gave as examples (one press per entry); kept whenever the simulation confirms them. */
const SUGGESTED: Readonly<Record<string, readonly (readonly string[])[]>> = {
  texas: [['3', '3', '3', '1', 'd+1', 'd+1', '4', '4', '2', 'd,df,f,2']],
  shoto: [['1', '1', '2', '1', '1', '1', '3', '3', '2', '2', '2', 'f,d,df,4']],
};
/** Advanced routes join several presses; shorter ones belong to the combos section. */
const MIN_ADVANCED_STEPS = 4;
/** Most damaging routes of each length, with and without an ultimate, rated for difficulty. */
const CANDIDATES_PER_LENGTH = 10;
const config = tutorialGameConfig();

/** Private simulation state, read only by this offline tool. */
interface SimulationInternals { characters: CharacterState[]; lastHitEvents: HitEvent[]; comboHistory: ComboRecord[]; projectiles: ProjectileState[] }
const internals = (sim: Simulation) => sim as unknown as SimulationInternals;

/** Deep copy that keeps prototypes; immutable data (definitions, config, resolver) is shared. */
function cloneSimulation(sim: Simulation, shared: ReadonlySet<unknown>): Simulation {
  const seen = new Map<unknown, unknown>();
  const copy = (value: unknown): unknown => {
    if (value === null || typeof value !== 'object' || shared.has(value)) return value;
    if (seen.has(value)) return seen.get(value);
    if (value instanceof Set) { const out = new Set(); seen.set(value, out); value.forEach(item => out.add(copy(item))); return out; }
    if (value instanceof Map) { const out = new Map(); seen.set(value, out); value.forEach((item, key) => out.set(key, copy(item))); return out; }
    const out = Array.isArray(value) ? [] as unknown[] : Object.create(Object.getPrototypeOf(value));
    seen.set(value, out);
    for (const key of Object.keys(value)) out[key] = copy((value as Record<string, unknown>)[key]);
    return out;
  };
  return copy(sim) as Simulation;
}

interface SearchNode {
  sim: Simulation; steps: RouteStep[]; moveIds: string[];
  /** Frames simulated since the last press; the command's hold direction was kept meanwhile. */
  fed: number; hold: FrameInput['direction']; hits: number; ultimates: number;
  /** Damage of the whole combo if the route stopped here, including hits still to land. */
  damage: number;
}
const N: FrameInput = { direction: 'N', buttons: new Set() };
const playerCombos = (sim: Simulation) => internals(sim).comboHistory.filter(combo => combo.attackerId === 'player-1');

class RouteSearch {
  private readonly shared: ReadonlySet<unknown>;
  private readonly root: SearchNode;
  constructor(readonly fighter: CharacterDefinition) {
    const sim = new Simulation(config, [fighter, fighter], { training: true, initialDistance: TUTORIAL_DISTANCE });
    sim.fillTrainingRage();
    const raw = sim as unknown as Record<string, unknown>;
    this.shared = new Set([fighter, config, raw.definitions, raw.resolver, raw.options]);
    this.root = { sim, steps: [], moveIds: [], fed: 0, hold: 'N', hits: 0, damage: 0, ultimates: 0 };
  }
  get start(): SearchNode { return this.root; }
  private ultimate(moveId: string): boolean { return this.fighter.moves.find(move => move.id === moveId)?.category === 'ultimate'; }

  /** Presses `command` after `wait` frames; succeeds when the move it starts hits without dropping the combo. */
  attempt(node: SearchNode, command: string, wait: number): SearchNode | undefined {
    const parsed = parseCommand(command), first = node.steps.length === 0;
    const idle = wait - parsed.motion.length - 1 - node.fed;
    if (idle < 0 || wait < minimumWait(command, first)) return undefined;
    const sim = cloneSimulation(node.sim, this.shared), state = internals(sim);
    for (let frame = 0; frame < idle; frame++) sim.stepFrame([{ direction: node.hold, buttons: new Set() }, N]);
    for (const direction of parsed.motion) sim.stepFrame([{ direction, buttons: new Set() }, N]);
    const before = state.characters[0].attack;
    sim.stepFrame([{ direction: parsed.direction, buttons: new Set(parsed.buttons) }, N]);
    const held: FrameInput = { direction: parsed.hold, buttons: new Set() };
    let started: string | undefined;
    for (let fed = 1; fed <= LOOKAHEAD; fed++) {
      const self = state.characters[0];
      if (!parsed.buttons.length) {
        if (!self.grounded) return { sim, steps: [...node.steps, { wait, command }], moveIds: node.moveIds, fed, hold: parsed.hold, hits: node.hits, damage: node.damage, ultimates: node.ultimates };
      } else {
        if (!started && self.attack && self.attack !== before) started = self.attack.moveId;
        // A press the fighter cannot take expires from the command buffer within a few frames.
        if (!started && fed > START_WINDOW) return undefined;
        const combos = playerCombos(sim);
        if (combos.length > 1 || (node.hits > 0 && !combos[0]?.active)) return undefined;
        if (started && !self.attack && !state.projectiles.some(projectile => projectile.ownerId === 'player-1')) return undefined;
        if (started && state.lastHitEvents.some(event => event.attackerId === 'player-1' && event.outcome === 'hit' && event.moveId === started)) {
          const combo = combos[0];
          if (!combo || combo.hits <= node.hits) return undefined;
          return { sim, steps: [...node.steps, { wait, command }], moveIds: [...node.moveIds, started], fed, hold: parsed.hold,
            hits: combo.hits, damage: this.projectedDamage(sim, held), ultimates: node.ultimates + Number(this.ultimate(started)) };
        }
      }
      sim.stepFrame([held, N]);
    }
    return undefined;
  }
  private projectedDamage(from: Simulation, held: FrameInput): number {
    const sim = cloneSimulation(from, this.shared);
    for (let frame = 0; frame < LOOKAHEAD && playerCombos(sim)[0]?.active; frame++) sim.stepFrame([held, N]);
    return playerCombos(sim)[0]?.damage ?? 0;
  }
  earliest(node: SearchNode, command: string): SearchNode | undefined {
    const from = Math.max(minimumWait(command, node.steps.length === 0), node.fed + parseCommand(command).motion.length + 1);
    for (let wait = from; wait <= from + WAIT_RANGE; wait++) {
      const next = this.attempt(node, command, wait);
      if (next) return next;
    }
    return undefined;
  }
  /** Full replay from a fresh simulation: the route counts only as one uninterrupted combo. */
  verify(steps: readonly RouteStep[]): { hits: number; damage: number } | undefined {
    const combos = playExample(this.fighter, routeInputs(steps), TUTORIAL_DISTANCE);
    return combos.length === 1 ? { hits: combos[0].hits, damage: combos[0].damage } : undefined;
  }
}

/** Timings for the lessons of the basic and combo sections; a lesson without contact keeps its plain press. */
function lessonRoutes(search: RouteSearch): Record<string, ComboRoute> {
  const routes: Record<string, ComboRoute> = {};
  for (const [key, commands] of Object.entries(lessonCommands(search.fighter))) {
    let node = search.start;
    for (const command of commands) {
      const next = search.earliest(node, command);
      if (!next) { console.warn(`  ${search.fighter.id} ${key}: sem contato em ${command}; demonstração sem confirmação`); break; }
      node = next;
    }
    const steps = node.steps.length === commands.length ? node.steps
      : [...node.steps, ...commands.slice(node.steps.length).map((command, index) => ({ wait: minimumWait(command, node.steps.length + index === 0) + 12, command }))];
    const result = search.verify(steps);
    routes[key] = { steps, hits: result?.hits ?? 0, damage: result?.damage ?? 0, moveIds: node.moveIds };
  }
  return routes;
}

function overused(fighter: CharacterDefinition, moveIds: readonly string[]): boolean {
  const limit = (id: string) => ['special', 'power'].includes(fighter.moves.find(move => move.id === id)?.category ?? '') ? MAX_SPECIAL_REPEATS : MAX_REPEATS;
  return moveIds.some(id => moveIds.filter(other => other === id).length > limit(id));
}

/**
 * Beam search over every ground command, keeping the most damaging partial combos at each length.
 * An ultimate is tried as the finisher of every route; it never fills the beam, which would leave no room for longer routes.
 */
function exploreRoutes(search: RouteSearch): SearchNode[] {
  const moves = search.fighter.moves.filter(move => !move.comboOnly && !move.airborne && !move.shortcutOnly);
  const vocabulary = moves.filter(move => move.category !== 'ultimate').map(moveCommand);
  const finishers = moves.filter(move => move.category === 'ultimate').map(moveCommand);
  // Closed recipes join as whole blocks too: a launcher such as 1,1,2 only pays off in the juggle after it.
  const byId = (id: string) => search.fighter.moves.find(move => move.id === id)!;
  const blocks = [...vocabulary.map(command => [command]),
    ...(search.fighter.combos ?? []).filter(recipe => recipe.moveIds.length > 1 && !recipe.moveIds.some(id => byId(id).airborne))
      .map(recipe => recipe.moveIds.map(id => moveCommand(byId(id))))];
  const found: SearchNode[] = [];
  let level = [search.start];
  for (let depth = 1; depth <= MAX_STEPS && level.length; depth++) {
    const next = new Map<string, SearchNode>();
    for (const node of level) {
      for (const command of finishers) { const finished = search.earliest(node, command); if (finished && finished.ultimates === 1) found.push(finished); }
      for (const block of blocks) {
        let child: SearchNode | undefined = node;
        for (const command of block) child = child && search.earliest(child, command);
        if (!child || child.steps.length > MAX_STEPS || child.ultimates > 1 || overused(search.fighter, child.moveIds)) continue;
        // A buffered motion can turn a special into the ultimate; such a route ends there too.
        if (child.ultimates) { found.push(child); continue; }
        const key = child.moveIds.join('>');
        if (!next.has(key) || next.get(key)!.damage < child.damage) next.set(key, child);
      }
    }
    level = [...next.values()].sort((a, b) => b.damage - a.damage).slice(0, BEAM);
    found.push(...level);
    console.log(`  ${search.fighter.id}: rodada ${depth}, ${next.size} rotas, melhor ${level[0]?.damage ?? 0}`);
  }
  return found;
}

/** How many frames each press tolerates; tight windows and long motions make a route harder. */
function difficulty(search: RouteSearch, steps: readonly RouteStep[], hits: number): number {
  return steps.reduce((total, step, index) => {
    let window = 0;
    for (let offset = -8; offset <= 12; offset++) {
      const wait = step.wait + offset;
      if (wait < minimumWait(step.command, index === 0)) continue;
      try { if (search.verify(steps.map((other, at) => at === index ? { ...other, wait } : other))?.hits === hits) window++; } catch { /* Too short to fit the motion. */ }
    }
    return total + 1 + parseCommand(step.command).motion.length * .5 + 6 / Math.max(1, window);
  }, 0);
}

/** Routes where no easier route deals at least as much damage, from easiest to hardest. */
function frontier(routes: readonly AdvancedRoute[]): AdvancedRoute[] {
  const kept: AdvancedRoute[] = [];
  for (const route of [...routes].sort((a, b) => a.difficulty - b.difficulty || b.damage - a.damage)) {
    if (!kept.length || route.damage > kept[kept.length - 1].damage) kept.push(route);
  }
  return kept;
}
const spread = <T>(items: readonly T[], count: number): T[] => items.length <= count ? [...items]
  : Array.from({ length: count }, (_, index) => items[Math.round(index * (items.length - 1) / (count - 1))]);

/**
 * Tutorial selection, from easy and light to hard and heavy: routes without an ultimate first,
 * then the ultimate finishers that are both harder and stronger than the last of them (or the strongest one).
 */
function advancedRoutes(search: RouteSearch, nodes: readonly SearchNode[], suggested: readonly SearchNode[]): AdvancedRoute[] {
  const byLength = new Map<number, SearchNode[]>();
  for (const node of nodes) if (node.steps.length >= MIN_ADVANCED_STEPS) byLength.set(node.steps.length, [...byLength.get(node.steps.length) ?? [], node]);
  const pool = [...byLength.values()].flatMap(group => {
    const best = (ultimate: boolean) => group.filter(node => (node.ultimates > 0) === ultimate).sort((a, b) => b.damage - a.damage).slice(0, CANDIDATES_PER_LENGTH);
    return [...best(false), ...best(true)];
  });
  const verified = [...new Set([...pool, ...suggested])].flatMap(node => {
    const result = search.verify(node.steps);
    return result ? [{ node, route: { steps: node.steps, moveIds: node.moveIds, hits: result.hits, damage: result.damage,
      notation: routeNotation(search.fighter, node.moveIds), difficulty: Math.round(difficulty(search, node.steps, result.hits) * 10) / 10 } }] : [];
  });
  // The user's own examples always stay, in difficulty order among the routes picked along the frontier.
  const kept = verified.filter(entry => suggested.includes(entry.node) && !entry.node.ultimates).map(entry => entry.route);
  const picked = spread(frontier(verified.filter(entry => !entry.node.ultimates).map(entry => entry.route)), PLAIN_ROUTES);
  const plain = [...new Set([...picked, ...kept])].sort((a, b) => a.difficulty - b.difficulty || a.damage - b.damage);
  const last = plain[plain.length - 1];
  const ultimateRoutes = frontier(verified.filter(entry => entry.node.ultimates).map(entry => entry.route));
  const finishers = ultimateRoutes.filter(route => !last || (route.difficulty >= last.difficulty && route.damage > last.damage));
  // Every fighter shows at least one ultimate ending (user request), even when it deals less than the last route above.
  const strongest = [...ultimateRoutes].sort((a, b) => b.damage - a.damage).slice(0, 1);
  return [...plain, ...(finishers.length ? spread(finishers, ULTIMATE_ROUTES) : strongest)];
}

/** Extra repetitions a pattern must survive to be reported as an endless loop. */
const LOOP_PROOF = 4;
/**
 * Checks the rules every route must keep, without changing them: no endless combo, and nothing after an ultimate
 * (the opponent must be able to recover). Violations are reported for the user to judge.
 */
function auditRules(search: RouteSearch, nodes: readonly SearchNode[]): string[] {
  const fighter = search.fighter, warnings: string[] = [];
  const vocabulary = fighter.moves.filter(move => !move.comboOnly && !move.airborne && !move.shortcutOnly).map(moveCommand);
  const label = (node: SearchNode) => routeNotation(fighter, node.moveIds);
  const afterUltimate = new Set<string>();
  for (const node of nodes.filter(entry => entry.ultimates).sort((a, b) => a.steps.length - b.steps.length).slice(0, 12)) {
    for (const command of vocabulary) {
      const after = search.earliest(node, command);
      const move = after && after.moveIds[after.moveIds.length - 1];
      if (!after || !move || afterUltimate.has(move)) continue;
      afterUltimate.add(move);
      warnings.push(`depois da ultimate ainda conecta ${routeNotation(fighter, [move])}: ${label(after)} (${after.hits} hits)`);
    }
  }
  const tested = new Set<string>();
  for (const node of nodes) {
    for (let size = 1; size <= 4; size++) {
      const ids = node.moveIds, n = ids.length;
      if (n < size * 2) continue;
      const pattern = ids.slice(n - size);
      if (pattern.some((id, index) => ids[n - size * 2 + index] !== id)) continue;
      const key = pattern.join('>');
      if (tested.has(key)) continue;
      tested.add(key);
      const commands = node.steps.slice(node.steps.length - size).map(step => step.command);
      let extended: SearchNode | undefined = node;
      for (let round = 0; round < LOOP_PROOF && extended; round++) for (const command of commands) extended = extended && search.earliest(extended, command);
      if (extended) warnings.push(`laço infinito: ${routeNotation(fighter, pattern)} se repete ${LOOP_PROOF + 2}+ vezes (${label(extended)} · ${extended.hits} hits)`);
    }
  }
  return warnings;
}

/** `npm run combos:find -- <personagem> <comando> <comando>…` (ex.: `texas 3 3 d,df,f,2`) reports where a given route drops instead of searching. */
function testRoute(fighterId: string, commands: readonly string[]): void {
  const fighter = characters.find(character => character.id === fighterId);
  if (!fighter) throw new Error(`Personagem desconhecido: ${fighterId}`);
  const search = new RouteSearch(fighter);
  let node = search.start;
  for (const command of commands) {
    const next = search.earliest(node, command);
    if (!next) { console.log(`Cai em ${command} depois de ${node.hits} hits e ${node.damage} de dano`); return; }
    node = next;
    console.log(`${command} (espera ${node.steps[node.steps.length - 1].wait}) · ${node.hits} hits · ${node.damage}`);
  }
  console.log(search.verify(node.steps));
}

const args = process.argv.slice(2);
if (args.length && args[0] !== '--only') testRoute(args[0], args.slice(1));
else {
  // `--only shoto,texas` searches just those fighters and keeps the routes already saved for the others.
  const only = args[0] === '--only' ? new Set(args.slice(1).join(',').split(',').filter(Boolean)) : undefined;
  const unknown = [...only ?? []].filter(id => !characters.some(fighter => fighter.id === id));
  if (unknown.length) throw new Error(`Personagem desconhecido: ${unknown.join(', ')}`);
  const output: Record<string, FighterRoutes> = only && existsSync(OUTPUT) ? JSON.parse(readFileSync(OUTPUT, 'utf8')) : {};
  for (const fighter of characters.filter(entry => !only || only.has(entry.id))) {
    console.log(`${fighter.name} (${fighter.id})`);
    const search = new RouteSearch(fighter);
    const lessons = lessonRoutes(search);
    const explored = exploreRoutes(search);
    const suggested = (SUGGESTED[fighter.id] ?? []).flatMap(commands => {
      let node: SearchNode | undefined = search.start;
      for (const command of commands) node = node && search.earliest(node, command);
      if (!node) console.warn(`  exemplo sem combo completo: ${commands.join(',')}`);
      return node ? [node] : [];
    });
    const advanced = advancedRoutes(search, explored, suggested);
    advanced.forEach(route => console.log(`  ${route.notation} · ${route.hits} hits · ${route.damage} · dificuldade ${route.difficulty}`));
    const warnings = auditRules(search, explored);
    console.log(warnings.length ? `  ALERTAS DE REGRA (${fighter.name}):` : `  Regras ok (${fighter.name}): sem laço infinito nem golpe após a ultimate.`);
    warnings.forEach(warning => console.log(`   - ${warning}`));
    output[fighter.id] = { lessons, advanced };
  }
  writeFileSync(OUTPUT, `${JSON.stringify(output, null, 1)}\n`);
  console.log(`Gravado ${OUTPUT.pathname}`);
}
