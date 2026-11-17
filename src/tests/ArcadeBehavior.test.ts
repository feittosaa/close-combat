import { describe, it, expect } from 'vitest';
import { ArcadeController, type ArcadeDifficulty } from '../engine/combat/ArcadeController';
import { Simulation } from '../engine/simulation/Simulation';
import { bob } from '../engine/data/fighters/bob';
import { texas } from '../engine/data/fighters/texas';
import { sm0g } from '../engine/data/fighters/sm0g';
import { createGameConfig } from '../engine/data/gameConfig';
import { arcadeRoutes } from '../training/arcadeRoutes';
import type { CharacterDefinition } from '../engine/data/characters';
import type { FrameInput } from '../input/types';

const config = createGameConfig(1024, 576);
const idle = (): FrameInput => ({ direction: 'N', buttons: new Set() });
const press = (button: '1' | '2' | '3' | '4', direction: FrameInput['direction'] = 'N'): FrameInput => ({ direction, buttons: new Set([button]) });
const botFor = (fighter: CharacterDefinition, opponent: CharacterDefinition, level: ArcadeDifficulty = 'hard', seed?: number) =>
  new ArcadeController(fighter, opponent, level, { routes: arcadeRoutes(fighter.id), gravity: config.movement.gravity, seed });

/** Bot (jogador 2) contra um adversário roteirizado (jogador 1), em treino, que não acaba a luta. */
function play(bot: ArcadeController, fighters: [CharacterDefinition, CharacterDefinition], script: (frame: number) => FrameInput, frames: number, distance = 300) {
  const sim = new Simulation(config, fighters, { training: true, initialDistance: distance });
  let airDashes = 0, distanceSum = 0;
  const inputs: FrameInput[] = [], contacts: { frame: number; moveId: string; target: string; outcome: string }[] = [];
  for (let frame = 0; frame < frames; frame++) {
    const snapshot = sim.snapshot(), [first, second] = snapshot.characters;
    const input = bot.readInput(frame, second, first, snapshot.projectiles, snapshot.comboHistory);
    inputs.push(input);
    if (input.dash && !second.grounded) airDashes += 1;
    distanceSum += Math.abs(first.x - second.x);
    sim.stepFrame([script(frame), input]);
    sim.snapshot().hitEvents.forEach(event => contacts.push({ frame, moveId: event.moveId, target: event.targetId, outcome: event.outcome }));
  }
  return { sim, inputs, contacts, airDashes, averageDistance: distanceSum / frames };
}

describe('estilo de cada personagem', () => {
  const gap = (fighter: CharacterDefinition, other: CharacterDefinition) => {
    return play(botFor(fighter, other), [other, fighter], idle, 900, 420).averageDistance;
  };
  it('a Texas mantém distância e o SM0G-000 cola no adversário', () => {
    expect(gap(texas, bob)).toBeGreaterThan(gap(sm0g, bob) + 150);
  });
  it('a Texas atira de longe e foge pelo ar com dash quando o adversário avança', () => {
    const approach = (): FrameInput => ({ direction: 'F', buttons: new Set() });
    const { airDashes } = play(botFor(texas, bob), [bob, texas], approach, 1200, 330);
    expect(airDashes).toBeGreaterThan(0);
  });
  it('a Texas lança projéteis contra um adversário parado', () => {
    const { contacts } = play(botFor(texas, bob), [bob, texas], idle, 1200, 380);
    expect(contacts.some(contact => contact.target === 'player-1')).toBe(true);
  });
});

describe('defesa', () => {
  const sampleBob = () => new Simulation(config, [bob, texas], { training: true, initialDistance: 70 });
  it('abaixa sob o golpe alto que passa por cima do seu corpo agachado, e isso realmente evita o acerto', () => {
    const duckable = sampleBob(), duck = (index: number) => ({ ...duckable.snapshot().characters[index] });
    // O soco leve do Bob (alto) passa por cima da Texas agachada.
    const strike = { moveId: 'light-punch', buttons: ['1'] as const, elapsedFrames: 6, hasHit: false };
    const decisions = Array.from({ length: 24 }, (_, seed) => botFor(texas, bob, 'hard', seed + 1).readInput(100, duck(1), { ...duck(0), attack: strike }).direction);
    expect(decisions.filter(direction => direction === 'D').length).toBeGreaterThan(8);
    const sim = new Simulation(config, [bob, texas], { training: true, initialDistance: 70 });
    for (let frame = 0; frame < 60; frame++) sim.stepFrame([frame === 2 ? press('1') : idle(), { direction: 'D', buttons: new Set() }]);
    expect(sim.snapshot().characters[1].health).toBe(1000);
  });
  it('não abaixa sob golpe que o acertaria agachado: defende', () => {
    const sim = sampleBob(), [first, second] = sim.snapshot().characters;
    const strike = { moveId: 'heavy-kick', buttons: ['4'] as const, elapsedFrames: 18, hasHit: false };
    const decisions = Array.from({ length: 24 }, (_, seed) => botFor(bob, bob, 'hard', seed + 1).readInput(100, second, { ...first, attack: strike }).direction);
    expect(decisions).not.toContain('D');
  });
  it('só reage ao golpe depois do atraso de reação, nunca no primeiro quadro', () => {
    const sim = new Simulation(config, [bob, bob], { training: true, initialDistance: 64 });
    sim.stepFrame([press('1'), idle()]);
    const [first, second] = sim.snapshot().characters, bot = botFor(bob, bob);
    expect(first.attack?.elapsedFrames).toBeLessThan(3);
    expect(bot.readInput(0, second, first).direction).not.toBe('B');
  });
});

