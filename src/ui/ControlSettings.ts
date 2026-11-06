import { getPlayerLayout, getSystemControls, keyLabel, resetControls, saveControls, saveSystemControls, type ControlLayouts, type SystemControlLayout, BUTTON_COLORS, getTrainingControls, defaultTrainingControls, saveTrainingControls, validateControlSet, type TrainingControls } from '../input/controlSettings';
import type { AttackButton } from '../input/types';
import { loadGraphicsQuality, saveGraphicsQuality, type GraphicsQuality } from './graphicsSettings';
import { getLanguage, LANGUAGES, saveLanguage, t, type Language, type MessageKey } from '../i18n/i18n';
import { DEFAULT_VOLUMES, getAudioVolumes, saveAudioVolumes, type AudioVolumes } from '../audio/audioSettings';

const movement = [['directions','left','settings.left'],['directions','right','settings.right'],['directions','up','settings.up'],['directions','down','settings.down']] as const;
const attacks = [['buttons','1','settings.button1'],['buttons','2','settings.button2'],['buttons','3','settings.button3'],['buttons','4','settings.button4']] as const;
const specials = [['ultimate','settings.ultimate'],['taunt','settings.taunt'],['rageAction','settings.rageAction']] as const;
const fightCommands = [['pause','settings.pause'],['reset','settings.resetTraining']] as const;
const trainingCommands = [['step','settings.step'],['speed','settings.speed'],['reset','settings.resetShortcut'],['autoLife','settings.autoLife'],['distance','settings.distance'],['opponent','settings.opponent'],['geometry','settings.geometry'],['inputs','settings.inputs']] as const;
const TABS = [['general','settings.tabGeneral'],['volume','settings.tabVolume'],['keyboard','settings.tabKeyboard']] as const;
const KEY_TABS = [['p1','settings.player'],['p2','settings.player'],['commands','settings.tabCommands']] as const;
type Tab = typeof TABS[number][0];
type KeyTab = typeof KEY_TABS[number][0];
type Capture = { player?: number; group?: 'directions'|'buttons'|'ultimate'|'taunt'|'rageAction'; action: string; system?: true; training?: true; button: HTMLButtonElement };

/** Settings card with tabs, so every page fits without scrolling: general, volume and keyboard (per player, plus fight and training shortcuts). */
export class ControlSettings {
  static active = false;
  private readonly root = document.createElement('section');
  private draft: ControlLayouts = [getPlayerLayout(0),getPlayerLayout(1)];
  private systemDraft: SystemControlLayout = getSystemControls();
  private trainingDraft: TrainingControls = getTrainingControls();
  private graphicsDraft: GraphicsQuality = loadGraphicsQuality();
  private languageDraft: Language = getLanguage();
  private volumeDraft: AudioVolumes = getAudioVolumes();
  private tab: Tab = 'general';
  private keyTab: KeyTab = 'p1';
  private capture?: Capture;
  private readonly status = document.createElement('p');
  private readonly previousFocus = document.activeElement as HTMLElement | null;
  constructor(private readonly close: () => void) {
    ControlSettings.active = true; this.root.className = 'control-settings'; this.root.setAttribute('role','dialog'); this.root.setAttribute('aria-modal','true'); this.root.setAttribute('aria-label',t('settings.label'));
    document.body.append(this.root); this.render(); window.addEventListener('keydown',this.onKey,true);
  }

  private render(): void {
    this.root.replaceChildren();
    const panel = el('div', 'controls-panel');
    const header = el('header', 'controls-header'); header.append(el('h1', '', t('settings.title')), this.tabs(TABS, this.tab, 'controls-tabs', tab => { this.tab = tab; }));
    const page = el('div', 'controls-page');
    if (this.tab === 'general') this.general(page);
    else if (this.tab === 'volume') this.volume(page);
    else this.keyboard(page);
    this.status.setAttribute('role','status'); this.status.className = 'controls-status';
    const footer = el('footer');
    footer.append(button(t('settings.restore'), () => this.restore()), button(t('settings.save'), () => this.save()));
    panel.append(header, page, this.status, footer); this.root.append(panel);
    this.root.querySelector<HTMLElement>(this.tab === 'keyboard' ? '.controls-subtabs [aria-selected="true"]' : '.controls-tabs [aria-selected="true"]')?.focus();
  }

