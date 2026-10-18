import { describe, expect, it } from 'vitest';
import {
  COMMAND_BUFFER_FRAMES,
  COMMAND_SEQUENCE_WINDOW_FRAMES,
  CommandBuffer,
  CommandParser,
  resolveCommand,
  SIMULTANEOUS_INPUT_WINDOW_FRAMES,
} from '../input/CommandBuffer';
import type { FrameInput } from '../input/types';

describe('command buffer and priority', () => {
  const context = { airborne: false, crouching: false };

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

  it('defines the twelve-frame command sequence window', () => {
    expect(COMMAND_SEQUENCE_WINDOW_FRAMES).toBe(12);
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

  it('recognizes a chord when its buttons are pressed at the inclusive window limit', () => {
    const parser = new CommandParser();
    const candidates = [
      { id: 'single-1', input: { buttons: ['1'] as const } },
      { id: 'chord-1-2', input: { buttons: ['1', '2'] as const } },
    ];

    expect(parser.update({ direction: 'N', buttons: new Set(['1']) }, 0, candidates, context)).toBeUndefined();
    parser.update({ direction: 'N', buttons: new Set() }, 1, candidates, context);
    parser.update({ direction: 'N', buttons: new Set() }, 2, candidates, context);
    expect(parser.update({ direction: 'N', buttons: new Set(['2']) }, 3, candidates, context)?.id).toBe('chord-1-2');
  });

  it('waits for the chord window before falling back to a single button', () => {
    const parser = new CommandParser();
    const candidates = [
      { id: 'single-1', input: { buttons: ['1'] as const } },
      { id: 'chord-1-2', input: { buttons: ['1', '2'] as const } },
    ];

    parser.update({ direction: 'N', buttons: new Set(['1']) }, 0, candidates, context);
    for (let frame = 1; frame <= SIMULTANEOUS_INPUT_WINDOW_FRAMES; frame += 1) {
      expect(parser.update({ direction: 'N', buttons: new Set() }, frame, candidates, context)).toBeUndefined();
    }
    expect(parser.update({ direction: 'N', buttons: new Set() }, 4, candidates, context)?.id).toBe('single-1');
  });

  it('consumes an unregistered chord instead of splitting it into singles', () => {
    const parser = new CommandParser();
    const candidates = [
      { id: 'single-1', input: { buttons: ['1'] as const } },
      { id: 'single-3', input: { buttons: ['3'] as const } },
      { id: 'chord-1-2', input: { buttons: ['1', '2'] as const } },
    ];

    expect(parser.update({ direction: 'N', buttons: new Set(['1', '3']) }, 0, candidates, context)).toBeUndefined();
    for (let frame = 1; frame <= 4; frame += 1) {
      expect(parser.update({ direction: 'N', buttons: new Set() }, frame, candidates, context)).toBeUndefined();
    }
  });

  it('uses the direction captured when a delayed single was pressed', () => {
    const parser = new CommandParser();
    const candidates = [
      { id: 'generic', input: { buttons: ['1'] as const } },
      { id: 'forward', input: { direction: 'F' as const, buttons: ['1'] as const } },
      { id: 'chord', input: { buttons: ['1', '2'] as const } },
    ];

    parser.update({ direction: 'F', buttons: new Set(['1']) }, 0, candidates, context);
    for (let frame = 1; frame <= 3; frame += 1) parser.update({ direction: 'N', buttons: new Set() }, frame, candidates, context);
    expect(parser.update({ direction: 'N', buttons: new Set() }, 4, candidates, context)?.id).toBe('forward');
  });

  it('prefers a completed directional sequence to the simple button move', () => {
    const parser = new CommandParser();
    const candidates = [
      { id: 'simple', input: { buttons: ['2'] as const } },
      { id: 'double-forward', input: { sequence: ['F', 'F'] as const, buttons: ['2'] as const } },
    ];

    parser.update({ direction: 'F', buttons: new Set() }, 0, candidates, context);
    parser.update({ direction: 'N', buttons: new Set() }, 1, candidates, context);
    parser.update({ direction: 'F', buttons: new Set() }, 2, candidates, context);
    expect(parser.update({ direction: 'F', buttons: new Set(['2']) }, 3, candidates, context)?.id).toBe('double-forward');
  });

  it('recognizes a down to down-forward sequence within the buffer window', () => {
    const parser = new CommandParser();
    const candidates = [
      { id: 'simple', input: { buttons: ['3'] as const } },
      { id: 'down-forward', input: { sequence: ['D', 'DF'] as const, buttons: ['3'] as const } },
    ];

    parser.update({ direction: 'D', buttons: new Set() }, 0, candidates, context);
    expect(parser.update({ direction: 'DF', buttons: new Set(['3']) }, 1, candidates, context)?.id).toBe('down-forward');
  });

  it('does not let the same-frame resolver bypass sequence history', () => {
    const sequence = { id: 'sequence', input: { sequence: ['F', 'F'] as const, buttons: ['2'] as const } };
    expect(resolveCommand({ direction: 'F', buttons: new Set(['2']) }, [sequence])).toBeUndefined();
  });

  it('falls back to the simple move when the directional sequence is too old', () => {
    const parser = new CommandParser();
    const candidates = [
      { id: 'simple', input: { buttons: ['2'] as const } },
      { id: 'double-forward', input: { sequence: ['F', 'F'] as const, buttons: ['2'] as const } },
    ];
    parser.update({ direction: 'F', buttons: new Set() }, 0, candidates, context);
    parser.update({ direction: 'N', buttons: new Set() }, 1, candidates, context);
    parser.update({ direction: 'F', buttons: new Set() }, 2, candidates, context);
    parser.update({ direction: 'N', buttons: new Set() }, 15, candidates, context);
    expect(parser.update({ direction: 'N', buttons: new Set(['2']) }, 16, candidates, context)?.id).toBe('simple');
  });
});
