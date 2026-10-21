// src/engine/simulation/FixedStepClock.ts
import { FIXED_STEP_MS } from './constants';

/** Acumula tempo de renderização e emite passos lógicos fixos de 60 Hz. */
export class FixedStepClock {
  private accumulatorMs = 0;

  constructor(private readonly maxCatchUpSteps = 5) {}

  advance(deltaMs: number, step: () => void): void {
    this.accumulatorMs += Math.min(Math.max(deltaMs, 0), FIXED_STEP_MS * this.maxCatchUpSteps);
    while (this.accumulatorMs >= FIXED_STEP_MS) {
      this.accumulatorMs -= FIXED_STEP_MS;
      step();
    }
  }

  reset(): void {
    this.accumulatorMs = 0;
  }
}
