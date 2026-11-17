import { beforeEach, describe, expect, it } from 'vitest';
import { needsQuickSetup } from '../ui/QuickSetup';

describe('configuração rápida da primeira visita', () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
      getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value); },
    } });
  });
  it('aparece quando nada foi salvo', () => expect(needsQuickSetup()).toBe(true));
  it.each(['close-combat-quick-setup-v1', 'close-combat-language', 'close-combat-graphics-quality-v1', 'close-combat-audio-v1'])('não aparece com %s salvo', key => {
    store.set(key, '1');
    expect(needsQuickSetup()).toBe(false);
  });
  it('não aparece quando o armazenamento está indisponível', () => {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => { throw new Error('bloqueado'); } } });
    expect(needsQuickSetup()).toBe(false);
  });
});
