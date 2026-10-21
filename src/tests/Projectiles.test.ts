import { describe, expect, it } from 'vitest';
import { ayla as currentAyla, aylaLegacyMoves as aylaMoves } from '../engine/data/fighters/ayla';
import { defaultCharacter, getSpecialMoves, type CharacterDefinition } from '../engine/data/characters';
import type { MoveDefinition } from '../engine/data/moves';
import { createGameConfig } from '../engine/data/gameConfig';
import { Simulation } from '../engine/simulation/Simulation';
import { projectileHitbox } from '../engine/combat/Projectile';
import { createHurtbox } from '../engine/collision/combatGeometry';
import type { AttackButton, Direction, FrameInput } from '../input/types';

// Preserve the original projectile fixtures independently from Ayla's new combat book.
const ayla: CharacterDefinition = { ...currentAyla, moves: aylaMoves, combatRules: undefined };
const input = (direction: Direction = 'N', buttons: AttackButton[] = []): FrameInput => ({ direction, buttons: new Set(buttons) });
const neutral = input();
function tick(sim: Simulation, p1 = neutral, p2 = neutral, count = 1): void {
  for (let i = 0; i < count; i += 1) sim.stepFrame([p1, p2]);
}
function quarter(sim: Simulation, button: AttackButton = '1', player = 0): void {
  for (const command of [input('D'), input('DF'), input('F', [button]), neutral, neutral, neutral, neutral]) {
    tick(sim, player === 0 ? command : neutral, player === 1 ? command : neutral);
  }
}
const wave = aylaMoves.find((move) => move.id === 'crimson-wave')!;
function emitter(overrides: Partial<MoveDefinition> = {}, id = 'emitter'): CharacterDefinition {
  return {
    ...ayla, id, maxHealth: 1000, moves: [{
      ...wave, input: { buttons: ['1'] }, startup: 3,
      activeFrames: 1, recovery: 3, ...overrides
    }]
  };
}

describe('livros de golpes e perfis locais', () => {
  it('aceita zero, um e muitos especiais, sem lista global', () => {
    const empty = { ...ayla, moves: [] };
    const many = { ...ayla, moves: Array.from({ length: 11 }, (_, i) => ({ ...wave, id: `special-${i}` })) };
    expect(getSpecialMoves(empty)).toHaveLength(0);
    expect(getSpecialMoves(emitter())).toHaveLength(1);
    expect(getSpecialMoves(many)).toHaveLength(11);
    expect(getSpecialMoves(ayla)).toHaveLength(5);
  });
  it('aplica caminhada, dash e hurtbox individuais, incluindo offset espelhado', () => {
    const sim = new Simulation(createGameConfig(1024, 576), [ayla, defaultCharacter]);
    const before = sim.snapshot().characters;
    tick(sim, input('F'), input('F'));
    const after = sim.snapshot().characters;
    expect(after[0].x - before[0].x).toBeCloseTo(ayla.movement.walkSpeed);
    expect(before[1].x - after[1].x).toBeCloseTo(defaultCharacter.movement.walkSpeed);
    expect(createHurtbox(after[0]).height).toBe(140);
    expect(createHurtbox(after[1]).height).toBe(152);
    tick(sim); const x = sim.snapshot().characters[0].x;
    tick(sim, input('F'));
    expect(sim.snapshot().characters[0].x - x).toBeCloseTo(ayla.movement.dashSpeed!);
    const asymmetric = {
      ...after[0], facing: 'left' as const, collision: {
        ...ayla.collision,
        hurtboxes: { ...ayla.collision.hurtboxes, standing: { offsetX: 10, offsetY: -80, width: 20, height: 80 } }
      }
    };
    expect(createHurtbox(asymmetric).x).toBe(asymmetric.x - 20);
  });
  it('abaixa a hurtbox no contato com o chão e restaura a alta na recuperação', () => {
    const sim = new Simulation(createGameConfig(1024, 576), [emitter(), defaultCharacter]);
    tick(sim, input('N', ['1']));
    expect(createHurtbox(sim.snapshot().characters[0]).height).toBe(140);
    tick(sim, neutral, neutral, 2);
    expect(sim.snapshot().characters[0].mode).toBe('active');
    expect(createHurtbox(sim.snapshot().characters[0]).height).toBe(87);
    tick(sim);
    expect(sim.snapshot().characters[0].mode).toBe('recovery');
    expect(createHurtbox(sim.snapshot().characters[0]).height).toBe(140);
  });
});

