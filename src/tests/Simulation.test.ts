import { describe, it, expect } from 'vitest';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { defaultCharacter as shoto } from '../engine/data/characters';
import { createHurtbox } from '../engine/collision/combatGeometry';
import { CONTACT_HITSTOP_FRAMES } from '../engine/combat/hitstop';
import type { AttackButton, Direction, FrameInput } from '../input/types';
const input = (direction: Direction = 'N', buttons: AttackButton[] = []): FrameInput => ({ direction, buttons: new Set(buttons) });
const N = input();
const config = createGameConfig(1024, 576);
const practice = (distance = 64) => new Simulation(config, [shoto, shoto], { training: true, initialDistance: distance });
const advance = (sim: Simulation, frames: number, inputs = [N, N]) => { for (let f = 0; f < frames; f++) sim.stepFrame(inputs); };

describe('quatro básicos do Shoto', () => {
  it.each(shoto.moves.filter(move => move.category === 'basic'))('$name acerta uma única vez em ambos os lados', move => {
    for (const index of [0, 1]) {
      const sim = practice(); const inputs = [N, N]; inputs[index] = input('N', [...move.input.buttons]);
      sim.stepFrame(inputs);
      expect(sim.snapshot().characters[index].attack?.moveId).toBe(move.id);
      advance(sim, move.startup - 1);
      expect(sim.snapshot().hitEvents).toEqual([]);
      sim.stepFrame([N, N]);
      const snapshot = sim.snapshot(); const target = snapshot.characters[1 - index];
      expect(snapshot.hitEvents).toHaveLength(1);
      expect(snapshot.hitEvents[0]).toMatchObject({ outcome: 'hit', moveId: move.id, damage: move.damage });
      expect(target.health).toBe(shoto.maxHealth - move.damage);
      expect(snapshot.activeHitboxes).toHaveLength(1);
      advance(sim, move.activeFrames + move.recovery + 10);
      expect(sim.snapshot().characters[1 - index].health).toBe(target.health);
      expect(sim.snapshot().characters[index].attack).toBeUndefined();
    }
  });
  it.each(shoto.moves.filter(move => move.category === 'basic'))('$name recupera integralmente em acerto, bloqueio e erro', move => {
    for (const outcome of ['hit', 'block', 'whiff'] as const) {
      const sim = practice(outcome === 'whiff' ? 300 : 64);
      const guard = outcome === 'block' ? input('B') : N;
      sim.stepFrame([input('N', [...move.input.buttons]), guard]);
      const total = move.startup + move.activeFrames + move.recovery;
      advance(sim, total - 1 + (outcome === 'whiff' ? 0 : CONTACT_HITSTOP_FRAMES), [N, guard]);
      expect(sim.snapshot().characters[0]).toMatchObject({ mode: 'recovery', attack: { elapsedFrames: total - 1 } });
      sim.stepFrame([N, guard]);
      expect(sim.snapshot().characters[0].attack).toBeUndefined();
      if (outcome === 'block') expect(sim.snapshot().characters[1].health).toBe(shoto.maxHealth);
    }
  });
  it.each(shoto.moves.filter(move => move.category === 'basic'))('$name usa guarda sem parry mesmo no primeiro frame de contato', move => {
    const sim = practice(); sim.stepFrame([input('N', [...move.input.buttons]), N]);
    advance(sim, move.startup - 1);
    sim.stepFrame([N, input('B')]);
    expect(sim.snapshot().hitEvents[0]).toMatchObject({ outcome: 'block', damage: 0 });
    expect(sim.snapshot().characters[0].attack).toBeDefined();
    const contact = sim.snapshot().hitEvents[0];
    expect(contact.attackerRecoveryFrames).toBe(move.activeFrames + move.recovery - 1);
    expect(contact.frameAdvantage).toBe(contact.defenderStunFrames - contact.attackerRecoveryFrames);
  });
  it.each(shoto.moves.filter(move => move.category === 'basic'))('$name não repete enquanto o botão estiver mantido', move => {
    const sim = practice(); const held = input('N', [...move.input.buttons]);
    advance(sim, 120, [held, N]);
    expect(sim.snapshot().characters[1].health).toBe(shoto.maxHealth - move.damage);
    expect(sim.snapshot().characters[0].attack).toBeUndefined();
  });
  it.each(['F', 'B'] as const)('direção %s não cria variantes', direction => {
    for (const move of shoto.moves.filter(move => move.category === 'basic')) {
      const sim = practice(); sim.stepFrame([input(direction, [...move.input.buttons]), N]);
      expect(sim.snapshot().characters[0].attack?.moveId).toBe(move.id);
    }
  });
  it.each([['1', '4'], ['2', '3'], ['1', '2', '3', '4']] as AttackButton[][])('ignora acorde sem cadastro %s', (...buttons: AttackButton[]) => {
    const sim = practice(); sim.stepFrame([input('N', buttons), N]); advance(sim, 80);
    expect(sim.snapshot().characters[0].attack).toBeUndefined(); expect(sim.snapshot().characters[1].health).toBe(shoto.maxHealth);
  });
  it('não cancela erro nem enfileira comandos antigos', () => {
    const sim = practice(300); sim.stepFrame([input('N', ['1']), N]);
    advance(sim, 9); sim.stepFrame([input('N', ['2']), N]);
    expect(sim.snapshot().characters[0].attack?.moveId).toBe('light-punch');
    advance(sim, 40); expect(sim.snapshot().characters[0].attack).toBeUndefined();
    expect(sim.snapshot().characters[1].health).toBe(shoto.maxHealth);
  });
  it('usa versão agachada sem criar básicos aéreos', () => {
    const sim = practice(); sim.stepFrame([input('D', ['1']), N]);
    expect(sim.snapshot().characters[0]).toMatchObject({ mode: 'startup', crouching: true, attack: {moveId:'crouch-punch'} });
    advance(sim,35);
    sim.stepFrame([input('U'), N]); sim.stepFrame([input('N', ['4']), N]);
    expect(sim.snapshot().characters[0].grounded).toBe(false);
    expect(sim.snapshot().characters[0].attack).toBeUndefined();
  });
  it('não soma acertos fora de alcance nem dá dano no bloqueio', () => {
    const sim = practice(300); sim.stepFrame([input('N', ['4']), N]); advance(sim, 40);
    expect(sim.snapshot().recentContacts).toEqual([]); expect(sim.snapshot().characters[1].health).toBe(shoto.maxHealth);
  });
  it('resolve simultâneos como trade sem viés de ordem', () => {
    const sim = practice(); sim.stepFrame([input('N', ['1']), input('N', ['1'])]); advance(sim, 6);
    expect(sim.snapshot().hitEvents).toHaveLength(2);
    expect(sim.snapshot().characters.map(character => character.health)).toEqual([980, 980]);
    expect(sim.snapshot().characters.every(character => character.mode === 'hitstun' && !character.attack)).toBe(true);
  });
  it('altos passam sobre agachamento; chutes médios atingem e podem ser defendidos baixo', () => {
    for (const [button, direction, expected] of [['1', 'D', 'miss'], ['3', 'D', 'hit'], ['4', 'DB', 'block']] as const) {
      const sim = practice(); sim.stepFrame([input('N', [button]), input(direction)]);
      advance(sim, 14, [N, input(direction)]);
      expect(sim.snapshot().recentContacts[0]?.event.outcome ?? 'miss').toBe(expected);
    }
  });
});

