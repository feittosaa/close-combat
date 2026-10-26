import { expect, it } from 'vitest';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { getShotoSpriteLayers } from '../rendering/animations/shotoSprites';
import type { Direction, FrameInput } from '../input/types';

const input = (direction: Direction): FrameInput => ({ direction, buttons: new Set() });

it('não deixa o cenário aparecer através do corpo ao entrar, interromper ou sair de uma animação', () => {
  const sim = new Simulation(createGameConfig(2200, 700), undefined, { training: true, initialDistance: 900 });
  const script: Direction[] = [
    ...Array<Direction>(12).fill('F'), ...Array<Direction>(10).fill('N'),
    'B', 'N', 'F', 'N', 'D', 'N',
    ...Array<Direction>(12).fill('D'), ...Array<Direction>(10).fill('N'),
    'U', ...Array<Direction>(45).fill('N'),
    'F', 'N', 'F', ...Array<Direction>(30).fill('N'),
    'B', 'N', 'B', ...Array<Direction>(30).fill('N'),
  ];
  for (const direction of script) {
    sim.stepFrame([input(direction), input(direction)]);
    const snapshot = sim.snapshot();
    for (const character of snapshot.characters) {
      const layers = getShotoSpriteLayers(character, snapshot.frame);
      // Ordinary source-over: two partial layers with alpha summing to 1 are NOT opaque.
      const coverage = 1 - layers.reduce((uncovered, layer) => uncovered * (1 - layer.alpha), 1);
      expect(coverage, `frame ${snapshot.frame}, ${character.characterId}, ${character.mode}`).toBe(1);
      expect(layers.filter(layer => layer.alpha > 0)).toHaveLength(1);
    }
  }
});
