import { expect, it } from 'vitest';
import { resultElapsed, TIMEOUT_TITLE_FRAMES } from '../rendering/roundEnd';
import { getCowboyRoundEndPose } from '../rendering/animations/cowboySprites';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { cowboy } from '../engine/data/fighters/cowboy';

it('a pose de vitória/derrota começa com o título de resultado, e no tempo esgotado depois do título TIME', () => {
  expect(resultElapsed(0, 'knockout')).toBe(0);
  expect(resultElapsed(TIMEOUT_TITLE_FRAMES - 1, 'time')).toBeUndefined();
  expect(resultElapsed(TIMEOUT_TITLE_FRAMES + 5, 'time')).toBe(5);
});

it('o vencedor só faz a pose de vitória, sem animação de saída, por mais tempo que passe', () => {
  const texas = new Simulation(createGameConfig(1024, 576), [cowboy, cowboy]).snapshot().characters[0];
  for (const elapsed of [0, 79, 80, 240, 2000]) {
    expect(getCowboyRoundEndPose(texas, true, elapsed)?.texture).toBe('cowboy-victory');
    expect(getCowboyRoundEndPose(texas, true, elapsed)?.offsetX).toBe(0);
  }
});
