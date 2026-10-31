import { getPlayerLayout, getSystemControls, keyLabel, resetControls, saveControls, saveSystemControls, type ControlLayouts, type SystemControlLayout, BUTTON_COLORS, getTrainingControls, defaultTrainingControls, saveTrainingControls, validateControlSet, type TrainingControls } from '../input/controlSettings';
import type { AttackButton } from '../input/types';
const actions = [['directions','left','← Esquerda'],['directions','right','→ Direita'],['directions','up','↑ Cima'],['directions','down','↓ Baixo'],['buttons','1','Soco esquerdo'],['buttons','2','Soco direito'],['buttons','3','Chute esquerdo'],['buttons','4','Chute direito']] as const;
export class ControlSettings {
  static active = false;
  private readonly root = document.createElement('section');
  private draft: ControlLayouts = [getPlayerLayout(0),getPlayerLayout(1)];
  private systemDraft: SystemControlLayout = getSystemControls();
  private trainingDraft: TrainingControls = getTrainingControls();
  private capture?: { player?: number; group?: 'directions'|'buttons'|'ultimate'|'taunt'; action: string; system?: true; training?: true; button: HTMLButtonElement };
  private readonly status = document.createElement('p');
  private readonly previousFocus = document.activeElement as HTMLElement | null;
  constructor(private readonly close: () => void) {
    ControlSettings.active = true; this.root.className = 'control-settings'; this.root.setAttribute('role','dialog'); this.root.setAttribute('aria-modal','true'); this.root.setAttribute('aria-label','Configurar controles');
    document.body.append(this.root); this.render(); window.addEventListener('keydown',this.onKey,true);
  }
  private render(): void {
    this.root.replaceChildren(); const panel = document.createElement('div'); panel.className = 'controls-panel';
    const title = document.createElement('h1'); title.textContent = 'CONTROLES'; panel.append(title);
    const hint = document.createElement('p'); hint.textContent = 'Escolha uma ação e pressione a nova tecla. Cada tecla pertence a uma única ação nos dois jogadores.'; panel.append(hint);
    const grid = document.createElement('div'); grid.className = 'controls-grid';
    this.draft.forEach((layout,player) => {
      const group = document.createElement('div'); const h = document.createElement('h2'); h.textContent = `Jogador ${player+1}`; group.append(h);
      actions.forEach(([kind,action,label])=> {
        const row = document.createElement('div'); const caption = document.createElement('span'); caption.textContent = label;
        const button = document.createElement('button'); button.textContent = keyLabel((layout[kind] as Record<string,string>)[action]); button.setAttribute('aria-label',`P${player+1} ${label}: ${button.textContent}`);
        if (kind==='buttons') button.style.color = BUTTON_COLORS[action as AttackButton];
        button.onclick=()=> { if (this.capture) this.capture.button.textContent=''; this.capture={player,group:kind,action,button}; button.textContent='Pressione…'; this.status.textContent='Esc cancela a captura. Atalhos do treino aparecem na tela de treino.'; };
        row.append(caption,button); group.append(row);
      });
      for (const [action,label] of [['ultimate','Ultimate'],['taunt','Provocação']] as const) {
        const row = document.createElement('div'); const caption = document.createElement('span'); caption.textContent = label;
        const button = document.createElement('button'); button.textContent = keyLabel(layout[action]);
        button.setAttribute('aria-label', `P${player+1} ${label}: ${button.textContent}`);
        button.onclick = () => { this.capture = {player,group:action,action,button}; button.textContent='Pressione…'; this.status.textContent='Esc cancela a captura.'; };
        row.append(caption,button); group.append(row);
      }
      grid.append(group);
    }); panel.append(grid);
    const systemHeading=document.createElement('h2');systemHeading.textContent='Comandos da luta';panel.append(systemHeading);
    ( [['pause','Pausar luta'],['reset','Reiniciar treino']] as const).forEach(([action,label])=>{const row=document.createElement('div');row.className='control-system-row';const caption=document.createElement('span');caption.textContent=label;const button=document.createElement('button');button.textContent=keyLabel(this.systemDraft[action]);button.onclick=()=>{this.capture={action,system:true,button};button.textContent='Pressione…';this.status.textContent='Esc cancela a captura. Atalhos do treino aparecem na tela de treino.';};row.append(caption,button);panel.append(row);});
    const trainingHeading=document.createElement('h2');trainingHeading.textContent='Comandos do treino';panel.append(trainingHeading);
    ( [['step','Avançar quadro'],['speed','Velocidade'],['reset','Reiniciar treino (atalho)'],['autoLife','Vida automática'],['distance','Distância'],['opponent','Adversário'],['geometry','Caixas de colisão'],['inputs','Histórico de entradas']] as const).forEach(([action,label])=>{const row=document.createElement('div');row.className='control-system-row';const caption=document.createElement('span');caption.textContent=label;const button=document.createElement('button');button.textContent=keyLabel(this.trainingDraft[action]);button.onclick=()=>{this.capture={action,training:true,button};button.textContent='Pressione…';this.status.textContent='Esc cancela a captura.';};row.append(caption,button);panel.append(row);});
    this.status.setAttribute('role','status'); panel.append(this.status);
    const actionsRow = document.createElement('footer');
    for (const [text,action] of [['Restaurar padrão',()=>{resetControls();this.draft=[getPlayerLayout(0),getPlayerLayout(1)];this.systemDraft=getSystemControls();this.trainingDraft=defaultTrainingControls();this.capture=undefined;this.status.textContent='Padrão restaurado.';this.render();}],['Salvar e voltar',()=>{if(validateControlSet(this.draft,this.systemDraft,this.trainingDraft)&&saveControls(this.draft)&&saveSystemControls(this.systemDraft)&&saveTrainingControls(this.trainingDraft))this.destroy();else this.status.textContent='Escolha teclas válidas, sem repetição nem atalhos reservados.';}]] as const) {
      const button=document.createElement('button');button.textContent=text;button.onclick=action;actionsRow.append(button);
    } panel.append(actionsRow);this.root.append(panel);this.root.querySelector('button')?.focus();
  }
  private readonly onKey=(event:KeyboardEvent):void=> {
    if (event.code==='Tab' && !this.capture) {
      const buttons=[...this.root.querySelectorAll('button')]; const index=buttons.indexOf(document.activeElement as HTMLButtonElement);
      if(event.shiftKey && index===0){event.preventDefault();buttons[buttons.length-1]?.focus();}else if(!event.shiftKey && index===buttons.length-1){event.preventDefault();buttons[0]?.focus();} return;
    }
    event.stopImmediatePropagation();
    if(event.code==='Escape'){event.preventDefault(); if(this.capture){this.capture=undefined;this.render();}else this.destroy();return;}
    if(!this.capture || event.repeat)return;
    event.preventDefault(); const {player,group,action}=this.capture;
    if(this.capture.system || this.capture.training){
      const system=this.capture.system ? {...this.systemDraft,[action]:event.code} : this.systemDraft;
      const training=this.capture.training ? {...this.trainingDraft,[action]:event.code} : this.trainingDraft;
      if(!validateControlSet(this.draft,system,training)){this.status.textContent='Tecla repetida, reservada ou não suportada. Escolha outra.';return;}
      this.systemDraft=system;this.trainingDraft=training;this.capture=undefined;this.status.textContent='Comando alterado. Salve para aplicar.';this.render();return;
    }
    if(player===undefined||group===undefined)return;
    const candidate=structuredClone(this.draft);if (group === 'ultimate' || group === 'taunt') candidate[player][group] = event.code; else (candidate[player][group] as Record<string,string>)[action]=event.code;
    // Validation is pure; saving happens only on explicit Save.
    if(!validateControlSet(candidate,this.systemDraft,this.trainingDraft)){this.status.textContent='Tecla repetida, reservada ou não suportada. Escolha outra.';return;}
    this.draft=candidate;this.capture=undefined;this.status.textContent='Tecla alterada. Salve para aplicar.';this.render();
  };
  destroy():void {window.removeEventListener('keydown',this.onKey,true);this.root.remove();ControlSettings.active=false;this.previousFocus?.focus();this.close();}
}
