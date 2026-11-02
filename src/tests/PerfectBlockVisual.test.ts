import { expect, it, vi } from 'vitest';
import { ProjectileView } from '../rendering/ProjectileView';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import type { HitEvent } from '../engine/combat/AttackResolver';

it('draws a distinct expanding white burst for a perfect block', () => {
  const graphics = {
    clear: vi.fn(), setDepth: vi.fn(), lineStyle: vi.fn(), strokeCircle: vi.fn(), lineBetween: vi.fn(), destroy: vi.fn(),
  };
  for (const method of Object.values(graphics)) method.mockReturnValue(graphics);
  const scene = { add: { graphics: () => graphics }, textures: { exists: () => false } };
  const view = new ProjectileView(scene as never);
  const characters = new Simulation(createGameConfig(1024, 576)).snapshot().characters;
  const hit: HitEvent = { attackerId: 'player-1', targetId: 'player-2', moveId: 'light-punch',
    damage: 0, outcome: 'block', perfectBlock: true, pushback: 0,
    attackerRecoveryFrames: 0, defenderStunFrames: 0, frameAdvantage: 0 };
  view.sync([], [], 10, [hit], characters);
  expect(graphics.lineStyle).toHaveBeenCalledWith(3, 0xffffff, 1);
  expect(graphics.strokeCircle).toHaveBeenCalledTimes(1);
  expect(graphics.lineBetween).toHaveBeenCalledTimes(8);
  view.sync([], [], 22, [], characters);
  expect(graphics.strokeCircle).toHaveBeenCalledTimes(1);
  view.destroy();
});
