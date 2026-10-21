import { describe, expect, it } from 'vitest';
import { ArcadeController } from '../engine/combat/ArcadeController';
import { ayla } from '../engine/data/fighters/ayla';
import { defaultCharacter } from '../engine/data/characters';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import type { FrameInput } from '../input/types';

const neutral: FrameInput = { direction: 'N', buttons: new Set() };
function run() {
  const sim = new Simulation(createGameConfig(1024, 576), [defaultCharacter, ayla], { training: true });
  const bot = new ArcadeController(ayla, defaultCharacter);
  let attacks = 0;
  for (let i = 0; i < 900; i += 1) {
    const snapshot = sim.snapshot();
    const ai = bot.readInput(snapshot.frame, snapshot.characters[1], snapshot.characters[0], snapshot.projectiles);
    sim.stepFrame([neutral, ai]);
    if (sim.snapshot().hitEvents.length) attacks += 1;
  }
  return { snapshot: sim.snapshot(), attacks };
}

describe('arcade com entradas determinísticas', () => {
  it('aproxima, escolhe comandos do livro e causa contato sem dano imposto', () => {
    const { snapshot, attacks } = run();
    expect(attacks).toBeGreaterThan(0);
    expect(snapshot.characters[0].health).toBeLessThan(1000);
    expect(snapshot.recentContacts.every(({ event }) => event.attackerId === 'player-2' && ayla.moves.some((m) => m.id === event.moveId))).toBe(true);
  });
  it('reproduz o mesmo resultado a partir do mesmo estado e das mesmas entradas', () => {
    expect(run()).toEqual(run());
  });
});