describe('projéteis independentes a 60 Hz', () => {
  it.each([0, 1])('reconhece a meia-lua da Ayla pelo jogador %i e fixa a direção no disparo', (player) => {
    const sim = new Simulation(createGameConfig(1024, 576), [ayla, ayla]);
    quarter(sim, '1', player);
    tick(sim, neutral, neutral, 20);
    const projectile = sim.snapshot().projectiles[0];
    expect(projectile?.ownerId).toBe(`player-${player + 1}`);
    expect(projectile?.facing).toBe(player === 0 ? 'right' : 'left');
    const x = projectile.x;
    tick(sim);
    expect(sim.snapshot().projectiles[0].x - x).toBe(player === 0 ? 6 : -6);
  });
  it('emite uma vez, sobrevive à recuperação e acerta uma vez à distância', () => {
    const sim = new Simulation(createGameConfig(1024, 576), [emitter(), defaultCharacter]);
    tick(sim, input('N', ['1']));
    tick(sim, neutral, neutral, 9);
    expect(sim.snapshot().characters[0].attack).toBeUndefined();
    expect(sim.snapshot().projectiles).toHaveLength(1);
    let contacts = 0;
    for (let i = 0; i < 110; i += 1) { tick(sim); contacts += sim.snapshot().hitEvents.length; }
    expect(contacts).toBe(1);
    expect(sim.snapshot().characters[1].health).toBe(1000 - wave.damage);
    expect(sim.snapshot().projectiles).toHaveLength(0);
  });
  it.each([['DB', 0, 'block'], ['B', wave.damage, 'hit']] as const)('respeita guarda %s contra onda baixa após o emissor recuperar', (direction, damage, outcome) => {
    const sim = new Simulation(createGameConfig(1024, 576), [emitter(), defaultCharacter]);
    tick(sim, input('N', ['1']), input(direction));
    let event;
    for (let i = 0; i < 110 && !event; i += 1) { tick(sim, neutral, input(direction)); event = sim.snapshot().hitEvents[0]; }
    expect(event?.outcome).toBe(outcome);
    expect(event?.attackerRecoveryFrames).toBe(0);
    expect(sim.snapshot().characters[1].health).toBe(1000 - damage);
  });
  it('colide projéteis opostos antes de atingir os jogadores', () => {
    const fighter = emitter();
    const sim = new Simulation(createGameConfig(1024, 576), [fighter, fighter]);
    tick(sim, input('N', ['1']), input('N', ['1']));
    tick(sim, neutral, neutral, 4);
    expect(sim.snapshot().projectiles).toHaveLength(2);
    tick(sim, neutral, neutral, 55);
    expect(sim.snapshot().projectiles).toHaveLength(0);
    expect(sim.snapshot().characters.map((c) => c.health)).toEqual([1000, 1000]);
  });
  it('mantém o projétil lançado quando um golpe interrompe o emissor', () => {
    const longJab: MoveDefinition = {
      ...aylaMoves[0], input: { buttons: ['2'] }, startup: 1,
      hitLevel: 'mid', hitbox: { forward: 0, yOffset: -120, width: 800, height: 100 }
    };
    const sim = new Simulation(createGameConfig(1024, 576), [emitter({ recovery: 40 }), { ...ayla, id: 'interrupter', moves: [longJab] }]);
    tick(sim, input('N', ['1'])); tick(sim, neutral, neutral, 4);
    tick(sim, neutral, input('N', ['2'])); tick(sim);
    expect(sim.snapshot().characters[0].mode).toBe('hitstun');
    expect(sim.snapshot().characters[0].attack).toBeUndefined();
    expect(sim.snapshot().projectiles).toHaveLength(1);
  });
  it('usa volume varrido para não atravessar um alvo com velocidade alta', () => {
    const fast = emitter({ projectile: { ...wave.projectile!, speed: 900 } });
    const sim = new Simulation(createGameConfig(2048, 576), [fast, defaultCharacter]);
    tick(sim, input('N', ['1'])); tick(sim, neutral, neutral, 5);
    expect(sim.snapshot().characters[1].health).toBe(1000 - wave.damage);
  });
  it('não duplica a emissão quando a mesma animação permanece ativa', () => {
    const sim = new Simulation(createGameConfig(1024, 576), [emitter({ activeFrames: 20 }), defaultCharacter]);
    tick(sim, input('N', ['1'])); tick(sim, neutral, neutral, 15);
    expect(sim.snapshot().projectiles).toHaveLength(1);
    expect(sim.snapshot().projectiles[0].ageFrames).toBeGreaterThan(0);
  });
  it.each([1, 2])('respeita o limite local de %i projéteis simultâneos', (maxActive) => {
    const fighter = emitter({ projectile: { ...wave.projectile!, forward: -60, speed: 0, lifetimeFrames: 200, maxActive } });
    const sim = new Simulation(createGameConfig(1024, 576), [fighter, defaultCharacter]);
    tick(sim, input('N', ['1'])); tick(sim, neutral, neutral, 10);
    tick(sim, input('N', ['1'])); tick(sim, neutral, neutral, 5);
    expect(sim.snapshot().projectiles).toHaveLength(maxActive);
  });
  it('expira a vida útil, limpa no reset e no encerramento do round', () => {
    const short = emitter({ projectile: { ...wave.projectile!, speed: 0, lifetimeFrames: 5 } });
    const sim = new Simulation(createGameConfig(1024, 576), [short, defaultCharacter]);
    tick(sim, input('N', ['1'])); tick(sim, neutral, neutral, 3);
    expect(sim.snapshot().projectiles).toHaveLength(1);
    tick(sim, neutral, neutral, 5); expect(sim.snapshot().projectiles).toHaveLength(0);
    sim.resetMatch(); tick(sim, input('N', ['1'])); tick(sim, neutral, neutral, 4);
    expect(sim.snapshot().projectiles).toHaveLength(1);
    sim.resetMatch(); expect(sim.snapshot().projectiles).toHaveLength(0);
    const config = createGameConfig(1024, 576); config.match.roundDurationFrames = 7;
    const timed = new Simulation(config, [emitter(), defaultCharacter]);
    tick(timed, input('N', ['1'])); tick(timed, neutral, neutral, 6);
    expect(timed.snapshot().phase).toBe('round-over');
    expect(timed.snapshot().projectiles).toHaveLength(0);
  });
  it('conserva livros locais mesmo quando dois lutadores reutilizam o mesmo ID de golpe', () => {
    const first = emitter({ damage: 25 }, 'first');
    const second = emitter({ damage: 95 }, 'second');
    const sim = new Simulation(createGameConfig(1024, 576), [first, second]);
    tick(sim, neutral, input('N', ['1'])); tick(sim, neutral, neutral, 110);
    expect(sim.snapshot().characters[0].health).toBe(1000 - 95);
    expect(sim.snapshot().characters[1].health).toBe(1000);
  });
  it('espelha a caixa do projétil sem depender dos pixels da arte', () => {
    const sim = new Simulation(createGameConfig(1024, 576), [emitter(), emitter()]);
    tick(sim, neutral, input('N', ['1'])); tick(sim, neutral, neutral, 4);
    const p = sim.snapshot().projectiles[0];
    expect(projectileHitbox(p)).toMatchObject({ x: p.x - 48, y: p.y - 30, width: 48, height: 30 });
  });
});
