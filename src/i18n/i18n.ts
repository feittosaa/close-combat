import { pt, type Messages, type MessageKey } from './locales/pt';
import { en } from './locales/en';
import { es } from './locales/es';
import { it } from './locales/it';
import { de } from './locales/de';
import { ja } from './locales/ja';
import { ko } from './locales/ko';
import { zh } from './locales/zh';

export type { MessageKey } from './locales/pt';
export interface Locale { messages: Messages; names: Readonly<Record<string, string>> }
/** Each language names itself, so the selector stays readable whatever language is active. */
export const LANGUAGES = [
  { id: 'pt', name: 'Português', tag: 'pt-BR', locale: pt },
  { id: 'en', name: 'English', tag: 'en', locale: en },
  { id: 'es', name: 'Español', tag: 'es', locale: es },
  { id: 'it', name: 'Italiano', tag: 'it', locale: it },
  { id: 'de', name: 'Deutsch', tag: 'de', locale: de },
  { id: 'ja', name: '日本語', tag: 'ja', locale: ja },
  { id: 'ko', name: '한국어', tag: 'ko', locale: ko },
  { id: 'zh', name: '中文（简体）', tag: 'zh-Hans', locale: zh },
] as const satisfies readonly { id: string; name: string; tag: string; locale: Locale }[];
export type Language = typeof LANGUAGES[number]['id'];

const STORAGE_KEY = 'close-combat-language';
const isLanguage = (value: unknown): value is Language => LANGUAGES.some(language => language.id === value);
let current: Language = loadLanguage();

export function loadLanguage(): Language {
  try { const saved = localStorage.getItem(STORAGE_KEY); if (isLanguage(saved)) return saved; } catch { /* Storage may be unavailable. */ }
  return 'pt';
}
/** Persists the choice; screens already drawn keep their text until they are rebuilt. */
export function saveLanguage(language: Language): boolean {
  current = language;
  applyDocumentLanguage();
  try { localStorage.setItem(STORAGE_KEY, language); return true; } catch { return false; }
}
export function getLanguage(): Language { return current; }
export function applyDocumentLanguage(): void {
  if (typeof document !== 'undefined') document.documentElement.lang = LANGUAGES.find(language => language.id === current)!.tag;
}

const localeOf = (language: Language) => LANGUAGES.find(entry => entry.id === language)!.locale;
/** Translated interface text; `{name}` placeholders are filled from `values`. */
export function t(key: MessageKey, values: Readonly<Record<string, string | number>> = {}): string {
  return localeOf(current).messages[key].replace(/\{(\w+)\}/g, (match, name: string) => name in values ? String(values[name]) : match);
}
/**
 * Name of authored content (move, combo, stage), keyed as `move.<fighter>.<id>`, `combo.<fighter>.<id>`,
 * `chain.<fighter>.<index>` or `stage.<id>`. Portuguese is the authored source, kept in the data itself.
 */
export function nameOf(key: string, authored: string): string {
  return localeOf(current).names[key] ?? authored;
}
