import { expect, it } from 'vitest';
import { AttackResolver } from '../engine/combat/AttackResolver';
import { Simulation } from '../engine/simulation/Simulation';
import { shoto } from '../engine/data/fighters/shoto';
import { createGameConfig } from '../engine/data/gameConfig';
import type { ProjectileState } from '../engine/combat/ProjectileState';

const resolver = new AttackResolver((fighter, id) => fighter === 'shoto' ? shoto.moves.find(move => move.id === id) : undefined);
const neutral = [{ direction: 'N' as const, buttons: new Set<never>() }, { direction: 'N' as const, buttons: new Set<never>() }];
const moves = ['flying-kick-light', 'flying-kick-heavy', 'flying-kick-followup', 'reversal-light', 'reversal-kick'];

it.each([0, 1])('protege os especiais contra projéteis do início ao fim, lado %i', player => {
  for (const id of moves) {
    const move = shoto.moves.find(candidate => candidate.id === id)!;
    for (const elapsed of [0, move.startup, move.startup + move.activeFrames, move.startup + move.activeFrames + move.recovery - 1]) {
      const characters = [...new Simulation(createGameConfig(1024, 576), [shoto, shoto]).snapshot().characters];
      const target = characters[player], owner = characters[1 - player];
      target.attack = { moveId: id, buttons: move.input.buttons, elapsedFrames: elapsed, hasHit: false };
      target.mode = elapsed < move.startup ? 'startup' : elapsed < move.startup + move.activeFrames ? 'active' : 'recovery';
      const projectile: ProjectileState = { id: 1, ownerId: owner.characterId, fighterId: 'shoto', x: target.x - 10, y: target.y, facing: 'right', velocity: 0, remainingFrames: 10, visual: 'tomato', attack: { moveId: 'tomato-light', buttons: ['1'], elapsedFrames: 1, hasHit: false } };
      expect(resolver.resolve(characters, neutral, [projectile]), `${id} ${elapsed}`).toHaveLength(0);
      expect(projectile.attack.hasHit).toBe(false);
      target.attack = undefined; target.mode = 'neutral';
      expect(resolver.resolve(characters, neutral, [projectile]), `${id} controle`).toHaveLength(1);
    }
  }
});

it('a proteção contra projéteis não torna os outros especiais imunes a golpes físicos', () => {
  for (const id of moves.filter(id => id !== 'reversal-kick')) {
    const characters = [...new Simulation(createGameConfig(1024, 576), [shoto, shoto], { initialDistance: 56 }).snapshot().characters];
    const [attacker, target] = characters;
    attacker.mode = 'active'; attacker.attack = { moveId: 'light-punch', buttons: ['1'], elapsedFrames: 8, hasHit: false };
    target.mode = 'startup'; target.attack = { moveId: id, buttons: ['3'], elapsedFrames: 1, hasHit: false };
    expect(resolver.resolve(characters, neutral), id).toHaveLength(1);
  }
});
