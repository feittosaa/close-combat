import { getLanguage, loadLanguage, saveLanguage, t } from '../i18n/i18n';
import { getAudioVolumes, saveAudioVolumes, type AudioVolumes } from '../audio/audioSettings';
import { gamepads, type PadPress } from '../input/GamepadHub';
import { ControlSettings, type Tab } from './ControlSettings';
import { loadGraphicsQuality, saveGraphicsQuality, type GraphicsQuality } from './graphicsSettings';
import { navigateFocus } from './gamepadFocus';

const doneKey = 'close-combat-quick-setup-v1';
/** Choices made before this screen existed count as a setup already done. */
const legacyKeys = ['close-combat-language', 'close-combat-graphics-quality-v1', 'close-combat-audio-v1'];

/** True on the first visit: nothing stored yet, neither the setup's own mark nor settings from earlier versions. */
export function needsQuickSetup(): boolean {
  try { return ![doneKey, ...legacyKeys].some(key => globalThis.localStorage?.getItem(key) !== null); }
  catch { return false; }
}
function markDone(): void { try { globalThis.localStorage?.setItem(doneKey, '1'); } catch { /* Without storage the card simply shows again. */ } }

/**
 * Card shown on the first visit, after the welcome guide (which previews the language): graphics quality, volume and the
 * entry to the keyboard and controller shortcuts. Volume is stored as it is changed; language and graphics are stored on
 * Start, which then warns that the game restarts when either one differs from what was stored.
 */
export class QuickSetup {
  static active = false;
  private readonly root = document.createElement('section');
  private graphics = loadGraphicsQuality();
  private readonly previousFocus = document.activeElement as HTMLElement | null;
  private readonly releasePad: () => void;
  private restarting = false;
  constructor(private readonly close: () => void) {
    QuickSetup.active = true; this.root.className = 'control-settings'; this.root.setAttribute('role', 'dialog'); this.root.setAttribute('aria-modal', 'true');
    document.body.append(this.root); this.render();
    window.addEventListener('keydown', this.onKey, true);
    this.releasePad = gamepads.subscribe(this.onPad);
  }

  private render(): void {
    this.root.setAttribute('aria-label', t('setup.title'));
    const panel = el('div', 'controls-panel quick-setup'), page = el('div', 'controls-page');
    const select = <T extends string>(label: string, options: readonly (readonly [T, string])[], value: T, change: (value: T) => void) => {
      const field = document.createElement('select'); field.setAttribute('aria-label', label);
      for (const [id, text] of options) { const option = document.createElement('option'); option.value = id; option.textContent = text; field.append(option); }
      field.value = value; field.onchange = () => change(field.value as T); page.append(row(label, field));
    };
    select(t('settings.graphics'), [['low', t('settings.graphicsLow')], ['high', t('settings.graphicsHigh')]] as const, this.graphics,
      (quality: GraphicsQuality) => { this.graphics = quality; });
    const volume = getAudioVolumes();
    for (const [channel, key] of [['master', 'settings.volumeMaster'], ['music', 'settings.volumeMusic'], ['effects', 'settings.volumeEffects']] as const) {
      const value = el('output', 'controls-volume-value', `${volume[channel]}%`), slider = document.createElement('input');
      slider.type = 'range'; slider.min = '0'; slider.max = '100'; slider.step = '5'; slider.value = String(volume[channel]); slider.setAttribute('aria-label', t(key));
      slider.oninput = () => { const next: AudioVolumes = { ...getAudioVolumes(), [channel]: Number(slider.value) }; saveAudioVolumes(next); value.textContent = `${slider.value}%`; };
      const control = el('span', 'controls-volume'); control.append(slider, value); page.append(row(t(key), control));
    }
    const shortcuts = el('span', 'quick-setup-shortcuts');
    shortcuts.append(button(t('settings.tabKeyboard'), () => this.shortcuts('keyboard')), button(t('settings.tabGamepad'), () => this.shortcuts('gamepad')));
    page.append(row(t('setup.shortcuts'), shortcuts, 'div'));
    const footer = el('footer'); footer.append(button(t('setup.start'), () => this.finish()));
    panel.append(el('h1', '', t('setup.title')), el('p', '', t('setup.intro')), page, footer);
    this.root.replaceChildren(panel);
    this.root.querySelector<HTMLElement>('select')?.focus();
  }

  private shortcuts(tab: Tab): void { new ControlSettings(() => undefined, tab); }

  /** Stores the language and graphics; when either changed, a notice explains the restart before it happens. */
  private finish(): void {
    const language = getLanguage(), restart = language !== loadLanguage() || this.graphics !== loadGraphicsQuality();
    saveLanguage(language); saveGraphicsQuality(this.graphics); markDone();
    if (restart) this.notice(); else this.destroy();
  }

  private notice(): void {
    this.restarting = true;
    const panel = el('div', 'controls-panel quick-setup controls-confirm'), footer = el('footer');
    panel.setAttribute('role', 'alertdialog'); panel.setAttribute('aria-label', t('setup.restartTitle'));
    footer.append(button(t('setup.restartOk'), () => this.restart()));
    panel.append(el('h1', '', t('setup.restartTitle')), el('p', '', t('setup.restartNotice')), footer);
    this.root.replaceChildren(panel); footer.querySelector('button')?.focus();
  }
  private restart(): void { this.destroy(); window.location.reload(); }

  private readonly onKey = (event: KeyboardEvent): void => {
    if (ControlSettings.active) return;
    if (event.code === 'Tab') {
      const focusable = [...this.root.querySelectorAll<HTMLElement>('button, select, input')], index = focusable.indexOf(document.activeElement as HTMLElement);
      if (event.shiftKey && index === 0) { event.preventDefault(); focusable.at(-1)?.focus(); } else if (!event.shiftKey && index === focusable.length - 1) { event.preventDefault(); focusable[0]?.focus(); }
      return;
    }
    event.stopImmediatePropagation();
    if (event.code === 'Escape') { event.preventDefault(); this.restarting ? this.restart() : this.finish(); }
  };
  private readonly onPad = (press: PadPress): void => {
    if (press.action === 'back') this.restarting ? this.restart() : this.finish(); else if (press.action) navigateFocus(this.root, press.action);
  };
  private destroy(): void {
    window.removeEventListener('keydown', this.onKey, true); this.releasePad(); this.root.remove(); QuickSetup.active = false;
    this.previousFocus?.focus(); this.close();
  }
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag); if (className) node.className = className; if (text) node.textContent = text; return node;
}
function button(text: string, action: () => void): HTMLButtonElement {
  const node = el('button', '', text); node.type = 'button'; node.onclick = action; return node;
}
/** A `<label>` passes its hover to its first control, so a row with several buttons is a plain `<div>`. */
function row(label: string, control: HTMLElement, tag: 'label' | 'div' = 'label'): HTMLElement {
  const line = el(tag, 'control-system-row'); line.append(el('span', '', label), control); return line;
}
