import { describe, expect, it } from 'vitest';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { ayla } from '../engine/data/fighters/ayla';
import { gris } from '../engine/data/fighters/gris';
import { defaultCharacter } from '../engine/data/characters';
import { ArcadeController } from '../engine/combat/ArcadeController';
import { TrainingSession, DUMMY_MODES } from '../training/TrainingSession';
import testerManifest from '../assets/animations/tester.json';
import { getCharacterAnimationKey } from '../rendering/animations/CharacterAnimationMap';
import { getStateAnimationFrame } from '../rendering/animations/AnimationPlayback';
import type { AttackButton, Direction, FrameInput } from '../input/types';

const neutral: FrameInput = { direction: 'N', buttons: new Set() };

function knockDown(target = defaultCharacter) {
  const sim = new Simulation(createGameConfig(1600, 700), [ayla, target], { training: true, initialDistance: 62 });
  // Real launcher followed by an untouched landing; no injected character state.
  sim.stepFrame([{ direction: 'N', buttons: new Set(['1', '2', '3']) }, neutral]);
  for (let frame = 0; frame < 180 && sim.snapshot().characters[1].mode !== 'knockdown'; frame++) {
    sim.stepFrame([neutral, neutral]);
  }
  expect(sim.snapshot().characters[1]).toMatchObject({ mode: 'knockdown', grounded: true, verticalVelocity: 0 });
  return sim;
}

describe('retorno após queda', () => {
  it.each([defaultCharacter, ayla, gris])('o Arcade levanta $name e retoma as decisões', fighter => {
    const sim = knockDown(fighter);
    const controller = new ArcadeController(fighter, ayla);
    for (let frame = 0; frame < 120; frame++) {
      const snapshot = sim.snapshot();
      sim.stepFrame([neutral, controller.readInput(snapshot.frame, snapshot.characters[1], snapshot.characters[0], snapshot.projectiles)]);
    }
    expect(sim.snapshot().characters[1].mode).not.toBe('knockdown');
    expect(sim.snapshot().characters[1].grounded).toBe(true);
  });

  it.each(DUMMY_MODES.filter(mode => mode !== 'manual'))('o treino %s levanta e retoma seu comportamento', mode => {
    const sim = knockDown();
    const session = new TrainingSession();
    session.dummyMode = mode;
    for (let frame = 0; frame < 150; frame++) {
      const snapshot = sim.snapshot();
      sim.stepFrame([neutral, session.dummyInput(snapshot.frame, snapshot.characters, snapshot.projectiles)!]);
    }
    expect(sim.snapshot().characters[1].mode).not.toBe('knockdown');
  });

  it.each([defaultCharacter, ayla, gris])('preserva a espera manual de $name e recupera com um novo soco', fighter => {
    const sim = knockDown(fighter);
    const session = new TrainingSession();
    session.dummyMode = 'manual';
    for (let frame = 0; frame < 180; frame++) {
      const snapshot = sim.snapshot();
      expect(session.dummyInput(snapshot.frame, snapshot.characters)).toBeUndefined();
      sim.stepFrame([neutral, neutral]);
    }
    expect(sim.snapshot().characters[1].mode).toBe('knockdown');
    sim.stepFrame([neutral, { direction: 'N', buttons: new Set(['1']) }]);
    expect(sim.snapshot().characters[1].attack?.moveId).toBe(fighter.id === 'tester' ? 'test-jab' : 'standing-lp');
    for (let frame = 0; frame < 60; frame++) sim.stepFrame([neutral, neutral]);
    expect(sim.snapshot().characters[1]).toMatchObject({ mode: 'neutral', grounded: true, verticalVelocity: 0 });
  });

  it.each(['1', '2', 'F', 'B'] as const)('a levantada manual %s devolve controle a Ayla', action => {
    const sim = knockDown(ayla);
    const direction: Direction = action === 'F' || action === 'B' ? action : 'N';
    const buttons: AttackButton[] = action === '1' || action === '2' ? [action] : [];
    sim.stepFrame([neutral, { direction, buttons: new Set(buttons) }]);
    expect(sim.snapshot().characters[1].mode).not.toBe('knockdown');
    for (let frame = 0; frame < 60; frame++) sim.stepFrame([neutral, neutral]);
    expect(sim.snapshot().characters[1]).toMatchObject({ mode: 'neutral', grounded: true, verticalVelocity: 0 });
    expect(sim.snapshot().characters[1].y).toBe(createGameConfig(1600, 700).arena.floorY);
  });

  it('os controladores soltam a guarda durante a proteção e geram nova entrada depois', () => {
    const sim = knockDown();
    const snapshot = sim.snapshot();
    const target = { ...snapshot.characters[1], remainingStateFrames: 26 };
    const characters = [snapshot.characters[0], target];
    const training = new TrainingSession();
    training.dummyMode = 'guard-high';
    const bot = new ArcadeController(defaultCharacter, ayla);
    for (let frame = 1; frame <= 25; frame++) {
      expect(bot.readInput(frame, target, characters[0], []).direction).toBe('N');
      expect(training.dummyInput(frame, characters)!.direction).toBe('N');
    }
    target.remainingStateFrames = 0;
    expect(bot.readInput(26, target, characters[0], []).direction).toBe('N');
    expect(training.dummyInput(26, characters)!.direction).toBe('N');
    expect(bot.readInput(27, target, characters[0], []).direction).toBe('B');
    expect(training.dummyInput(27, characters)!.direction).toBe('B');
  });

  it.each([defaultCharacter, ayla, gris])('o alvo padrão $name volta ao idle e recebe novos golpes', fighter => {
    const sim = knockDown(fighter);
    const session = new TrainingSession();
    for (let frame = 0; frame < 90; frame++) {
      const snapshot = sim.snapshot();
      sim.stepFrame([neutral, session.dummyInput(snapshot.frame, snapshot.characters, snapshot.projectiles) ?? neutral]);
    }
    const recovered = sim.snapshot().characters[1];
    expect(recovered).toMatchObject({ mode: 'neutral', grounded: true, remainingStateFrames: 0 });
    expect(recovered.combo).toBeUndefined();
    expect(getCharacterAnimationKey(recovered)).toBe(`${fighter.id}-idle`);
    const health = recovered.health;
    sim.stepFrame([{ direction: 'N', buttons: new Set(['1']) }, neutral]);
    for (let frame = 0; frame < 20; frame++) sim.stepFrame([neutral, neutral]);
    expect(sim.snapshot().characters[1].health).toBeLessThan(health);
    const contacts = sim.snapshot().recentContacts;
    expect(contacts[contacts.length - 1]?.event).toMatchObject({ outcome: 'hit', targetId: 'player-2' });
  });

  it('a pose de queda de Tester não reproduz a levantada enquanto o estado ainda é caído', () => {
    const sim = knockDown();
    const state = sim.snapshot().characters[1];
    const clip = testerManifest.clips.find(clip => clip.key === 'tester-knockdown')!;
    // Frame 108 is the final prone pose. 109 onward already depicts getting up.
    expect(getStateAnimationFrame(state, clip, sim.snapshot().frame + 180)).toBe(108);
    expect(getCharacterAnimationKey(state)).toBe('tester-knockdown');
  });

});
