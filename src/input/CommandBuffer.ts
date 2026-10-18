// src/input/CommandBuffer.ts
import type { FrameInput } from './types';

/** Buffer por frame para parser de comandos; reconhecimento ainda será implementado. */
export class CommandBuffer {
  private readonly frames: FrameInput[] = [];

  constructor(private readonly capacityFrames = 30) {}

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