  private tabs<T extends string>(entries: readonly (readonly [T, MessageKey])[], selected: T, className: string, choose: (tab: T) => void): HTMLElement {
    const list = el('div', className); list.setAttribute('role', 'tablist');
    entries.forEach(([id, key], index) => {
      const tab = button(t(key, { player: index + 1 }), () => { choose(id); this.capture = undefined; this.render(); });
      tab.setAttribute('role', 'tab'); tab.setAttribute('aria-selected', String(id === selected));
      list.append(tab);
    });
    return list;
  }

  private general(page: HTMLElement): void {
    const select = <T extends string>(label: string, options: readonly (readonly [T, string])[], value: T, change: (value: T) => void) => {
      const field = document.createElement('select'); field.setAttribute('aria-label', label);
      for (const [id, text] of options) { const option = document.createElement('option'); option.value = id; option.textContent = text; field.append(option); }
      field.value = value; field.onchange = () => change(field.value as T);
      page.append(row(label, field));
    };
    select(t('settings.language'), LANGUAGES.map(language => [language.id, language.name] as const), this.languageDraft, value => { this.languageDraft = value; });
    select(t('settings.graphics'), [['low', t('settings.graphicsLow')], ['high', t('settings.graphicsHigh')]] as const, this.graphicsDraft, value => { this.graphicsDraft = value; });
    page.append(el('p', '', t('settings.restartHint')));
  }

  private volume(page: HTMLElement): void {
    for (const [channel, key] of [['master','settings.volumeMaster'],['music','settings.volumeMusic'],['effects','settings.volumeEffects']] as const) {
      const value = el('output', 'controls-volume-value', `${this.volumeDraft[channel]}%`);
      const slider = document.createElement('input'); slider.type = 'range'; slider.min = '0'; slider.max = '100'; slider.step = '5';
      slider.value = String(this.volumeDraft[channel]); slider.setAttribute('aria-label', t(key));
      slider.oninput = () => { this.volumeDraft = { ...this.volumeDraft, [channel]: Number(slider.value) }; value.textContent = `${slider.value}%`; };
      const control = el('span', 'controls-volume'); control.append(slider, value);
      page.append(row(t(key), control));
    }
  }

  private keyboard(page: HTMLElement): void {
    page.append(this.tabs(KEY_TABS, this.keyTab, 'controls-subtabs', tab => { this.keyTab = tab; }), el('p', '', t('settings.keysHint')));
    const columns = el('div', 'controls-grid');
    const column = (heading: MessageKey, rows: HTMLElement[], className = '') => {
      const group = el('div', className); group.append(el('h2', '', t(heading)), ...rows); columns.append(group);
    };
    if (this.keyTab === 'commands') {
      columns.classList.add('controls-commands');
      column('settings.fightCommands', fightCommands.map(([action, key]) => this.keyRow(t(key), this.systemDraft[action], () => ({ action, system: true }), t('settings.cancelCaptureTraining'))));
      column('settings.trainingCommands', trainingCommands.map(([action, key]) => this.keyRow(t(key), this.trainingDraft[action], () => ({ action, training: true }), t('settings.cancelCapture'))), 'controls-split');
    } else {
      const player = this.keyTab === 'p1' ? 0 : 1, layout = this.draft[player];
      const keys = (entries: typeof movement | typeof attacks) => entries.map(([group, action, key]) => {
        const keyButton = this.keyRow(t(key), layout[group][action as keyof typeof layout[typeof group]], () => ({ player, group, action }), t('settings.cancelCaptureTraining'));
        if (group === 'buttons') keyButton.querySelector('button')!.style.color = BUTTON_COLORS[action as AttackButton];
        return keyButton;
      });
      column('settings.movement', keys(movement));
      column('settings.attacks', [...keys(attacks), ...specials.map(([group, key]) => this.keyRow(t(key), layout[group], () => ({ player, group, action: group }), t('settings.cancelCapture')))]);
    }
    page.append(columns);
  }

