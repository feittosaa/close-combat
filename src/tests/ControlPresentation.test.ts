import { getFightZoom } from '../rendering/stages/stageLayout';
import { afterEach, describe, expect, it } from 'vitest';
import { getPlayerLayout, keyLabel, loadControls, resetControls, saveControls, validateLayouts, BUTTON_COLORS } from '../input/controlSettings';
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
    layouts[0].buttons['2']='KeyU';let saved='';
    expect(saveControls(layouts,{setItem:(_key,value)=>{saved=value;}})).toBe(true);
    expect(loadControls({getItem:()=>saved})[0].buttons['2']).toBe('KeyU');
    expect(formatCommand('df+2')).toBe('↘+U');
    const target=new EventTarget();const keyboard=new KeyboardInput(getPlayerLayout(),target as Window);
    const event=new Event('keydown');Object.defineProperty(event,'code',{value:'KeyU'});target.dispatchEvent(event);
    expect([...keyboard.read().buttons]).toEqual(['2']);keyboard.destroy();
  });
  it('recusa teclas repetidas e atalhos reservados e ignora armazenamento inválido',()=>{
    const layouts=[getPlayerLayout(0),getPlayerLayout(1)];layouts[0].buttons['1']='KeyP';expect(validateLayouts(layouts)).toBe(false);
    layouts[0].buttons['1']='Numpad1';expect(validateLayouts(layouts)).toBe(false);
    expect(loadControls({getItem:()=>'{bad json'})).toEqual([getPlayerLayout(0),getPlayerLayout(1)]);
    expect(keyLabel('Numpad2')).toBe('Num2');
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

it('enquadra lutadores maiores de perto sem cortar as extremidades quando se afastam',()=>{
  expect(getFightZoom(1024,[450,550])).toBe(1.55);
  const far=getFightZoom(1024,[100,950]);expect(far).toBeLessThan(1.55);expect((850+230)*far).toBeLessThanOrEqual(1024);
});
