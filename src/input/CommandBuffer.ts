// src/input/CommandBuffer.ts
import type { AttackButton, Direction, FrameInput } from './types';

export const COMMAND_BUFFER_FRAMES = 30;
export const SIMULTANEOUS_INPUT_WINDOW_FRAMES = 3;
export const COMMAND_SEQUENCE_WINDOW_FRAMES = 12;

export interface CommandCandidate {
  input: {
    buttons: readonly AttackButton[];
    direction?: Direction;
    sequence?: readonly Direction[];
  };
  precisionWindowFrames?: number;
  airborne?: boolean;
  crouching?: boolean;
}

export interface CommandContext {
  airborne: boolean;
  crouching: boolean;
}

interface ButtonPress {
  frame: number;
  direction: Direction;
  context: CommandContext;
}

/** Selects exact button matches, preferring chords and then explicit directions. */
export function resolveCommand<T extends CommandCandidate>(
  input: FrameInput,
  candidates: readonly T[],
): T | undefined {
  const matching = candidates.filter((candidate) => {
    if (candidate.input.sequence) return false;
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

/** Converts recent button-down edges into one prioritized move command. */
export class CommandParser {
  private previousButtons = new Set<AttackButton>();
  private readonly buttonPresses = new Map<AttackButton, ButtonPress>();
  private previousDirection: Direction = 'N';
  private readonly directionPresses: { direction: Direction; frame: number }[] = [];

  update<T extends CommandCandidate>(
    input: FrameInput,
    frame: number,
    candidates: readonly T[],
    context: CommandContext,
  ): T | undefined {
    if (input.direction !== this.previousDirection) {
      this.directionPresses.push({ direction: input.direction, frame });
    }
    this.previousDirection = input.direction;
    while (this.directionPresses[0] && frame - this.directionPresses[0].frame > COMMAND_SEQUENCE_WINDOW_FRAMES) {
      this.directionPresses.shift();
    }

    for (const button of input.buttons) {
      if (!this.previousButtons.has(button)) {
        this.buttonPresses.set(button, { frame, direction: input.direction, context });
      }
    }
    this.previousButtons = new Set(input.buttons);

    // A completed command outside the grace window falls back to its single button.
    const expired = [...this.buttonPresses.entries()]
      .filter(([, press]) => frame - press.frame > SIMULTANEOUS_INPUT_WINDOW_FRAMES)
      .sort((left, right) => left[1].frame - right[1].frame);
    for (const [button, press] of expired) {
      const single = this.resolveBufferedCommand([button], press, candidates);
      this.buttonPresses.delete(button);
      if (single) return single;
    }

    const recent = [...this.buttonPresses.entries()]
      .filter(([, press]) => frame - press.frame <= SIMULTANEOUS_INPUT_WINDOW_FRAMES)
      .sort((left, right) => left[1].frame - right[1].frame);

    if (recent.length > 1) {
      const latestPress = recent[recent.length - 1]?.[1];
      if (!latestPress) return undefined;
      const command = this.resolveBufferedCommand(recent.map(([button]) => button), latestPress, candidates);
      recent.forEach(([button]) => this.buttonPresses.delete(button));
      return command;
    }

    const pending = recent[0];
    if (!pending) return undefined;
    const [button, press] = pending;
    const scopedCandidates = this.forContext(candidates, press.context);
    const possibleChord = scopedCandidates.some((candidate) =>
      candidate.input.buttons.length > 1 && candidate.input.buttons.includes(button),
    );
    if (possibleChord) return undefined;

    const command = this.resolveBufferedCommand([button], press, candidates);
    this.buttonPresses.delete(button);
    return command;
  }

  clear(): void {
    this.previousButtons.clear();
    this.buttonPresses.clear();
    this.previousDirection = 'N';
    this.directionPresses.length = 0;
  }

  private resolveBufferedCommand<T extends CommandCandidate>(
    buttons: readonly AttackButton[],
    press: ButtonPress,
    candidates: readonly T[],
  ): T | undefined {
    const buttonSet = new Set(buttons);
    const matching = this.forContext(candidates, press.context).filter((candidate) => {
      if (candidate.input.buttons.length !== buttonSet.size ||
        !candidate.input.buttons.every((button) => buttonSet.has(button))) return false;
      if (candidate.input.direction !== undefined && candidate.input.direction !== press.direction) return false;
      if (!candidate.input.sequence) return candidate.precisionWindowFrames === undefined;
      const sequenceFrame = this.matchingSequenceFrame(candidate.input.sequence, press.frame);
      if (sequenceFrame === undefined) return false;
      return candidate.precisionWindowFrames === undefined ||
        press.frame - sequenceFrame <= candidate.precisionWindowFrames;
    });
    matching.sort((left, right) =>
      right.input.buttons.length - left.input.buttons.length ||
      (right.input.sequence?.length ?? 0) - (left.input.sequence?.length ?? 0) ||
      Number(right.precisionWindowFrames !== undefined) - Number(left.precisionWindowFrames !== undefined) ||
      Number(right.input.direction !== undefined) - Number(left.input.direction !== undefined),
    );
    return matching[0];
  }

  private matchingSequenceFrame(sequence: readonly Direction[], commandFrame: number): number | undefined {
    if (sequence.length === 0) return undefined;
    let matched = sequence.length - 1;
    let finalDirectionFrame: number | undefined;
    for (let index = this.directionPresses.length - 1; index >= 0; index -= 1) {
      const press = this.directionPresses[index];
      if (!press || press.frame > commandFrame) continue;
      if (press.direction === sequence[matched]) {
        if (matched === sequence.length - 1) finalDirectionFrame = press.frame;
        matched -= 1;
        if (matched < 0) {
          return finalDirectionFrame !== undefined &&
            commandFrame - finalDirectionFrame <= COMMAND_SEQUENCE_WINDOW_FRAMES
            ? finalDirectionFrame
            : undefined;
        }
      } else if (press.direction !== 'N' || sequence[matched] === 'N') {
        return undefined;
      }
    }
    return undefined;
  }

  private forContext<T extends CommandCandidate>(
    candidates: readonly T[],
    context: CommandContext,
  ): readonly T[] {
    return candidates.filter((candidate) =>
      Boolean(candidate.airborne) === context.airborne &&
      (!candidate.crouching || context.crouching),
    );
  }
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
