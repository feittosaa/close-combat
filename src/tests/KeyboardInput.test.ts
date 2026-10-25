// src/tests/KeyboardInput.test.ts
import { describe, expect, it } from 'vitest';
import { KeyboardInput } from '../input/KeyboardInput';
import { PLAYER_ONE_KEYS, PLAYER_TWO_KEYS } from '../input/keyboardLayouts';

function dispatchKey(target: EventTarget, type: 'keydown' | 'keyup', code: string): void {
  const event = new Event(type);
  Object.defineProperty(event, 'code', { value: code });
  target.dispatchEvent(event);
}

describe('KeyboardInput', () => {
  it('converts horizontal keys to opponent-relative directions', () => {
    const target = new EventTarget() as Window;
    const input = new KeyboardInput(PLAYER_ONE_KEYS, target);

    dispatchKey(target, 'keydown', 'KeyD');
    expect(input.read('right').direction).toBe('F');
    expect(input.read('left').direction).toBe('B');

    input.destroy();
  });

  it('keeps player two controls separate and maps all four attack buttons', () => {
    const target = new EventTarget() as Window;
    const playerOne = new KeyboardInput(PLAYER_ONE_KEYS, target);
    const playerTwo = new KeyboardInput(PLAYER_TWO_KEYS, target);

    dispatchKey(target, 'keydown', 'Numpad1');
    dispatchKey(target, 'keydown', 'Numpad4');
    expect([...playerTwo.read('left').buttons]).toEqual(['1', '4']);
    expect(playerOne.read().buttons.size).toBe(0);

    dispatchKey(target, 'keyup', 'Numpad1');
    dispatchKey(target, 'keyup', 'Numpad4');
    dispatchKey(target, 'keydown', 'ArrowLeft');
    expect(playerTwo.read('left').direction).toBe('F');

    playerOne.destroy();
    playerTwo.destroy();
  });

  it('clears held keys when the browser window loses focus', () => {
    const target = new EventTarget() as Window;
    const input = new KeyboardInput(PLAYER_ONE_KEYS, target);

    dispatchKey(target, 'keydown', 'KeyA');
    target.dispatchEvent(new Event('blur'));
    expect(input.read().direction).toBe('N');

    input.destroy();
  });
});

it('requires a fresh release after reset even if the browser repeats a held attack key', () => {
  const target = new EventTarget() as Window;
  const input = new KeyboardInput(PLAYER_ONE_KEYS, target);
  dispatchKey(target, 'keydown', 'KeyJ');
  expect(input.read().buttons.has('1')).toBe(true);
  input.clear();
  dispatchKey(target, 'keydown', 'KeyJ');
  expect(input.read().buttons.size).toBe(0);
  dispatchKey(target, 'keyup', 'KeyJ');
  dispatchKey(target, 'keydown', 'KeyJ');
  expect(input.read().buttons.has('1')).toBe(true);
  input.destroy();
});
