import type { CharacterState } from '../engine/characters/CharacterState';
import { grappler } from '../engine/data/fighters/grappler';
import { grapplerCapturePose } from './grapplerCapture';

/** The trail follows the presented victim only during the confirmed throw's movement. */
export function grapplerTrail(attacker: CharacterState, victim: CharacterState) {
  const attack = attacker.attack;
  if (attacker.fighterId !== 'grappler' || !attack?.hasHit || victim.grapplerGrabReaction?.moveId !== attack.moveId) return undefined;
  const move = grappler.moves.find(candidate => candidate.id === attack.moveId);
  if (!move) return undefined;
  const age = attack.elapsedFrames - (attack.startupFrames ?? move.startup);
  const start = move.id === 'grab-throw' ? 8 : move.id === 'grab-slam' ? 4 : move.id === 'grab-launcher' ? 1 : undefined;
  if (start === undefined || age < start || age >= start + 18) return undefined;
  if (move.id === 'grab-throw' && (!victim.throwFlight || victim.throwPull || victim.grounded)) return undefined;
  if (move.id === 'grab-launcher' && victim.grounded) return undefined;
  const shown = grapplerCapturePose(victim, attacker);
  return { name: move.id === 'grab-throw' ? 'throw' : move.id === 'grab-slam' ? 'slam' : 'launcher',
    frame: Math.min(5, Math.floor((age - start) / 3)), x: shown.x, y: shown.y - 100,
    flipX: attacker.facing === 'left' };
}

/** Anchor the streak behind the victim along the authored travel direction. */
export function grapplerTrailPosition(victim: CharacterState, name: string, facing: CharacterState['facing']) {
  const sign = facing === 'right' ? 1 : -1;
  const offset = name === 'launcher' ? { x: -55, y: 65 } : name === 'slam' ? { x: -40, y: -155 } : { x: -65, y: -100 };
  return { x: victim.x + sign * offset.x, y: victim.y + offset.y };
}
