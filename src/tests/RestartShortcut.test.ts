import { afterEach, expect, it, vi } from 'vitest';
import { FightScene } from '../scenes/FightScene';
import { resetControls, saveSystemControls } from '../input/controlSettings';
import type { MatchMode } from '../scenes/matchSetup';

vi.mock('phaser', () => ({ default: { Scene: class {} } }));
afterEach(() => resetControls());

it.each(['training', 'tutorial', 'combo-tutorial', 'versus', 'arcade'] as MatchMode[])(
  'only resets the training mode with the configured shortcut: %s', mode => {
    saveSystemControls({ pause: 'KeyP', reset: 'KeyE' });
    const scene = new FightScene(); scene.init({ mode });
    const resetFight = vi.fn();
    Object.assign(scene, { simulation: {}, resetFight });
    const handle = Reflect.get(scene, 'handleRestart') as (event: KeyboardEvent) => void;
    const press = (code: string) => ({ code, repeat: false, preventDefault: vi.fn() } as unknown as KeyboardEvent);
    handle(press('KeyR'));
    expect(resetFight).not.toHaveBeenCalled();
    const configured = press('KeyE'); handle(configured);
    expect(resetFight).toHaveBeenCalledTimes(mode === 'training' ? 1 : 0);
    expect(configured.preventDefault).toHaveBeenCalledTimes(mode === 'training' ? 1 : 0);
  },
);
