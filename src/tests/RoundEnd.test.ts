import { expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { StagePresentation } from '../rendering/StagePresentation';
import { RESULT_TITLE_END_FRAME } from '../rendering/roundEnd';
import { getCowboyRoundEndPose } from '../rendering/animations/cowboySprites';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { cowboy } from '../engine/data/fighters/cowboy';

vi.mock('phaser', () => ({ default: {} }));
const chain = () => new Proxy({}, { get: (_target, key) => key === 'width' || key === 'height' ? 100 : () => chain() });
const scene = { add: { image: chain, rectangle: chain }, cameras: { add: chain, remove: () => undefined }, scale: { width: 1280, height: 720 }, children: { list: [] } } as unknown as Phaser.Scene;

it('a pose de vitória só começa depois que o título de vitória/round some, e não durante o K.O. nem o título', () => {
  const presentation = new StagePresentation(scene, 'sala-treino');
  const sim = new Simulation(createGameConfig(1024, 576), [cowboy, cowboy]);
  const base = sim.snapshot();
  const ended = { ...base, phase: 'round-over' as const, roundWinnerId: base.characters[0].characterId, roundEndReason: 'knockout' as const, roundEndedFrame: 100, knockoutStartedAt: 100 };
  const titleEnds = 100 + RESULT_TITLE_END_FRAME;
  let firstPose: number | undefined;
  for (let frame = 100; frame < 400 && firstPose === undefined; frame++) {
    presentation.update({ ...ended, frame }, 1000 / 60, 1024);
    if (presentation.resultElapsed(frame) === 0) firstPose = frame;
    // Nothing starts while K.O. or the victory title is on screen.
    if (frame < titleEnds) expect(presentation.resultElapsed(frame), `frame ${frame}`).toBeUndefined();
  }
  expect(firstPose).toBe(titleEnds);
  // The pause after the round leaves room for the longest result pose (about 80 frames) to reach its last drawing.
  expect(createGameConfig(1024, 576).match.roundEndPauseFrames - RESULT_TITLE_END_FRAME).toBeGreaterThanOrEqual(85);
});

it('o vencedor só faz a pose de vitória, sem animação de saída, por mais tempo que passe', () => {
  const texas = new Simulation(createGameConfig(1024, 576), [cowboy, cowboy]).snapshot().characters[0];
  for (const elapsed of [0, 79, 80, 240, 2000]) {
    expect(getCowboyRoundEndPose(texas, true, elapsed)?.texture).toBe('cowboy-victory');
    expect(getCowboyRoundEndPose(texas, true, elapsed)?.offsetX).toBe(0);
  }
});

it('o READY bloqueia tudo, o FIGHT libera só o movimento e os golpes esperam 8 quadros depois que ele some', () => {
  const presentation = new StagePresentation(scene, 'sala-treino');
  const snapshot = new Simulation(createGameConfig(1024, 576), [cowboy, cowboy]).snapshot();
  const phase = (elapsedMs: number) => { const blocked = presentation.update(snapshot, 0, 1024); return { blocked, moveOnly: presentation.moveOnly, elapsedMs }; };
  presentation.update(snapshot, 0, 1024);          // começa o round
  const tick = (ms: number) => presentation.update(snapshot, ms, 1024);
  expect(phase(0)).toMatchObject({ blocked: true, moveOnly: false });
  tick(1999);                                      // ainda no READY, mais longo no primeiro round
  expect(phase(1999)).toMatchObject({ blocked: true, moveOnly: false });
  tick(2);                                         // READY terminou: o FIGHT aparece
  expect(presentation.moveOnly).toBe(true);
  expect(tick(0)).toBe(false);
  tick(598);                                       // FIGHT some; faltam os 8 quadros de espera
  expect(presentation.moveOnly).toBe(true);
  tick(8 * 1000 / 60 - 2);
  expect(presentation.moveOnly).toBe(true);
  tick(5);                                         // luta liberada
  expect(presentation.moveOnly).toBe(false);
});
