import { getLanguage, LANGUAGES, previewLanguage, t, type Language, type MessageKey } from '../i18n/i18n';
import { getSystemControls, getPlayerLayout, keyLabel } from '../input/controlSettings';
import { gamepads, type PadPress } from '../input/GamepadHub';
import { navigateFocus } from './gamepadFocus';

const MODES = ['arcade', 'versus', 'training', 'tutorial'] as const;
const PAGES = 2;

/**
 * First-visit card: the language (previewed here, stored by the quick setup), what the game offers and the player one
 * controls, in two pages; the quick setup follows it.
 */
export class WelcomeGuide {
  static active = false;
  private readonly root = document.createElement('section');
  private readonly releasePad: () => void;
  private page = 0;
  constructor(private readonly done: () => void) {
    WelcomeGuide.active = true; this.root.className = 'control-settings'; this.root.setAttribute('role', 'dialog'); this.root.setAttribute('aria-modal', 'true');
    document.body.append(this.root); this.render();
    window.addEventListener('keydown', this.onKey, true);
    this.releasePad = gamepads.subscribe(this.onPad);
  }

  private render(): void {
    this.root.setAttribute('aria-label', t('welcome.title'));
    const panel = el('div', 'controls-panel welcome-guide'), page = el('div', 'controls-page');
    if (this.page === 0) {
      const field = document.createElement('select'); field.setAttribute('aria-label', t('settings.language'));
      for (const language of LANGUAGES) { const option = document.createElement('option'); option.value = language.id; option.textContent = language.name; field.append(option); }
      field.value = getLanguage(); field.onchange = () => { previewLanguage(field.value as Language); this.render(); this.root.querySelector<HTMLElement>('select')?.focus(); };
      const language = el('label', 'control-system-row'); language.append(el('span', '', t('settings.language')), field);
      page.append(language, el('p', '', t('welcome.intro')), el('h2', '', t('welcome.modes')));
      for (const mode of MODES) {
        const line = el('p', 'welcome-mode'); line.append(el('strong', '', t(`mode.${mode}.title`)), ` — ${t(`mode.${mode}.hint`)}`); page.append(line);
      }
    } else {
      const layout = getPlayerLayout(0), keys: [MessageKey, string][] = [
        ['settings.left', layout.directions.left], ['settings.right', layout.directions.right], ['settings.up', layout.directions.up], ['settings.down', layout.directions.down],
        ['settings.button1', layout.buttons['1']], ['settings.button2', layout.buttons['2']], ['settings.button3', layout.buttons['3']], ['settings.button4', layout.buttons['4']],
        ['settings.ultimate', layout.ultimate], ['settings.taunt', layout.taunt], ['settings.rageAction', layout.rageAction], ['settings.pause', getSystemControls().pause],
      ];
      const grid = el('div', 'controls-grid');
      for (const [label, code] of keys) { const line = el('div', 'control-system-row'); line.append(el('span', '', t(label)), el('span', 'controls-fixed', keyLabel(code))); grid.append(line); }
      page.append(el('h2', '', t('welcome.controls')), grid, el('p', '', t('welcome.tip')));
    }
    const footer = el('footer');
    if (this.page > 0) footer.append(button(t('welcome.back'), () => this.go(-1)));
    footer.append(button(this.page === PAGES - 1 ? t('welcome.continue') : t('welcome.next'), () => this.page === PAGES - 1 ? this.finish() : this.go(1)));
    panel.append(el('h1', '', t('welcome.title')), page, footer);
    this.root.replaceChildren(panel);
    if (this.page > 0) this.root.querySelector<HTMLElement>('footer button:last-child')?.focus();
  }

  private go(step: number): void { this.page += step; this.render(); }
  private finish(): void {
    window.removeEventListener('keydown', this.onKey, true); this.releasePad(); this.root.remove(); WelcomeGuide.active = false;
    this.done();
  }

  private readonly onKey = (event: KeyboardEvent): void => {
    if (event.code === 'Tab') {
      const focusable = [...this.root.querySelectorAll<HTMLElement>('button')], index = focusable.indexOf(document.activeElement as HTMLElement);
      if (event.shiftKey && index === 0) { event.preventDefault(); focusable.at(-1)?.focus(); } else if (!event.shiftKey && index === focusable.length - 1) { event.preventDefault(); focusable[0]?.focus(); }
      return;
    }
    event.stopImmediatePropagation();
    if (event.code === 'Escape') { event.preventDefault(); this.finish(); }
  };
  private readonly onPad = (press: PadPress): void => {
    if (press.action === 'back') this.finish(); else if (press.action) navigateFocus(this.root, press.action);
  };
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag); if (className) node.className = className; if (text) node.textContent = text; return node;
}
function button(text: string, action: () => void): HTMLButtonElement {
  const node = el('button', '', text); node.type = 'button'; node.onclick = action; return node;
}
