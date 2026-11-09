import { createStageLayout, getFightCameraFrame } from '../rendering/stages/stageLayout';
import { afterEach, describe, expect, it } from 'vitest';
import { keySlots } from '../ui/ControlSettings';
import { getPlayerLayout, getSystemControls, keyLabel, loadControls, resetControls, saveControls, saveSystemControls, validateLayouts, validateSystemControls, validateControlSet, getTrainingControls, loadTrainingControls, defaultTrainingControls, BUTTON_COLORS } from '../input/controlSettings';
import { commandTokens, formatCommand, screenDirection, formatCommandProse } from '../ui/commandNotation';
import { InputHistory } from '../training/InputHistory';
import { KeyboardInput } from '../input/KeyboardInput';
afterEach(()=>resetControls());
describe('controles configuráveis e apresentação',()=>{
  it('mostra setas e teclas sem alterar comandos ou números de frames',()=>{
    expect(formatCommand('f,n,d,df:2')).toBe('→,•,↓,↘:K');
    expect(formatCommand('1,1,2 > df+1+2')).toBe('J,J,K  ›  ↘+J+K');
    expect(commandTokens('1+2+3+4').filter(t=>t.button).map(t=>BUTTON_COLORS[t.button!])).toHaveLength(4);
    expect(new Set(Object.values(BUTTON_COLORS)).size).toBe(4);
    expect(formatCommand('31F')).toBe('31F');
    expect(screenDirection('DF','left')).toBe('DB');
    expect(formatCommandProse('1,2 devem errar; carga 20F')).toBe('J,K devem errar; carga 20F');
  });
  it('persiste a tecla, usa a mesma no teclado e atualiza os rótulos',()=>{
    const layouts:[ReturnType<typeof getPlayerLayout>,ReturnType<typeof getPlayerLayout>]=[getPlayerLayout(0),getPlayerLayout(1)];
    layouts[0].buttons['2']='KeyO';let saved='';
    expect(saveControls(layouts,{setItem:(_key,value)=>{saved=value;}})).toBe(true);
    expect(loadControls({getItem:()=>saved})[0].buttons['2']).toBe('KeyO');
    expect(formatCommand('df+2')).toBe('↘+O');
    const target=new EventTarget();const keyboard=new KeyboardInput(getPlayerLayout(),target as Window);
    const event=new Event('keydown');Object.defineProperty(event,'code',{value:'KeyO'});target.dispatchEvent(event);
    expect([...keyboard.read().buttons]).toEqual(['2']);keyboard.destroy();
  });
  it('usa T como provocação padrão e migra layouts antigos sem perder teclas',()=>{
    const original=[getPlayerLayout(0),getPlayerLayout(1)];
    const old=original.map(({taunt: _taunt,...layout})=>layout);
    const migrated=loadControls({getItem:()=>JSON.stringify(old)});
    expect(migrated[0].taunt).toBe('KeyT');
    expect(validateLayouts(migrated)).toBe(true);
    const target=new EventTarget();const keyboard=new KeyboardInput(migrated[0],target as Window);
    const event=new Event('keydown');Object.defineProperty(event,'code',{value:'KeyT'});target.dispatchEvent(event);
    expect(keyboard.read().taunt).toBe(true);keyboard.destroy();
  });
  it('recusa teclas repetidas e atalhos reservados e ignora armazenamento inválido',()=>{
    const layouts=[getPlayerLayout(0),getPlayerLayout(1)];layouts[0].buttons['1']='KeyP';expect(validateControlSet(layouts as [typeof layouts[0],typeof layouts[0]],getSystemControls(),getTrainingControls())).toBe(false);
    layouts[0].buttons['1']='Numpad1';expect(validateLayouts(layouts)).toBe(false);
    expect(loadControls({getItem:()=>'{bad json'})).toEqual([getPlayerLayout(0),getPlayerLayout(1)]);
    expect(keyLabel('Numpad2')).toBe('Num2');
  });
  it('permite remapear atalhos de treino e rejeita conflitos entre todos os comandos',()=>{
    const players:[ReturnType<typeof getPlayerLayout>,ReturnType<typeof getPlayerLayout>]=[getPlayerLayout(0),getPlayerLayout(1)];
    const training={...getTrainingControls(), geometry:'KeyO', inputs:'KeyQ'};
    players[0].ultimate='KeyH'; players[0].taunt='KeyI';
    expect(validateControlSet(players,getSystemControls(),training)).toBe(true);
    expect(validateControlSet(players,getSystemControls(),{...training,inputs:'KeyH'})).toBe(false);
  });
  it('mapeamento de treino salvo antes dos atalhos do tutorial recebe as teclas padrão novas',()=>{
    const old={ step:'Period', speed:'KeyO', reset:'F2', autoLife:'F3', distance:'F4', opponent:'KeyG', geometry:'KeyH', inputs:'KeyI' };
    expect(loadTrainingControls({getItem:()=>JSON.stringify(old)})).toEqual({...defaultTrainingControls(),speed:'KeyO'});
    // A saved key wins over the new default it collides with: the history toggle on B survives, C goes to the next free key.
    const custom={...old,inputs:'KeyB',geometry:'KeyC'};
    const loaded=loadTrainingControls({getItem:()=>JSON.stringify(custom)});
    expect(loaded).toMatchObject({inputs:'KeyB',geometry:'KeyC',speed:'KeyO',tutorialPrevious:'KeyZ',tutorialNext:'KeyX',tutorialDemo:'KeyV'});
    expect(new Set(Object.values(loaded)).size).toBe(Object.keys(loaded).length);
    expect(loadTrainingControls({getItem:()=>JSON.stringify(old)},['KeyC','KeyZ']).tutorialSection).not.toMatch(/^Key[CZ]$/);
  });
  it('tecla já em uso troca de lugar com a do comando escolhido',()=>{
    const players:[ReturnType<typeof getPlayerLayout>,ReturnType<typeof getPlayerLayout>]=[getPlayerLayout(0),getPlayerLayout(1)];
    const system=getSystemControls(), training=getTrainingControls(), slots=keySlots(players,system,training);
    const own=slots.find(slot=>slot.id==='training.inputs')!, other=slots.find(slot=>slot.get()===players[0].buttons['1'])!;
    const previous=own.get(); own.set(players[0].buttons['1']); other.set(previous);
    expect(training.inputs).toBe('KeyJ'); expect(players[0].buttons['1']).toBe(previous);
    expect(validateControlSet(players,system,training)).toBe(true);
  });
  it('configura pausa e reinício sem sobrepor controles dos jogadores ou atalhos de treino',()=>{
    let saved='';
    expect(saveSystemControls({pause:'KeyP',reset:'KeyR'},{setItem:(_key,value)=>{saved=value;}})).toBe(true);
    expect(JSON.parse(saved)).toEqual({pause:'KeyP',reset:'KeyR'});
    expect(saveSystemControls({pause:'KeyJ',reset:'KeyR'})).toBe(false);
    expect(validateControlSet([getPlayerLayout(0),getPlayerLayout(1)],{pause:'KeyG',reset:'KeyR'},getTrainingControls())).toBe(false);
    expect(validateSystemControls({pause:'KeyP',reset:'KeyP'})).toBe(false);
    expect(getSystemControls()).toEqual({pause:'KeyP',reset:'KeyR'});
  });
});
describe('histórico de mudanças de entrada',()=>{
  it('guarda direção, acorde, soltura e duração, inclusive após neutral longo',()=>{
    const h=new InputHistory(); const buttons=new Set<'1'|'2'>(['1','2']);
    h.push({direction:'DF',buttons},10,'right');h.push({direction:'DF',buttons},11,'right');buttons.clear();
    for(let f=12;f<112;f++)h.push({direction:'N',buttons},f,'right');
    expect(h.snapshot()).toHaveLength(2);expect(h.snapshot()[0].duration).toBe(2);expect([...h.snapshot()[0].input.buttons]).toEqual(['1','2']);
    expect(h.snapshot()[1]).toMatchObject({frame:12,duration:100});
    const copy=h.snapshot();(copy[0].input.buttons as Set<string>).clear();expect(h.snapshot()[0].input.buttons.size).toBe(2);
    h.clear();expect(h.snapshot()).toEqual([]);
  });
  it('limita histórico por eventos e preserva o facing de cada entrada',()=>{
    const h=new InputHistory();for(let f=0;f<40;f++)h.push({direction:f%2?'F':'N',buttons:new Set()},f,f<20?'right':'left');
    expect(h.snapshot()).toHaveLength(24);expect(h.snapshot()[0].frame).toBe(16);expect(h.snapshot()[23].facing).toBe('left');
  });
});

