import { it, expect } from 'vitest';
import { ArcadeController } from '../engine/combat/ArcadeController';
import { Simulation } from '../engine/simulation/Simulation';
import { defaultCharacter as shoto } from '../engine/data/characters';
import { createGameConfig } from '../engine/data/gameConfig';
it('IA só emite os quatro botões legais e reproduz suas decisões após reset', () => {
  const sim = new Simulation(createGameConfig(1024, 576), [shoto, shoto], { training: true, initialDistance: 64 });
  const bot = new ArcadeController(shoto, shoto), states = sim.snapshot().characters;
  const read = () => Array.from({ length: 400 }, (_, f) => bot.readInput(f, states[1], states[0]));
  const first = read(); expect(first.some(value => value.buttons.size === 1)).toBe(true);
  expect(first.every(value => value.buttons.size <= 1 && [...value.buttons].every(button => ['1', '2', '3', '4'].includes(button)))).toBe(true);
  bot.reset(); expect(read()).toEqual(first);
});