  private keyRow(label: string, code: string, target: () => Omit<Capture, 'button'>, hint: string): HTMLElement {
    const keyButton = button(keyLabel(code), () => {
      if (this.capture) this.capture.button.textContent = keyLabel(code);
      this.capture = { ...target(), button: keyButton }; keyButton.textContent = t('settings.press'); this.status.textContent = hint;
    });
    keyButton.setAttribute('aria-label', `${label}: ${keyLabel(code)}`);
    return row(label, keyButton);
  }

  private restore(): void {
    resetControls(); this.draft = [getPlayerLayout(0),getPlayerLayout(1)]; this.systemDraft = getSystemControls(); this.trainingDraft = defaultTrainingControls();
    this.volumeDraft = { ...DEFAULT_VOLUMES }; this.capture = undefined; this.status.textContent = t('settings.restored'); this.render();
  }

  private save(): void {
    if (!validateControlSet(this.draft,this.systemDraft,this.trainingDraft)) { this.status.textContent = t('settings.invalidKeys'); return; }
    const graphicsChanged = this.graphicsDraft !== loadGraphicsQuality(), languageChanged = this.languageDraft !== getLanguage();
    if (graphicsChanged && !saveGraphicsQuality(this.graphicsDraft)) { this.status.textContent = t('settings.saveGraphicsFailed'); return; }
    if (languageChanged && !saveLanguage(this.languageDraft)) { this.status.textContent = t('settings.saveLanguageFailed'); return; }
    if (!saveAudioVolumes(this.volumeDraft) || !saveControls(this.draft) || !saveSystemControls(this.systemDraft) || !saveTrainingControls(this.trainingDraft)) { this.status.textContent = t('settings.saveFailed'); return; }
    if (graphicsChanged || languageChanged) window.location.reload(); else this.destroy();
  }

  private readonly onKey=(event:KeyboardEvent):void=> {
    if (event.code==='Tab' && !this.capture) {
      const focusable=[...this.root.querySelectorAll<HTMLElement>('button, select, input')]; const index=focusable.indexOf(document.activeElement as HTMLElement);
      if(event.shiftKey && index===0){event.preventDefault();focusable[focusable.length-1]?.focus();}else if(!event.shiftKey && index===focusable.length-1){event.preventDefault();focusable[0]?.focus();} return;
    }
    if(!this.capture && (event.target instanceof HTMLSelectElement || event.target instanceof HTMLInputElement) && event.code !== 'Escape') return;
    event.stopImmediatePropagation();
    if(event.code==='Escape'){event.preventDefault(); if(this.capture){this.capture=undefined;this.render();}else this.destroy();return;}
    if(!this.capture || event.repeat)return;
    event.preventDefault(); const {player,group,action}=this.capture;
    if(this.capture.system || this.capture.training){
      const system=this.capture.system ? {...this.systemDraft,[action]:event.code} : this.systemDraft;
      const training=this.capture.training ? {...this.trainingDraft,[action]:event.code} : this.trainingDraft;
      if(!validateControlSet(this.draft,system,training)){this.status.textContent=t('settings.keyRejected');return;}
      this.systemDraft=system;this.trainingDraft=training;this.capture=undefined;this.status.textContent=t('settings.commandChanged');this.render();return;
    }
    if(player===undefined||group===undefined)return;
    const candidate=structuredClone(this.draft);if (group === 'ultimate' || group === 'taunt' || group === 'rageAction') candidate[player][group] = event.code; else (candidate[player][group] as Record<string,string>)[action]=event.code;
    // Validation is pure; saving happens only on explicit Save.
    if(!validateControlSet(candidate,this.systemDraft,this.trainingDraft)){this.status.textContent=t('settings.keyRejected');return;}
    this.draft=candidate;this.capture=undefined;this.status.textContent=t('settings.keyChanged');this.render();
  };
  destroy():void {window.removeEventListener('keydown',this.onKey,true);this.root.remove();ControlSettings.active=false;this.previousFocus?.focus();this.close();}
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag); if (className) node.className = className; if (text) node.textContent = text; return node;
}
function button(text: string, action: () => void): HTMLButtonElement {
  const node = el('button', '', text); node.type = 'button'; node.onclick = action; return node;
}
function row(label: string, control: HTMLElement): HTMLElement {
  const line = el('label', 'control-system-row'); line.append(el('span', '', label), control); return line;
}
