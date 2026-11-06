import { afterEach, describe, expect, it, vi } from 'vitest';

const fakeStorage = (initial: Record<string, string> = {}) => {
  const storage = new Map(Object.entries(initial));
  return { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => { storage.set(key, value); }, storage };
};
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

describe('volumes', () => {
  it('começa com volume geral e efeitos cheios e a música em 80%', async () => {
    vi.stubGlobal('localStorage', fakeStorage());
    const { getAudioVolumes, effectGain } = await import('../audio/audioSettings');
    expect(getAudioVolumes()).toEqual({ master: 100, music: 80, effects: 100 });
    expect(effectGain(.2)).toBeCloseTo(.2, 9);
  });

  it('salva os três volumes e aplica geral e efeitos sobre a mixagem de cada som', async () => {
    const storage = fakeStorage();
    vi.stubGlobal('localStorage', storage);
    const { saveAudioVolumes, effectGain } = await import('../audio/audioSettings');
    expect(saveAudioVolumes({ master: 50, music: 30, effects: 40 })).toBe(true);
    expect(effectGain(1.15)).toBeCloseTo(1.15 * .5 * .4, 9);
    vi.resetModules();
    const reloaded = await import('../audio/audioSettings');
    expect(reloaded.getAudioVolumes()).toEqual({ master: 50, music: 30, effects: 40 });
  });

  it('limita valores salvos fora da faixa e ignora dados corrompidos', async () => {
    vi.stubGlobal('localStorage', fakeStorage({ 'close-combat-audio-v1': '{"master":150,"music":-4,"effects":"x"}' }));
    expect((await import('../audio/audioSettings')).getAudioVolumes()).toEqual({ master: 100, music: 0, effects: 100 });
    vi.resetModules();
    vi.stubGlobal('localStorage', fakeStorage({ 'close-combat-audio-v1': 'não é json' }));
    expect((await import('../audio/audioSettings')).getAudioVolumes()).toEqual({ master: 100, music: 80, effects: 100 });
  });
});
