import { describe, expect, it } from 'vitest';
import {
  COMMAND_BUFFER_FRAMES,
  CommandBuffer,
  resolveCommand,
  SIMULTANEOUS_INPUT_WINDOW_FRAMES,
} from '../input/CommandBuffer';
import type { FrameInput } from '../input/types';

describe('command buffer and priority', () => {
  it('keeps the configured number of recent frames', () => {
    const buffer = new CommandBuffer();
    const input: FrameInput = { direction: 'N', buttons: new Set() };
    for (let frame = 0; frame < COMMAND_BUFFER_FRAMES + 4; frame += 1) buffer.push(input);

    expect(buffer.snapshot()).toHaveLength(COMMAND_BUFFER_FRAMES);
    expect(COMMAND_BUFFER_FRAMES).toBe(30);
  });

  it('defines a three-frame simultaneous input window', () => {
    expect(SIMULTANEOUS_INPUT_WINDOW_FRAMES).toBe(3);
  });

  it('prefers an exact multi-button command over a single-button command', () => {
    const single = { id: 'single', input: { buttons: ['1'] as const } };
    const chord = { id: 'chord', input: { buttons: ['1', '2'] as const } };
    const input: FrameInput = { direction: 'N', buttons: new Set(['1', '2']) };

    expect(resolveCommand(input, [single, chord])?.id).toBe('chord');
  });

  it('prefers an exact directional variant over a generic command', () => {
    const generic = { id: 'generic', input: { buttons: ['1'] as const } };
    const directional = { id: 'forward', input: { direction: 'F' as const, buttons: ['1'] as const } };
    const input: FrameInput = { direction: 'F', buttons: new Set(['1']) };

    expect(resolveCommand(input, [generic, directional])?.id).toBe('forward');
  });

  it('does not match commands that require a different direction or button set', () => {
    const directional = { id: 'forward', input: { direction: 'F' as const, buttons: ['1'] as const } };
    const input: FrameInput = { direction: 'B', buttons: new Set(['1', '2']) };

    expect(resolveCommand(input, [directional])).toBeUndefined();
  });
});