it('preserva proporção, piso projetado e limites do cenário do contato até as extremidades',()=>{
  const layout=createStageLayout({minimumScale:.5,referenceSize:{width:3168,height:1344},groundY:1120} as Parameters<typeof createStageLayout>[0],1024,576,488);

  for(const positions of [[744,840],[304,1280],[0,96],[1488,1584]]){
    const frame=getFightCameraFrame(layout,positions);
    const projectY=(worldY:number)=>288+(worldY-frame.scrollY-288)*frame.zoom;
    expect(projectY(488)).toBeCloseTo(488,8);
    expect(projectY(layout.originY+1120*layout.scale)).toBeCloseTo(projectY(488),8);
    const left=frame.scrollX+512-512/frame.zoom;
    const right=frame.scrollX+512+512/frame.zoom;
    expect(left).toBeGreaterThanOrEqual(-1e-8);expect(right).toBeLessThanOrEqual(layout.worldWidth+1e-8);
    expect(projectY(layout.originY)).toBeLessThanOrEqual(1e-8);
    expect(projectY(layout.originY+1344*layout.scale)).toBeGreaterThanOrEqual(576-1e-8);
    expect(frame.zoom).toBe(1.6);
    expect(frame.scrollY).toBeCloseTo(75);
  }
});

it('migrates existing player mappings without overwriting keys and validates ultimate shortcuts',()=>{
  const original=[getPlayerLayout(0),getPlayerLayout(1)];
  const old=original.map(({ultimate: _ultimate,...layout})=>layout);
  old[0].buttons['2']='KeyU';
  const migrated=loadControls({getItem:()=>JSON.stringify(old)});
  expect(migrated[0].buttons['2']).toBe('KeyU');
  expect(migrated[0].ultimate).not.toBe('KeyU');
  expect(validateLayouts(migrated)).toBe(true);
  migrated[0].ultimate=migrated[1].ultimate;
  expect(validateLayouts(migrated)).toBe(false);
});


