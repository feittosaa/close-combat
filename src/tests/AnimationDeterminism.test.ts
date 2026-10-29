import { it, expect, vi } from 'vitest';
import type Phaser from 'phaser';
import { CombatantView } from '../rendering/CombatantView';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { defaultCharacter as shoto } from '../engine/data/characters';
vi.mock('phaser', () => ({ default: {} }));
it('geometria neutra mantém corpo, pés e contato em FPS distintos, pausa e reset', () => {
  const read = (fps: number) => {
    const commands: unknown[][] = [];
    const graphics = Object.fromEntries(['setDepth', 'clear', 'fillStyle', 'fillRect', 'lineStyle', 'strokeRect', 'lineBetween', 'destroy'].map(method => [method, (...args: unknown[]) => { commands.push([method, ...args]); return graphics; }]));
    const view = new CombatantView({ add: { graphics: () => graphics } } as unknown as Phaser.Scene, 0xe45b5b);
    const sim = new Simulation(createGameConfig(1024, 576), [shoto, shoto], { training: true, initialDistance: 64 });
    const N = { direction: 'N' as const, buttons: new Set<'1'>() };
    for (let i = 0; i < fps; i++) {
      sim.advance(1000 / fps, (_states, frame) => [{ ...N, buttons: new Set(frame === 0 ? ['1'] as const : []) }, N]);
      view.sync(sim.snapshot().characters[0], sim.snapshot().frame);
    }
    commands.length = 0; const state = sim.snapshot(); view.sync(state.characters[0], state.frame);
    const first = [...commands]; commands.length = 0; view.sync(state.characters[0], state.frame);
    expect(commands).toEqual(first);
    sim.resetMatch(); sim.stepFrame([{ ...N, buttons: new Set(['1']) }, N]);
    for (let i = 0; i < 10; i++) sim.stepFrame([N, N]);
    commands.length = 0; view.sync(sim.snapshot().characters[0], sim.snapshot().frame);
    expect(commands.filter((command) => command[0] === 'fillRect')).toHaveLength(3);
    expect(commands).toContainEqual(['fillRect', sim.snapshot().characters[0].x - 30.36, expect.closeTo(305.84), 60.72, 182.16]);
    return first;
  };
  const first = read(60); for (const fps of [30, 120, 144]) expect(read(fps)).toEqual(first);
});
