import { recoveryFrames } from '../../engine/combat/frameData';
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
  /** Pivô visual da pose aérea, em pixels da célula, alinhado ao centro da hurtbox. */
  bodyAnchor?: { x: number; y: number };
  /** Duração de cada pose em frames lógicos; em ataques funciona como peso dentro da fase. */
  frameDurations?: readonly number[];
  /** Poses de salto escolhidas pela trajetória, sem terminar o clipe antes da aterrissagem. */
  airbornePoses?: { rising: number; apex: number; falling: number; apexSpeed: number };
}

export interface CharacterAnimationManifest {
  textureKey: string;
  frameSize: { width: number; height: number };
  clips: readonly AnimationClip[];
  totalFrames?: number;
  displaySize?: { width: number; height: number };
  /** Coordenada dos pés na célula; correções são autoradas, não inferidas em tempo de execução. */
  footAnchorY?: number;
  frameTransforms?: Readonly<Record<string, { scale: number; footAnchorY?: number }>>;
  moveClips?: Readonly<Record<string, string>>;
  /** Atlas múltiplos mantêm índices lógicos únicos sem refazer os PNGs. */
  textureSources?: readonly { key: string; image: string; atlas: string }[];
  frameTextures?: Readonly<Record<string, string>>;
}

/** Explicit sequences can return through intermediate poses without duplicating the endpoints. */
export function getClipFrames(clip: AnimationClip): number[] {
  return clip.frames ? [...clip.frames] : Array.from({ length: clip.end - clip.start + 1 }, (_, i) => clip.start + i);
}

export function shouldFlipAnimation(facing: CharacterState['facing'], clip?: AnimationClip): boolean {
  return (facing === 'left') !== (clip?.sourceFacesLeft ?? false);
}

function poseAtTime(frames: readonly number[], durations: readonly number[], time: number): number {
  let cursor = 0;
  for (let index = 0; index < frames.length; index += 1) {
    cursor += durations[index];
    if (time < cursor) return frames[index];
  }
  return frames[frames.length - 1];
}

/** Shared by arena states and menu previews so authored holds have the same cadence. */
export function getTimedAnimationFrame(clip: AnimationClip, elapsedFrames: number): number {
  const frames = getClipFrames(clip);
  const durations = clip.frameDurations ?? frames.map(() => 60 / clip.frameRate);
  const cycle = durations.reduce((sum, duration) => sum + duration, 0);
  const elapsed = Math.max(0, elapsedFrames);
  if (clip.repeat !== -1 && elapsed >= cycle * (clip.repeat + 1)) return frames[frames.length - 1];
  return poseAtTime(frames, durations, elapsed % cycle);
}

/** Sample the exact logical frame. Pausing or changing display FPS cannot advance a pose. */
export function getStateAnimationFrame(state: CharacterState, clip: AnimationClip, simulationFrame: number): number {
  if (!state.grounded && clip.airbornePoses) {
    const poses = clip.airbornePoses;
    if (Math.abs(state.verticalVelocity) <= poses.apexSpeed) return poses.apex;
    return state.verticalVelocity < 0 ? poses.rising : poses.falling;
  }
  const frames = getClipFrames(clip);
  const durations = clip.frameDurations ?? frames.map(() => 60 / clip.frameRate);
  const cycle = durations.reduce((sum, duration) => sum + duration, 0);
  const elapsed = Math.max(0, simulationFrame - state.stateStartedFrame);
  if (['hitstun', 'blockstun', 'grabbed', 'throwRecovery'].includes(state.mode) && state.remainingStateFrames > 0) {
    return poseAtTime(frames, durations, elapsed * cycle / (elapsed + state.remainingStateFrames));
  }
  return getTimedAnimationFrame(clip, elapsed);
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
    duration = recoveryFrames(move, state.attack.wasBlocked ? 'block' : state.attack.hitOutcome);
  } else return undefined;

  const frames = getClipFrames(clip);
  const weights = clip.frameDurations ?? frames.map(() => 1);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const time = Math.max(0, Math.min(duration - 1, elapsed)) * total / Math.max(1, duration);
  return poseAtTime(frames, weights, time);
}

