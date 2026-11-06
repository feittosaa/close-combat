import { afterEach, describe, expect, it, vi } from 'vitest';
import { getLanguage, LANGUAGES, loadLanguage, nameOf, saveLanguage, t } from '../i18n/i18n';
import { playableCharacters } from '../engine/data/characters';
import { selectableStages } from '../rendering/stages/stageCatalog';
import { fighterMoveList } from '../training/MoveList';
import { formatCommand } from '../ui/commandNotation';

const reference = LANGUAGES.find(language => language.id === 'pt')!.locale.messages;
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
const contentKeys = [
  ...playableCharacters.flatMap(fighter => [
    ...fighter.moves.map(move => `move.${fighter.id}.${move.id}`),
    ...(fighter.combos ?? []).map(combo => `combo.${fighter.id}.${combo.id}`),
    ...(fighter.comboChains ?? []).map((_, index) => `chain.${fighter.id}.${index}`),
  ]),
  ...selectableStages.map(stage => `stage.${stage.id}`),
];
const uiSources = import.meta.glob<string>(['../ui/*.ts', '../scenes/*.ts', '../training/*.ts', '../main.ts'], { eager: true, query: '?raw', import: 'default' });

afterEach(() => { saveLanguage('pt'); vi.unstubAllGlobals(); });

describe('idiomas', () => {
  it('oferece português, inglês, espanhol, italiano, alemão, japonês, coreano e mandarim', () => {
    expect(LANGUAGES.map(language => language.id)).toEqual(['pt', 'en', 'es', 'it', 'de', 'ja', 'ko', 'zh']);
  });

  it.each(LANGUAGES.map(language => [language.name, language.locale] as const))('%s traduz todo texto da interface com os mesmos marcadores', (_name, locale) => {
    expect(Object.keys(locale.messages).sort()).toEqual(Object.keys(reference).sort());
    for (const [key, text] of Object.entries(locale.messages)) {
      expect(text.trim(), key).not.toBe('');
      expect(placeholders(text), key).toEqual(placeholders(reference[key as keyof typeof reference]));
    }
  });

  it.each(LANGUAGES.filter(language => language.id !== 'pt').map(language => [language.name, language.locale] as const))(
    '%s nomeia todos os golpes, combos e cenários, sem nomes sobrando', (_name, locale) => {
      expect(Object.keys(locale.names).sort()).toEqual([...contentKeys].sort());
      for (const fighter of playableCharacters) for (const move of fighter.moves) {
        const suffix = move.name.includes(' · ') ? move.name.slice(move.name.indexOf(' · ')) : '';
        if (/^ · [\d+,]+$/.test(suffix)) expect(locale.names[`move.${fighter.id}.${move.id}`]).toMatch(new RegExp(`${suffix.replace(/[+]/g, '\\+')}$`));
      }
    });

  it('não deixa texto fixo em português nas telas: tudo passa pelos dicionários', () => {
    const literals = Object.entries(uiSources).flatMap(([file, source]) => source.split('\n')
      .filter(line => !/^\s*(\/\/|\*|\/\*)/.test(line) && /(['`"])[^'`"]*[À-ÿ][^'`"]*\1/.test(line)).map(line => `${file}: ${line.trim()}`));
    expect(literals).toEqual([]);
  });

  it('troca de idioma, guarda a escolha e preenche os marcadores', () => {
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) });
    expect(t('hud.round', { round: 2 })).toBe('ROUND 2');
    expect(saveLanguage('ja')).toBe(true);
    expect(getLanguage()).toBe('ja');
    expect(loadLanguage()).toBe('ja');
    expect(t('hud.round', { round: 2 })).toBe('ラウンド2');
    expect(nameOf('stage.fazenda', 'Fazenda')).toBe('農場');
    expect(fighterMoveList(playableCharacters[0]).find(entry => entry.id === 'tomato-light')?.title).toBe('弱トマト');
    expect(formatCommand('no ar + 3')).toContain('空中で');
    saveLanguage('pt');
    expect(nameOf('stage.fazenda', 'Fazenda')).toBe('Fazenda');
  });

  it('ignora um idioma salvo desconhecido e volta ao português', () => {
    vi.stubGlobal('localStorage', { getItem: () => 'xx', setItem: () => undefined });
    expect(loadLanguage()).toBe('pt');
  });
});