describe('fundação da simulação', () => {
  it('mantém os corpos na arena e não atravessa em aproximação', () => {
    // Isolate physical stage walls; shared viewport edges have their own integration coverage.
    const sim = new Simulation({...config,arena:{...config.arena,maxSeparation:undefined}},[shoto,shoto],{training:true,initialDistance:200});
    advance(sim, 300, [input('F'), input('F')]);
    const [a, b] = sim.snapshot().characters;
    expect(b.x - a.x).toBeGreaterThanOrEqual(shoto.collision.bodyWidth);
    advance(sim, 400, [input('B'), input('B')]);
    const ends = sim.snapshot().characters;
    expect(ends[0].x).toBe(config.arena.left + shoto.collision.bodyWidth / 2); expect(ends[1].x).toBe(config.arena.right - shoto.collision.bodyWidth / 2);
  });
  it('salta, aplica gravidade e aterrissa no piso compartilhado', () => {
    const sim = practice(); sim.stepFrame([input('UF'), N]);
    expect(sim.snapshot().characters[0].grounded).toBe(false);
    expect(sim.snapshot().characters[0].y).toBeLessThan(config.arena.floorY);
    advance(sim, 80);
    expect(sim.snapshot().characters[0]).toMatchObject({ grounded: true, y: config.arena.floorY, verticalVelocity: 0 });
  });
  it('reproduz a mesma sequência e protege snapshots contra mutação externa', () => {
    const a = practice(), b = practice();
    const stream = [input('F'), N, input('F'), input('N', ['2']), ...Array.from({ length: 100 }, () => N)];
    stream.forEach(value => { a.stepFrame([value, N]); b.stepFrame([value, N]); });
    expect(a.snapshot()).toEqual(b.snapshot());
    const copy = a.snapshot(); copy.characters[0].collision.bodyWidth = 999; copy.characters[0].health = 0;
    expect(a.snapshot().characters[0].collision.bodyWidth).toBe(55.2);
    expect(a.snapshot().characters[0].health).toBe(1000);
  });
  it('reseta vida, entradas, registros e opções de distância no treino', () => {
    const sim = practice(); sim.stepFrame([input('N', ['1']), N]); advance(sim, 8);
    expect(sim.snapshot().characters[1].health).toBe(980);
    sim.resetMatch(144); const snapshot = sim.snapshot();
    expect(snapshot.frame).toBe(0); expect(snapshot.hitEvents).toEqual([]); expect(snapshot.recentContacts).toEqual([]);
    expect(snapshot.characters.map(character => character.health)).toEqual([1000, 1000]);
    expect(snapshot.characters[1].x - snapshot.characters[0].x).toBe(144);
  });
  it('restaura vida só após 90 frames tranquilos e não encerra treino por KO ou tempo', () => {
    const fragile = { ...shoto, maxHealth: 20 };
    const sim = new Simulation({ ...config, match: { ...config.match, roundDurationFrames: 1 } }, [shoto, fragile], { training: true, initialDistance: 64 });
    sim.setTrainingAutoRestore(true); sim.stepFrame([input('N', ['1']), N]); advance(sim, 30);
    expect(sim.snapshot().characters[1].health).toBe(0); expect(sim.snapshot().phase).toBe('fight');
    advance(sim, 90); expect(sim.snapshot().characters[1].health).toBe(20);
    expect(sim.snapshot().roundFramesRemaining).toBe(1);
  });
  it('geometria é espelhada por personagem e não depende de arte', () => {
    const states = practice().snapshot().characters;
    expect(createHurtbox(states[0]).width).toBe(55.2);
    expect(createHurtbox({ ...states[1], crouching: true }).height).toBe(103.5);
  });
  it('vence rounds por KO, conta vitórias e permite reinício da partida', () => {
    const fragile = { ...shoto, maxHealth: 20 };
    const sim = new Simulation({ ...config, match: { ...config.match, roundEndPauseFrames: 2 } }, [fragile, fragile], { initialDistance: 64 });
    for (let round = 1; round <= 2; round++) {
      sim.stepFrame([input('N', ['1']), N]); advance(sim, 6 + CONTACT_HITSTOP_FRAMES);
      expect(sim.snapshot()).toMatchObject({ phase: 'round-over', round, roundEndReason: 'knockout', roundWinnerId: 'player-1' });
      expect(sim.snapshot().activeHitboxes).toEqual([]);
      advance(sim, 2);
    }
    expect(sim.snapshot()).toMatchObject({ phase: 'match-over', matchWinnerId: 'player-1', roundWins: [2, 0] });
    expect(sim.isMatchOver()).toBe(true); sim.resetMatch(); expect(sim.isMatchOver()).toBe(false);
  });
  it('resolve timeout e empate sem contatos antigos repetidos', () => {
    const timeout = { ...config, match: { ...config.match, roundCount: 1, roundDurationFrames: 1, roundEndPauseFrames: 1 } };
    const tie = new Simulation(timeout); tie.stepFrame([N, N]);
    expect(tie.snapshot()).toMatchObject({ phase: 'round-over', roundEndReason: 'draw' });
    tie.stepFrame([N, N]); expect(tie.snapshot().phase).toBe('match-over');
    const sim = new Simulation(timeout, [shoto, { ...shoto, maxHealth: 900 }]); sim.stepFrame([N, N]);
    expect(sim.snapshot()).toMatchObject({ roundEndReason: 'time', roundWinnerId: 'player-1' });
  });
});

it.each([30, 60, 120, 144])('relógio reproduz 120 frames lógicos em dois segundos a %i FPS', fps => {
  const sim = practice();
  for (let frame = 0; frame < fps * 2; frame++) sim.advance(1000 / fps, (_states, logicalFrame) => [logicalFrame === 0 ? input('N', ['1']) : N, N]);
  expect(sim.snapshot().elapsedFrames).toBe(120);
  expect(sim.snapshot().frame).toBe(120 - CONTACT_HITSTOP_FRAMES);
  expect(sim.snapshot().characters[1].health).toBe(980);
});

it('não interpreta novo botão com outro mantido como acorde ou golpe independente', () => {
  const sim = practice(); advance(sim, 50, [input('N', ['1']), N]);
  sim.stepFrame([input('N', ['1', '2']), N]); advance(sim, 40, [input('N', ['1', '2']), N]);
  expect(sim.snapshot().characters[1].health).toBe(980);
  expect(sim.snapshot().characters[0].attack).toBeUndefined();
});
