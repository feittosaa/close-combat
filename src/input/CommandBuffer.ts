// src/input/CommandBuffer.ts
import type { AttackButton, Direction, FrameInput } from './types';

export const COMMAND_BUFFER_FRAMES = 30;
export const SIMULTANEOUS_INPUT_WINDOW_FRAMES = 3;

export interface CommandCandidate {
  input: {
    buttons: readonly AttackButton[];
    direction?: Direction;
  };
}

/** Selects exact button matches, preferring chords and then explicit directions. */
export function resolveCommand<T extends CommandCandidate>(
  input: FrameInput,
  candidates: readonly T[],
): T | undefined {
  const matching = candidates.filter((candidate) => {
    if (candidate.input.buttons.length !== input.buttons.size) return false;
    if (!candidate.input.buttons.every((button) => input.buttons.has(button))) return false;
    return candidate.input.direction === undefined || candidate.input.direction === input.direction;
  });

  matching.sort((left, right) =>
    right.input.buttons.length - left.input.buttons.length ||
    Number(right.input.direction !== undefined) - Number(left.input.direction !== undefined),
  );
  return matching[0];
}

/** Retains recent logical inputs for command recognition and the input display. */
export class CommandBuffer {
  private readonly frames: FrameInput[] = [];

  constructor(private readonly capacityFrames = COMMAND_BUFFER_FRAMES) {}

  push(input: FrameInput): void {
    this.frames.push(input);
    if (this.frames.length > this.capacityFrames) this.frames.shift();
  }

  snapshot(): readonly FrameInput[] {
    return this.frames;
  }

  clear(): void {
    this.frames.length = 0;
  }
}
