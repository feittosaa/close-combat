import { describe, it, expect } from 'vitest';
import { ArcadeController, ARCADE_DIFFICULTIES, type ArcadeDifficulty } from '../engine/combat/ArcadeController';
import { Simulation } from '../engine/simulation/Simulation';
import { shoto } from '../engine/data/fighters/shoto';
import { cowboy } from '../engine/data/fighters/cowboy';
import { createGameConfig } from '../engine/data/gameConfig';
import type { CharacterDefinition } from '../engine/data/characters';

const levels = ARCADE_DIFFICULTIES.map(entry => entry.id);
function duel(first: [CharacterDefinition, ArcadeDifficulty], second: [CharacterDefinition, ArcadeDifficulty]) {
  const config = createGameConfig(1024, 576); config.match.roundCount = 1;
  const sim = new Simulation(config, [first[0], second[0]]);
  const bots = [new ArcadeController(first[0], second[0], first[1]), new ArcadeController(second[0], first[0], second[1])];
  const moves = new Set<string>();
  for (let f = 0; f < 6500 && !sim.isMatchOver(); f++) {
    const snapshot = sim.snapshot(), states = snapshot.characters;
    sim.stepFrame(bots.map((bot, i) => bot.readInput(f, states[i], states[1 - i], snapshot.projectiles)));
    sim.snapshot().recentContacts.forEach(contact => moves.add(`${contact.event.attackerId}:${contact.event.moveId}`));
  }
  return { snapshot: sim.snapshot(), moves };
}

describe('IA do Arcade', () => {
  it.each(levels)('conclui partida por entradas reais, de forma reproduzível (%s)', level => {
    const first = duel([shoto, level], [shoto, level]);
    expect(first.snapshot.phase).toBe('match-over');
    expect(first.snapshot.recentContacts.length).toBeGreaterThan(0);
    expect(first.snapshot).toEqual(duel([shoto, level], [shoto, level]).snapshot);
  });
  it('reproduz suas decisões após reset', () => {
    const sim = new Simulation(createGameConfig(1024, 576), [shoto, shoto], { training: true, initialDistance: 64 });
    const bot = new ArcadeController(shoto, shoto, 'hard'), states = sim.snapshot().characters;
    const read = () => Array.from({ length: 400 }, (_, f) => bot.readInput(f, states[1], states[0]));
    const first = read(); bot.reset(); expect(read()).toEqual(first);
  });
  it.each([[shoto, cowboy], [cowboy, shoto]])('o nível difícil vence o fácil, com o lado trocado também (%#)', (a, b) => {
    const outcomes = [duel([a, 'hard'], [b, 'easy']).snapshot.matchWinnerId, duel([b, 'easy'], [a, 'hard']).snapshot.matchWinnerId];
    expect(outcomes).toEqual(['player-1', 'player-2']);
  });
  it('o nível difícil usa especiais e golpes agachados que o fácil nunca usa', () => {
    const used = (level: ArcadeDifficulty) => [...duel([cowboy, level], [shoto, 'normal']).moves].filter(entry => entry.startsWith('player-1:')).map(entry => entry.split(':')[1]);
    const easy = used('easy'), hard = used('hard');
    expect(easy.every(id => cowboy.moves.find(move => move.id === id)?.category !== 'special')).toBe(true);
    expect(hard.some(id => cowboy.moves.find(move => move.id === id)?.category === 'special' || id.includes('crouch'))).toBe(true);
  });
});
