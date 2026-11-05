// src/input/keyboardLayouts.ts
import type { KeyboardLayout } from './KeyboardInput';

/** Mapeamento inicial para teclado compartilhado, documentado em base.md §3.5. */
export const PLAYER_ONE_KEYS: KeyboardLayout = {
  directions: { left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS' },
  buttons: { '1': 'KeyJ', '2': 'KeyK', '3': 'KeyN', '4': 'KeyM' },
  ultimate: 'KeyU',
  taunt: 'KeyT',
  rageAction: 'KeyE',
};

export const PLAYER_TWO_KEYS: KeyboardLayout = {
  directions: {
    left: 'ArrowLeft',
    right: 'ArrowRight',
    up: 'ArrowUp',
    down: 'ArrowDown',
  },
  ultimate: 'Numpad5',
  taunt: 'Numpad6',
  rageAction: 'Numpad7',
  buttons: {
    '1': 'Numpad1',
    '2': 'Numpad2',
    '3': 'Numpad3',
    '4': 'Numpad4',
  },
};