/** Reject invalid delivery data before a match starts instead of silently showing unrelated frames. */
export function validateAnimationManifest(manifest: CharacterAnimationManifest): void {
  const positive = (value: number): boolean => Number.isFinite(value) && value > 0;
  if (!manifest.textureKey || !positive(manifest.frameSize.width) || !positive(manifest.frameSize.height) ||
      !manifest.clips.length || (manifest.totalFrames !== undefined && (!Number.isInteger(manifest.totalFrames) || manifest.totalFrames <= 0))) {
    throw new Error(`Manifesto de animação inválido: ${manifest.textureKey}`);
  }
  if (manifest.displaySize && (!positive(manifest.displaySize.width) || !positive(manifest.displaySize.height) ||
      manifest.displaySize.width / manifest.frameSize.width !== manifest.displaySize.height / manifest.frameSize.height)) {
    throw new Error(`Escala de personagem deve ser uniforme: ${manifest.textureKey}`);
  }
  const validAnchor = (value: number): boolean => Number.isFinite(value) && value > 0 && value <= manifest.frameSize.height;
  if (manifest.footAnchorY !== undefined && !validAnchor(manifest.footAnchorY)) {
    throw new Error(`Âncora dos pés inválida: ${manifest.textureKey}`);
  }
  for (const [frame, transform] of Object.entries(manifest.frameTransforms ?? {})) {
    if (!/^\d+$/.test(frame) || (manifest.totalFrames !== undefined && Number(frame) >= manifest.totalFrames) ||
        !positive(transform.scale) || (transform.footAnchorY !== undefined && !validAnchor(transform.footAnchorY))) {
      throw new Error(`Correção de quadro inválida: ${manifest.textureKey}/${frame}`);
    }
  }
  const keys = new Set<string>();
  if (manifest.textureSources) {
    const textures = new Set(manifest.textureSources.map((source) => source.key));
    if (textures.size !== manifest.textureSources.length || !textures.has(manifest.textureKey)) {
      throw new Error(`Texturas inválidas: ${manifest.textureKey}`);
    }
    for (let frame = 0; frame < (manifest.totalFrames ?? 0); frame += 1) {
      if (!textures.has(manifest.frameTextures?.[String(frame)] ?? '')) {
        throw new Error(`Quadro sem textura: ${manifest.textureKey}/${frame}`);
      }
    }
  }
  for (const clip of manifest.clips) {
    const frames = getClipFrames(clip);
    if (clip.bodyAnchor && (!Number.isFinite(clip.bodyAnchor.x) || clip.bodyAnchor.x < 0 || clip.bodyAnchor.x > manifest.frameSize.width || !Number.isFinite(clip.bodyAnchor.y) || clip.bodyAnchor.y < 0 || clip.bodyAnchor.y > manifest.frameSize.height)) {
      throw new Error(`Pivô corporal inválido: ${clip.key}`);
    }
    if (keys.has(clip.key) || !clip.key || !Number.isInteger(clip.start) || !Number.isInteger(clip.end) || clip.start > clip.end ||
        !frames.length || frames.some((frame) => !Number.isInteger(frame) || frame < 0 ||
          (manifest.totalFrames !== undefined && frame >= manifest.totalFrames)) ||
        !positive(clip.frameRate) || !Number.isInteger(clip.repeat) || clip.repeat < -1 ||
        (clip.frameDurations && (clip.frameDurations.length !== frames.length || !clip.frameDurations.every(positive)))) {
      throw new Error(`Clipe de animação inválido: ${clip.key}`);
    }
    if (clip.airbornePoses && (!Number.isFinite(clip.airbornePoses.apexSpeed) || clip.airbornePoses.apexSpeed < 0 ||
        ![clip.airbornePoses.rising, clip.airbornePoses.apex, clip.airbornePoses.falling].every((frame) => frames.includes(frame)))) {
      throw new Error(`Poses aéreas inválidas: ${clip.key}`);
    }
    keys.add(clip.key);
  }
}

export function validateAnimationCoverage(manifest: CharacterAnimationManifest, characterId: string, moves: readonly MoveDefinition[]): void {
  const keys = new Set(manifest.clips.map(({ key }) => key));
  const required = ['idle', 'walk', 'dash', 'jump', 'crouch', 'defense', 'hit', 'blockstun', 'grabbed', 'knockdown', 'throw-recovery']
    .map((suffix) => `${characterId}-${suffix}`);
  for (const move of moves) {
    const name = move.combat?.animation.clip ?? manifest.moveClips?.[move.id] ?? move.id;
    for (const phase of ['startup', 'active', 'recovery']) required.push(`${characterId}-${name}-${phase}`);
  }
  const missing = required.filter((key) => !keys.has(key));
  if (missing.length) throw new Error(`Animações ausentes para ${characterId}: ${missing.join(', ')}`);
}