it('migrates saved layouts without stealing a configured rage action or system key', () => {
  const old = [getPlayerLayout(0), getPlayerLayout(1)].map(({ rageAction: _rageAction, ...layout }) => layout);
  old[0].buttons['1'] = 'KeyE';
  const storage = { getItem: (key: string) => key.includes('system-controls') ? JSON.stringify({ pause: 'KeyP', reset: 'KeyQ' }) : JSON.stringify(old) };
  const migrated = loadControls(storage);
  expect(migrated[0].buttons['1']).toBe('KeyE');
  expect(migrated[0].rageAction).not.toBe('KeyE');
  expect(migrated[0].rageAction).not.toBe('KeyQ');
  expect(migrated[1].rageAction).toBe('Numpad7');
  expect(validateLayouts(migrated)).toBe(true);
});


it('records the rage action in the training input history', () => {
  const history = new InputHistory();
  history.push({ direction: 'N', buttons: new Set() }, 0, 'right');
  history.push({ direction: 'N', buttons: new Set(['1']), rageAction: true }, 1, 'right');
  history.push({ direction: 'N', buttons: new Set(['1']) }, 2, 'right');
  expect(history.snapshot()).toHaveLength(3);
  expect(history.snapshot()[1].input.rageAction).toBe(true);
});
