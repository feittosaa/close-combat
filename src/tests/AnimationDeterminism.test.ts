import { describe, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import testerManifest from '../assets/animations/tester.json';
import aylaManifest from '../assets/animations/ayla.json';
import grisManifest from '../assets/animations/gris.json';
import { CombatantView } from '../rendering/CombatantView';
import type { CharacterAnimationManifest } from '../rendering/animations/AnimationPlayback';
import { getCharacterById } from '../engine/data/characters';
import { createGameConfig } from '../engine/data/gameConfig';
import { Simulation } from '../engine/simulation/Simulation';
import type { SimulationSnapshot } from '../engine/simulation/Simulation';
import type { FrameInput } from '../input/types';

vi.mock('phaser', () => ({ default: {} }));

function inputs(frame: number): readonly FrameInput[] {
  const direction = frame >= 90 && frame < 100 ? 'UF' : frame >= 150 && frame < 165 ? 'D' : frame >= 180 && frame < 195 ? 'B' : 'N';
  return [{ direction, buttons: new Set(frame < 50 || (frame >= 65 && frame < 88) ? ['1'] as const : []) }, { direction: 'B', buttons: new Set() }];
}

function renderer(manifest: CharacterAnimationManifest) {
  const sprite = {
    setOrigin: vi.fn(), setDisplaySize: vi.fn(), setPosition: vi.fn(), setFlipX: vi.fn(),
    setTexture: vi.fn(), setFrame: vi.fn(), clearTint: vi.fn(), destroy: vi.fn(),
  };
  Object.values(sprite).forEach(fn => fn.mockReturnValue(sprite));
  const scene = { textures: { exists: () => true }, add: { sprite: () => sprite } } as unknown as Phaser.Scene;
  const view = new CombatantView(scene, 0, 0, 0xffffff, manifest.textureKey, manifest);
  return {
    sample(snapshot: SimulationSnapshot) {
      view.sync(snapshot.characters[0], snapshot.frame);
      return {
        texture: [...sprite.setTexture.mock.lastCall!], position: [...sprite.setPosition.mock.lastCall!],
        size: [...sprite.setDisplaySize.mock.lastCall!], origin: [...sprite.setOrigin.mock.lastCall!],
        flip: [...sprite.setFlipX.mock.lastCall!],
      };
    },
  };
}

for (const [id, manifest] of [['tester', testerManifest], ['ayla', aylaManifest], ['gris', grisManifest]] as const) {
  describe(`${id}: logical animation playback`, () => {
    it.each([30, 60, 120, 144])('preserves poses at %i FPS, while paused, and after reset', fps => {
      const createSimulation = () => new Simulation(createGameConfig(1024, 576), [getCharacterById(id)!, getCharacterById('tester')!], { training: true, initialDistance: 60 });
      const reference = createSimulation();
      const referenceView = renderer(manifest);
      const expected = new Map([[0, referenceView.sample(reference.snapshot())]]);
      const modes = new Set<string>();
      for (let i = 0; i < 240; i++) {
        reference.stepFrame(inputs(i));
        const snapshot = reference.snapshot();
        modes.add(snapshot.characters[0].mode);
        expected.set(snapshot.frame, referenceView.sample(snapshot));
      }
      expect([...modes]).toEqual(expect.arrayContaining(['startup', 'active', 'recovery', 'airborne', 'crouching', 'moving']));
      const simulation = createSimulation();
      const view = renderer(manifest);
      let paused = false;
      while (simulation.snapshot().frame < 220) {
        simulation.advance(1000 / fps, (_characters, frame) => inputs(frame));
        const snapshot = simulation.snapshot();
        expect(view.sample(snapshot), `logical frame ${snapshot.frame}`).toEqual(expected.get(snapshot.frame));
        if (!paused && snapshot.frame >= 40) {
          paused = true;
          const frozen = simulation.snapshot();
          const pose = view.sample(frozen);
          // Matches FightScene: rendering continues, but no delta reaches Simulation during pause.
          for (let render = 0; render < fps * 2; render++) expect(view.sample(simulation.snapshot())).toEqual(pose);
          expect(simulation.snapshot()).toEqual(frozen);
        }
      }
      simulation.resetMatch(60);
      expect(view.sample(simulation.snapshot())).toEqual(expected.get(0));
      for (let frame = 0; frame < 60; frame++) {
        simulation.stepFrame(inputs(frame));
        expect(view.sample(simulation.snapshot())).toEqual(expected.get(frame + 1));
      }
    });
  });
}
