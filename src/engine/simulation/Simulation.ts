// src/engine/simulation/Simulation.ts
import type { FrameInput } from '../../input/types';
import { FixedStepClock } from './FixedStepClock';

/** Orquestrador da simulação determinística; regras de luta entram nas próximas etapas. */
export class Simulation {
  private readonly clock = new FixedStepClock();
  private frame = 0;

  advance(deltaMs: number, readInputs: () => readonly FrameInput[]): void {
    this.clock.advance(deltaMs, () => {
      const inputs = readInputs();
      this.step(inputs);
    });
  }

  get currentFrame(): number {
    return this.frame;
  }

  private step(_inputs: readonly FrameInput[]): void {
    // Ordem proposta em base.md §17.3 será implementada por etapas.
    this.frame += 1;
  }
}
