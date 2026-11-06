import { expect, it } from 'vitest';
import { createGameConfig } from '../engine/data/gameConfig';
import { shoto } from '../engine/data/fighters/shoto';
import { cowboy } from '../engine/data/fighters/cowboy';
import type { CharacterDefinition } from '../engine/data/characters';
import { Simulation } from '../engine/simulation/Simulation';
import type { FrameInput } from '../input/types';

const neutral: FrameInput = { direction: 'N', buttons: new Set() };
const attack: FrameInput = { direction: 'N', buttons: new Set(['1', '2']) };
const fighter = (base: CharacterDefinition): CharacterDefinition => ({
  ...base, id: `${base.id}-bounce-test`, combos: [{ id: 'test', name: 'test', notation: '1+2,1+2', moveIds: ['power-punch', 'power-punch'] }], moves: [{ ...shoto.moves.find(move => move.id === 'power-punch')!,
    startup: 2, activeFrames: 2, recovery: 3, damage: 1, hitstun: 18, knockdown: false,
    hitbox: { forward: 0, yOffset: -600, width: 300, height: 600 },
    pushback: { hit: 250, block: 0 }, hitPushbackFrames: 12 }],
});

it.each([0, 1])('impede outro quique no próximo combo e libera o posterior, jogador %i', player => {
  for (const afterRecovery of [false, true]) {
    for (const victim of [shoto, cowboy]) {
      const base = createGameConfig(1024, 576);
      const config = { ...base, arena: { ...base.arena, left: 0, right: 350, maxSeparation: undefined } };
      const definitions: [CharacterDefinition, CharacterDefinition] = player === 0 ? [fighter(shoto), victim] : [victim, fighter(cowboy)];
      const sim = new Simulation(config, definitions, { training: true, initialDistance: 56 });
      const step = (value = neutral) => sim.stepFrame(player === 0 ? [value, neutral] : [neutral, value]);
      const until = (condition: () => boolean, description: string) => {
        for (let i = 0; i < 500 && !condition(); i++) step();
        expect(condition(), description).toBe(true);
      };
      const target = () => sim.snapshot().characters[1 - player];
      const strike = () => {
        until(() => !sim.snapshot().characters[player].attack && !sim.snapshot().hitstopFramesRemaining, 'atacante pronto');
        step(attack);
        until(() => sim.snapshot().hitEvents.some(event => event.attackerId === `player-${player + 1}` && event.outcome === 'hit'), 'acerto');
      };
      // Move both fighters close enough to the wall for the first attack to reach it.
      for (let i = 0; i < 150; i++) step({ direction: 'F', buttons: new Set() });
      strike();
      until(() => Boolean(target().wallBounceEffect), 'primeiro quique');
      const firstBounce = target().wallBounceEffect!.frame;
      expect(target().wallBounceProtection).toBe('waiting');
      if (afterRecovery) {
        until(() => target().mode === 'neutral' && !target().wakeupInvulnerabilityFrames, 'fim da primeira reação');
        expect(target().wallBounceProtection).toBe('waiting');
      }
      strike();
      expect(target().wallBounceProtection).toBe('receiving');
      if (afterRecovery) {
        step(neutral);
        step(attack);
        until(() => sim.snapshot().hitEvents.some(event => event.attackerId === `player-${player + 1}` && event.outcome === 'hit'), 'segundo acerto protegido');
        expect(target().wallBounceProtection).toBe('receiving');
      }
      for (let i = 0; i < 50; i++) step();
      expect(target().wallBounceEffect?.frame).toBe(firstBounce);
      until(() => target().mode === 'neutral' && !target().wakeupInvulnerabilityFrames, 'fim do combo protegido');
      expect(target().wallBounceProtection).toBeUndefined();
      strike();
      until(() => (target().wallBounceEffect?.frame ?? firstBounce) > firstBounce, 'quique posterior');
      sim.resetMatch();
      expect(sim.snapshot().characters.every(character => !character.wallBounceProtection)).toBe(true);
    }
  }
});

it.each([0, 1])('allows the victim to recover from a real wall bounce: victim %i', victim => {
  const base = createGameConfig(1024, 576);
  const config = { ...base, arena: { ...base.arena, left: 0, right: 350, maxSeparation: undefined } };
  const attacker = 1 - victim;
  const definitions: [CharacterDefinition, CharacterDefinition] = attacker === 0 ? [fighter(shoto), cowboy] : [cowboy, fighter(shoto)];
  const sim = new Simulation(config, definitions, { training: true, initialDistance: 56 });
  const step = (attackerInput = neutral, victimInput = neutral) => sim.stepFrame(attacker === 0 ? [attackerInput, victimInput] : [victimInput, attackerInput]);
  for (let i = 0; i < 150; i++) step({ direction: 'F', buttons: new Set() });
  step(attack);
  for (let i = 0; i < 500 && !sim.snapshot().characters[victim].wallBounceEffect; i++) step();
  expect(sim.snapshot().characters[victim].wallBounceEffect).toBeDefined();
  expect(sim.snapshot().characters[victim].grounded).toBe(false);
  sim.fillTrainingRage();
  step(neutral, { ...neutral, rageAction: true });
  const recovered = sim.snapshot().characters[victim];
  expect(recovered).toMatchObject({ rage: 800, remainingStateFrames: 0 });
  expect(['airborne', 'neutral']).toContain(recovered.mode);
  expect(recovered.juggle).toBeUndefined();
});

it.each([0, 1])('permite dano após o quique de um golpe que derruba: vítima %i', victim => {
  const base = createGameConfig(1024, 576);
  const config = { ...base, arena: { ...base.arena, left: 0, right: 350, maxSeparation: undefined } };
  const attacker = 1 - victim;
  const definitions: [CharacterDefinition, CharacterDefinition] = attacker === 0 ? [shoto, cowboy] : [cowboy, shoto];
  const sim = new Simulation(config, definitions, { training: true, initialDistance: 56 });
  const step = (attackerInput = neutral) => sim.stepFrame(attacker === 0 ? [attackerInput, neutral] : [neutral, attackerInput]);
  for (let i = 0; i < 150; i++) step({ direction: 'F', buttons: new Set() });
  step(attack);
  for (let i = 0; i < 500 && !sim.snapshot().characters[victim].wallBounceEffect; i++) step();
  expect(sim.snapshot().characters[victim].wallBounceEffect).toBeDefined();
  expect(sim.snapshot().characters[victim].wakeupInvulnerabilityFrames).toBeUndefined();
});
