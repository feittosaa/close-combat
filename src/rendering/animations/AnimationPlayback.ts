import type { CharacterState } from '../../engine/characters/CharacterState';
import type { MoveDefinition } from '../../engine/data/moves';

export interface AnimationClip {
  key: string;
  start: number;
  end: number;
  frames?: readonly number[];
  frameRate: number;
  repeat: number;
  sourceFacesLeft?: boolean;
}

export interface CharacterAnimationManifest {
  textureKey: string;
  frameSize: { width: number; height: number };
  clips: readonly AnimationClip[];
}

/** Explicit sequences can return through intermediate poses without duplicating the endpoints. */
export function getClipFrames(clip: AnimationClip): number[] {
  return clip.frames ? [...clip.frames] : Array.from({ length: clip.end - clip.start + 1 }, (_, i) => clip.start + i);
}

export function shouldFlipAnimation(facing: CharacterState['facing'], clip?: AnimationClip, walkingBackward = false): boolean {
  return ((facing === 'left') !== (clip?.sourceFacesLeft ?? false)) !== walkingBackward;
}

/** Spread the drawn poses across the actual combat phase; visual playback never changes combat timing. */
export function getAttackAnimationFrame(
  state: CharacterState,
  clip: AnimationClip,
  move?: MoveDefinition,
): number | undefined {
  if (!state.attack || !move) return undefined;
  let elapsed: number;
  let duration: number;
  if (state.mode === 'startup') {
    elapsed = state.attack.elapsedFrames;
    duration = move.startup;
  } else if (state.mode === 'active') {
    elapsed = state.attack.elapsedFrames - move.startup;
    duration = move.activeFrames;
  } else if (state.mode === 'recovery') {
    elapsed = state.attack.elapsedFrames - move.startup - move.activeFrames;
    duration = move.recovery;
  } else return undefined;

  const frames = getClipFrames(clip);
  const index = Math.min(frames.length - 1, Math.floor(Math.max(0, elapsed) * frames.length / Math.max(1, duration)));
  return frames[index];
}
