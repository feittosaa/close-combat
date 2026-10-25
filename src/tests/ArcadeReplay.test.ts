import { it, expect } from 'vitest';
import { ArcadeController } from '../engine/combat/ArcadeController';
import { Simulation } from '../engine/simulation/Simulation';
import { defaultCharacter as shoto } from '../engine/data/characters';
import { createGameConfig } from '../engine/data/gameConfig';
it('Arcade espelhado conclui partida por entradas reais, de forma reproduzível', () => {
  const run = () => {
    const config = createGameConfig(1024, 576); config.match.roundCount = 1;
    const sim = new Simulation(config);
    const bots = [new ArcadeController(shoto, shoto), new ArcadeController(shoto, shoto)];
    for (let f = 0; f < 6500 && !sim.isMatchOver(); f++) {
      const states = sim.snapshot().characters;
      sim.stepFrame(bots.map((bot, i) => bot.readInput(f, states[i], states[1 - i])));
    }
    return sim.snapshot();
  };
  const first = run(); expect(first.phase).toBe('match-over');
  expect(first.recentContacts.length).toBeGreaterThan(0); expect(first).toEqual(run());
});
