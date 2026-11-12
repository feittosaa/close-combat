import { afterEach, expect, it, vi } from 'vitest';
import { FightScene } from '../scenes/FightScene';
import { resetControls, saveSystemControls } from '../input/controlSettings';
import type { MatchMode } from '../scenes/matchSetup';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { defaultCharacter } from '../engine/data/characters';

vi.mock('phaser', () => ({ default: { Scene: class {} } }));
afterEach(() => resetControls());

it.each(['training', 'tutorial', 'versus', 'arcade'] as MatchMode[])(
  'only resets the training mode with the configured shortcut: %s', mode => {
    saveSystemControls({ pause: 'KeyP', reset: 'KeyZ' });
    const scene = new FightScene(); scene.init({ mode });
    const resetFight = vi.fn();
    Object.assign(scene, { simulation: {}, resetFight });
    const handle = Reflect.get(scene, 'handleRestart') as (event: KeyboardEvent) => void;
    const press = (code: string) => ({ code, repeat: false, preventDefault: vi.fn() } as unknown as KeyboardEvent);
    handle(press('KeyR'));
    expect(resetFight).not.toHaveBeenCalled();
    const configured = press('KeyZ'); handle(configured);
    expect(resetFight).toHaveBeenCalledTimes(mode === 'training' || mode === 'tutorial' ? 1 : 0);
    expect(configured.preventDefault).toHaveBeenCalledTimes(mode === 'training' || mode === 'tutorial' ? 1 : 0);
  },
);

it('free training reset asks the simulation to keep rage', () => {
  const scene = new FightScene(); scene.init({ mode: 'training' });
  const simulation = { resetMatch: vi.fn(), setTrainingWall: vi.fn() };
  Object.assign(scene, { simulation, syncViewsAndHud: vi.fn() });
  (Reflect.get(scene, 'resetFight') as (reposition: boolean) => void).call(scene, true);
  expect(simulation.resetMatch).toHaveBeenCalledWith(expect.anything(), true);
});

it('training keeps rage on a reposition reset; other resets clear it', () => {
  const training = new Simulation(createGameConfig(1024, 576), [defaultCharacter, defaultCharacter], { training: true });
  training.fillTrainingRage();
  const full = training.snapshot().characters.map(character => character.rage);
  expect(full[0]).toBeGreaterThan(0);
  training.resetMatch(undefined, true);
  expect(training.snapshot().characters.map(character => character.rage)).toEqual(full);
  training.resetMatch();
  expect(training.snapshot().characters.map(character => character.rage)).toEqual([0, 0]);
  const versus = new Simulation(createGameConfig(1024, 576), [defaultCharacter, defaultCharacter]);
  versus.resetMatch(undefined, true);
  expect(versus.snapshot().characters.map(character => character.rage)).toEqual([0, 0]);
});
