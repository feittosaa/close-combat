import { expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { StagePresentation } from '../rendering/StagePresentation';
import { getCowboyRoundEndPose } from '../rendering/animations/cowboySprites';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { cowboy } from '../engine/data/fighters/cowboy';

vi.mock('phaser', () => ({ default: {} }));
const chain = () => new Proxy({}, { get: (_target, key) => key === 'width' || key === 'height' ? 100 : () => chain() });
const scene = { add: { image: chain, rectangle: chain }, cameras: { add: chain, remove: () => undefined }, scale: { width: 1280, height: 720 }, children: { list: [] } } as unknown as Phaser.Scene;

it('a pose de vitória só começa quando o título de vitória aparece, depois do K.O.', () => {
  const presentation = new StagePresentation(scene, 'sala-treino');
  const sim = new Simulation(createGameConfig(1024, 576), [cowboy, cowboy]);
  const base = sim.snapshot();
  const ended = { ...base, phase: 'round-over' as const, roundWinnerId: base.characters[0].characterId, roundEndReason: 'knockout' as const, roundEndedFrame: 100, knockoutStartedAt: 100 };
  let firstPose: number | undefined;
  for (let frame = 100; frame < 300 && firstPose === undefined; frame++) {
    presentation.update({ ...ended, frame }, 1000 / 60, 1024);
    if (presentation.resultElapsed(frame) === 0) firstPose = frame;
    if (frame < 210) expect(presentation.resultElapsed(frame), `frame ${frame}`).toBeUndefined();
  }
  // The K.O. title lasts two seconds (~120 frames); the victory title and the pose start right after it.
  expect(firstPose).toBeGreaterThanOrEqual(219);
  expect(firstPose).toBeLessThan(260);
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
  tick(999);                                       // ainda no READY
  expect(phase(999)).toMatchObject({ blocked: true, moveOnly: false });
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