describe('anti-aéreo', () => {
  const jumps = (frame: number) => frame % 160 === 4 ? { direction: 'UF' as const, buttons: new Set<never>() } : idle();
  it('só ataca quando o adversário pula na sua direção, e acerta', () => {
    const { contacts } = play(botFor(bob, bob), [bob, bob], jumps, 700, 200);
    const mine = contacts.filter(contact => contact.target === 'player-1' && contact.outcome === 'hit');
    expect(mine.length).toBeGreaterThan(0);
    expect(contacts.filter(contact => contact.frame < 20 && contact.target === 'player-1')).toEqual([]);
  });
});

describe('punição e combos', () => {
  it('pune um golpe pesado em falso com um combo de vários acertos, mas só o nível difícil usa os mais longos', () => {
    const sim = new Simulation(config, [bob, bob], { training: true, initialDistance: 64 });
    const fresh = new Simulation(config, [bob, bob], { training: true, initialDistance: 64 }).snapshot().characters;
    sim.stepFrame([press('4'), idle()]);
    while (sim.snapshot().characters[0].mode !== 'recovery') sim.stepFrame([idle(), idle()]);
    const first = sim.snapshot().characters[0], second = fresh[1];
    const presses = (level: ArcadeDifficulty) => {
      const bot = botFor(bob, bob, level);
      const inputs = Array.from({ length: 160 }, (_, frame) => bot.readInput(frame, second, first));
      return inputs.filter((input, index) => input.buttons.size && !inputs[index - 1]?.buttons.size).length;
    };
    expect(presses('hard')).toBeGreaterThanOrEqual(4);
  });
  it('o nível normal não executa combos difíceis', () => {
    const hard = arcadeRoutes('bob'), normal = hard.filter(route => route.difficulty <= 2);
    expect(Math.max(...normal.map(route => route.hits))).toBeLessThan(Math.max(...hard.map(route => route.hits)));
  });
});

describe('rage', () => {
  const state = (overrides: object, index = 1) => {
    const sim = new Simulation(config, [bob, bob], { training: true, initialDistance: 64 });
    return { ...sim.snapshot().characters[index], ...overrides };
  };
  const combo = (hits: number, damage: number) => [{ attackerId: 'player-1', targetId: 'player-2', hits, damage, active: true, lastFrame: 0 }];
  const breaks = (rage: number, hits: number, damage: number, health = 1000) => {
    const bot = botFor(bob, bob), stunned = state({ mode: 'hitstun', stateStartedFrame: 0, rage, health });
    return Array.from({ length: 60 }, (_, frame) => bot.readInput(frame, stunned, state({}, 0), [], combo(hits, damage))).some(input => input.rageAction);
  };
  it('quebra o combo longo, mas guarda a rage da ultimate num combo curto', () => {
    expect(breaks(300, 6, 200)).toBe(true);
    expect(breaks(300, 2, 40)).toBe(false);
  });
  it('quebra mesmo um combo curto quando está perto de morrer', () => {
    expect(breaks(300, 2, 40, 80)).toBe(true);
  });
  it('só gasta a ultimate num acerto quando ela mata, a rage transborda ou a luta está perdida', () => {
    const afterHit = (level: ArcadeDifficulty, rage: number, opponentHealth: number, health = 1000) => {
      const bot = botFor(bob, bob, level), attack = { moveId: 'light-punch', buttons: ['1'], elapsedFrames: 12, hasHit: true, hitOutcome: 'hit' as const };
      return bot.readInput(40, state({ attack, rage, health }), state({ health: opponentHealth }, 0)).ultimate === true;
    };
    expect(afterHit('hard', 300, 1000)).toBe(false);
    expect(afterHit('hard', 300, 300)).toBe(true);
    expect(afterHit('hard', 900, 1000)).toBe(true);
    expect(afterHit('hard', 300, 1000, 200)).toBe(true);
    expect(afterHit('normal', 300, 1000)).toBe(true);
  });
});
