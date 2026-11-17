import { createHurtbox, createHurtZones, hasHurtZones } from '../engine/collision/combatGeometry';
import { describe, expect, it } from 'vitest';
import { sm0g } from '../engine/data/fighters/sm0g';
import { bob } from '../engine/data/fighters/bob';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { createHitbox } from '../engine/collision/combatGeometry';
import type { FrameInput } from '../input/types';
import { palettePixel } from '../rendering/characterColor';
import measurements from '../assets/sprites/characters/sm0g/measurements.json';
import { getSm0gPose, getSm0gInbetween, sm0gAdjustment } from '../rendering/animations/sm0gSprites';
import { sm0gCapturePose, sm0gSpinPhase, hiddenBySm0gUltimate } from '../rendering/sm0gCapture';
import { sm0gEffects } from '../rendering/sm0gEffects';

/** Damage authored for SM0G-000 move, so the tests follow the numbers tuned in the developer mode. */
const dmg = (id: string): number => sm0g.moves.find(move => move.id === id)!.damage;
import { sm0gHand } from '../rendering/sm0gHands';
import { sm0gReaction } from '../rendering/sm0gReaction';
import { texas } from '../engine/data/fighters/texas';
import { getTexasSpritePose, settleAfterRound } from '../rendering/animations/texasSprites';
import { SM0G_ULTIMATE_HOLD_FRAMES, SM0G_ULTIMATE_LAST_FRAMES, SM0G_ULTIMATE_SPIN_FRAMES } from '../engine/combat/ultimateActivation';

const sheets = import.meta.glob('../assets/sprites/characters/sm0g/*.png');

describe('SM0G-000 provisório', () => {
  it('tem os dez básicos e os golpes aprovados, e é mais lento e maior que Bob', () => {
    expect(sm0g.moves).toHaveLength(22);
    expect(sm0g.combos?.[0].moveIds).toEqual(['grab-headbutt', 'grab-slam', 'grab-low']);
    expect(sm0g.movement.walkSpeed).toBeLessThan(bob.movement.walkSpeed);
    expect(sm0g.collision.hurtboxes.standing.height).toBeGreaterThan(bob.collision.hurtboxes.standing.height);
    expect(sm0g.moves.find(move => move.id === 'light-kick')?.hitLevel).toBe('low');
    for (const move of sm0g.moves.filter(move => bob.moves.some(base => base.id === move.id))) expect(move.startup).toBeGreaterThan(bob.moves.find(base => base.id === move.id)!.startup);
  });
  it('a reação ao golpe começa no impacto, o ponto alto, e recupera até o fim do atordoamento, rápida no início e mais lenta no fim', () => {
    const state = new Simulation(createGameConfig(1024, 576), [sm0g, bob]).snapshot().characters[0];
    const stun = 24, start = 100;
    for (const hitReaction of [undefined, { level:'high' as const, startedFrame:start }, { level:'low' as const, startedFrame:start }]) {
      const poses = Array.from({ length: stun }, (_, age) => getSm0gPose({ ...state, mode:'hitstun', hitReaction, stateStartedFrame:start, remainingStateFrames:stun - age }, start + age));
      expect(poses[0].drawing).toBe(2);
      expect(poses.map(pose => pose.drawing)).toEqual([...poses.map(pose => pose.drawing)].sort((x, y) => x - y));
      expect(poses[stun - 1].drawing).toBe(5);
      expect(new Set(poses.map(pose => pose.name)).size).toBe(1);
    }
    const air = getSm0gPose({ ...state, grounded:false, mode:'hitstun', stateStartedFrame:start, remainingStateFrames:stun }, start);
    expect(air).toEqual({ name:'air-hurt', drawing:2 });
  });
  it('é atingido por zonas (alta, média e baixa) como Texas e Bob, e a zona baixa é mais larga que o corpo', () => {
    const state = new Simulation(createGameConfig(1024, 576), [bob, sm0g]).snapshot().characters[1];
    expect(hasHurtZones(state.fighterId)).toBe(true);
    const { high, mid, low } = createHurtZones(state), body = createHurtbox(state);
    expect(high.height + mid.height + low.height).toBeCloseTo(body.height);
    expect(low.width).toBeGreaterThan(body.width);
  });
  it('quem pula não atravessa SM0G-000 por dentro: só passa com os pés acima da cabeça dela', () => {
    for (const [other, label] of [[sm0g, 'SM0G-000'], [bob, 'Bob']] as const) {
      const sim = new Simulation(createGameConfig(1024, 576), [texas, other], { training: true, initialDistance: 80 });
      const forward: FrameInput = { direction:'UF', buttons:new Set() }, neutral: FrameInput = { direction:'N', buttons:new Set() };
      let highest = 0;
      for (let i = 0; i < 90; i++) {
        sim.stepFrame([i < 60 ? forward : neutral, neutral]);
        const [jumper, target] = sim.snapshot().characters;
        highest = Math.max(highest, target.y - jumper.y);
        expect(jumper.x, `${label} no quadro ${i}`).toBeLessThan(target.x);
      }
      expect(highest, label).toBeGreaterThan(60);
    }
  });
  it('seleciona animações distintas para movimentos, ataques e reações', () => {
    const state = new Simulation(createGameConfig(1024, 576), [sm0g, bob]).snapshot().characters[0];
    expect(getSm0gPose(state, 0).name).toBe('idle');
    expect(getSm0gPose({ ...state, mode:'moving', movementDirection:'backward' }, 0).name).toBe('backward');
    expect(getSm0gPose({ ...state, mode:'hitstun', hitReaction:{ level:'low', startedFrame:0 } }, 0).name).toBe('hurt-low');
    expect(getSm0gPose({ ...state, mode:'startup', attack:{ moveId:'light-kick', buttons:['3'], elapsedFrames:0, hasHit:false } }, 0).name).toBe('light-kick');
  });
  it('intercala desenhos aprovados sem trocar a pose lógica do golpe', () => {
    const state = new Simulation(createGameConfig(1024,576), [sm0g, bob]).snapshot().characters[0];
    const attack = {moveId:'grab-throw', buttons:['2'] as const, elapsedFrames:3, hasHit:false};
    const actor = {...state, attack};
    expect(getSm0gPose(actor, 0).drawing).toBe(0);
    expect(getSm0gInbetween(actor, 0)).toBe(0);
  });
  it('anima a entrada e mantém uma pose agachada fixa', () => {
    const sim = new Simulation(createGameConfig(1024,576), [sm0g, bob], {training:true, initialDistance:400});
    const down: FrameInput = {direction:'D', buttons:new Set()}, neutral: FrameInput = {direction:'N', buttons:new Set()};
    sim.stepFrame([down, neutral]);
    const start = sim.snapshot().frame;
    expect(getSm0gPose(sim.snapshot().characters[0], start)).toEqual({name:'crouch-enter', drawing:0});
    for (let i=0; i<12; i++) sim.stepFrame([down, neutral]);
    expect(getSm0gPose(sim.snapshot().characters[0], sim.snapshot().frame)).toEqual({name:'crouch', drawing:3});
    sim.stepFrame([neutral, neutral]);
    expect(getSm0gPose(sim.snapshot().characters[0], sim.snapshot().frame).name).toBe('crouch-exit');
  });
  it('sincroniza efeitos próprios, captura e giro sem alterar as poses', () => {
    const state = new Simulation(createGameConfig(1024, 576), [sm0g, bob]).snapshot().characters[0];
    const attack = { moveId:'grab-slam', buttons:['2'] as const, elapsedFrames:34, hasHit:true };
    expect(sm0gEffects({ ...state, attack:{ ...attack, buttons:[...attack.buttons] } })[0]?.name).toBe('grab-slam');
    expect(sm0gEffects({ ...state, attack:{ ...attack, buttons:[...attack.buttons], hasHit:false } })).toEqual([]);
    const ultimate = { ...state, attack:{ moveId:'ultimate-grab', buttons:[], elapsedFrames:32, hasHit:true } };
    expect(sm0gEffects(ultimate).map(effect => effect.name)).toEqual(['ultimate-grab', 'ultimate-rotation']);
    expect(sm0gEffects(ultimate, 40).map(effect => effect.name)).toEqual(['ultimate-start']);
    expect(sm0gEffects({ ...ultimate, attack:{ ...ultimate.attack, elapsedFrames:100 } })).toEqual([]);
  });
  it('avança a fumaça em quatro quadros e acompanha o cotovelo espelhado', () => {
    const state = new Simulation(createGameConfig(1024, 576), [sm0g, bob]).snapshot().characters[0];
    const move = sm0g.moves.find(candidate => candidate.id === 'hammer-punch')!;
    const at = (age: number) => sm0gEffects({ ...state, attack:{moveId:move.id, buttons:['1','2'], elapsedFrames:move.startup + age, hasHit:false} });
    // The smoke starts as the arms swing down, six frames before the active frames.
    expect([at(-6)[0].frame, at(-3)[0].frame, at(-2)[0].frame, at(17)[0].frame]).toEqual([0,0,1,5]);
    expect(at(-7)).toEqual([]);
    expect(at(18)).toEqual([]);
    const attack = {moveId:'ultimate-grab', buttons:[], elapsedFrames:0, hasHit:false};
    const right = sm0gEffects({...state, facing:'right', attack}, 40)[0];
    const left = sm0gEffects({...state, facing:'left', attack}, 40)[0];
    expect(left.x).toBeCloseTo(-right.x);
    expect(left.y).toBeCloseTo(right.y);
  });
  it('mantém a altura do idle praticamente constante nos seis quadros, pela calibração', () => {
    const heights = measurements.idle.heights.map((height, frame) => height * sm0gAdjustment('idle', frame).scale);
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(0.02);
  });
  it('tem uma folha preparada, com o nome do golpe, para cada golpe', () => {
    for (const move of sm0g.moves) expect(sheets[`../assets/sprites/characters/sm0g/${move.id}.png`], move.id).toBeDefined();
  });
  it('na paleta alternativa a jaqueta oliva e o cabelo só escurecem; pele clara fica', () => {
    for (const [r, g, b] of [[96, 76, 47], [98, 61, 35]] as const) {
      const [red, green, blue] = palettePixel(r, g, b, 'sm0g');
      expect(red).toBeLessThan(r); expect(green).toBeLessThan(g); expect(blue).toBeLessThan(b); expect(red).toBeGreaterThan(r * .6);
    }
    for (const [r, g, b] of [[227, 186, 161], [190, 128, 83]] as const) expect(palettePixel(r, g, b, 'sm0g')).toEqual([r, g, b]);
  });
  it('na paleta alternativa só o laranja e o âmbar neon viram ciano; pele e couro ficam', () => {
    for (const [r, g, b] of [[248, 93, 3], [248, 154, 4]] as const) { const [red, , blue] = palettePixel(r, g, b, 'sm0g'); expect(blue).toBeGreaterThan(red * 3); }
    for (const [r, g, b] of [[227, 186, 161], [190, 128, 83]] as const) expect(palettePixel(r, g, b, 'sm0g')).toEqual([r, g, b]);
  });
  it.each([0, 1])('impede dash para trás por duplo toque e comando direto no jogador %i, e também impede para frente', index => {
    const neutral: FrameInput = { direction:'N', buttons:new Set() };
    const side = (input: FrameInput) => index === 0 ? [input, neutral] : [neutral, input];
    const sim = new Simulation(createGameConfig(2200, 700), [sm0g, sm0g], {training:true, initialDistance:900});
    const back: FrameInput = { ...neutral, direction:'B' };
    sim.stepFrame(side(back)); sim.stepFrame(side(neutral)); sim.stepFrame(side(back));
    expect(sim.snapshot().characters[index].mode).toBe('moving');
    sim.stepFrame(side(neutral)); sim.stepFrame(side({ ...neutral, dash:'B' }));
    expect(sim.snapshot().characters[index].mode).not.toBe('dashing');
    sim.stepFrame(side(neutral)); sim.stepFrame(side({ ...neutral, dash:'F' }));
    expect(sim.snapshot().characters[index].mode).not.toBe('dashing');
  });
  it.each(['3', '4'] as const)('não executa chute aéreo no botão %s', button => {
    const neutral: FrameInput = { direction:'N', buttons:new Set() };
    const sim = new Simulation(createGameConfig(2200, 700), [sm0g, bob], {training:true, initialDistance:900});
    sim.stepFrame([{ ...neutral, direction:'U' }, neutral]);
    sim.stepFrame([{ ...neutral, buttons:new Set([button]) }, neutral]);
    expect(sim.snapshot().characters[0].grounded).toBe(false);
    expect(sim.snapshot().characters[0].attack).toBeUndefined();
  });
  it.each(['heavy-punch', 'air-light-punch', 'air-heavy-punch', 'crouch-uppercut'])('espelha a caixa de contato do golpe %s', id => {
    const state = new Simulation(createGameConfig(1024,576), [sm0g, bob]).snapshot().characters[0];
    const move = sm0g.moves.find(candidate => candidate.id === id)!;
    const right = createHitbox({ ...state, x:500, facing:'right' }, move);
    const left = createHitbox({ ...state, x:500, facing:'left' }, move);
    expect(right.x - 500).toBeCloseTo(500 - (left.x + left.width));
    expect(left.y).toBe(right.y);
  });
  it('mostra o contato do chute forte agachado no quadro estendido', () => {
    const state = new Simulation(createGameConfig(1024,576), [sm0g, bob]).snapshot().characters[0];
    const move = sm0g.moves.find(candidate => candidate.id === 'crouch-heavy-kick')!;
    expect(getSm0gPose({ ...state, mode:'active', attack:{ moveId:move.id, buttons:['4'], elapsedFrames:move.startup, hasHit:false } }, 0)).toEqual({name:move.id, drawing:2});
  });

});

it('encadeia cabeçada, queda e agarrão baixo com entradas reais', () => {
  const sim = new Simulation(createGameConfig(1024,576), [sm0g, bob], {training:true, initialDistance:65});
  const neutral: FrameInput = { direction:'N', buttons:new Set() };
  const step = (input: FrameInput = neutral) => sim.stepFrame([input, neutral]);
  const command = (directions: FrameInput['direction'][], button: '1'|'2'|'3') => {
    for (const direction of directions.slice(0,-1)) step({direction,buttons:new Set()});
    step({direction:directions[directions.length-1],buttons:new Set([button])});
  };
  const waitHit = (id: string) => {
    for (let i=0;i<100;i++) {
      if (sim.snapshot().hitEvents.some(event => event.moveId === id)) return;
      step();
    }
    throw new Error(`Não acertou ${id}: ${JSON.stringify(sim.snapshot().characters.map(c => ({mode:c.mode,attack:c.attack,grounded:c.grounded})))}`);
  };
  command(['D','DF','F'],'1'); waitHit('grab-headbutt');
  while (sim.snapshot().hitstopFramesRemaining) step();
  for(let i=0;i<10;i++) step();
  command(['D','DF','F'],'2'); waitHit('grab-slam');
  while (sim.snapshot().hitstopFramesRemaining) step();
  for(let i=0;i<10;i++) step();
  command(['D','DB','B'],'3'); waitHit('grab-low');
  // The low grab's damage lands, health and combo together, only when it slams the victim on the floor.
  expect(sim.snapshot().characters[1].health).toBe(bob.maxHealth - dmg('grab-headbutt') - dmg('grab-slam'));
  const comboDamage = () => { const history = sim.snapshot().comboHistory; return history[history.length - 1]?.damage; };
  for(let i=0;i<30;i++) step();
  expect(sim.snapshot().characters[1].health).toBe(bob.maxHealth - dmg('grab-headbutt') - dmg('grab-slam') - dmg('grab-low'));
  expect(comboDamage()).toBe(dmg('grab-headbutt') + dmg('grab-slam') + dmg('grab-low'));
});

it.each([0, 1])('só o agarrão aéreo e a ultimate acertam alvo no ar, no jogador %i', player => {
  const attempt = (sequence:FrameInput['direction'][], button:'1'|'2', moveId:string, airTarget = true) => {
    const sim = new Simulation(createGameConfig(1024,576), player === 0 ? [sm0g, bob] : [bob, sm0g], {training:true, initialDistance:65});
    const neutral: FrameInput = {direction:'N',buttons:new Set()};
    const step = (own: FrameInput = neutral, target: FrameInput = neutral) => sim.stepFrame(player === 0 ? [own,target] : [target,own]);
    step({direction:sequence[0],buttons:new Set()}, {direction:airTarget ? 'U' : 'N',buttons:new Set()});
    step({direction:sequence[1],buttons:new Set()});
    step({direction:sequence[2],buttons:new Set([button])});
    for(let i=0;i<50;i++){ step(); if(sim.snapshot().hitEvents.some(event => event.moveId === moveId)) return true; }
    return false;
  };
  expect(attempt(['D','DF','F'], '2', 'grab-slam')).toBe(false);
  expect(attempt(['D','DF','F'], '2', 'grab-slam', false)).toBe(true);
  expect(attempt(['D','DF','F'], '1', 'grab-headbutt')).toBe(false);
  expect(attempt(['D','DF','F'], '1', 'grab-headbutt', false)).toBe(true);
  expect(attempt(['D','DB','B'], '2', 'grab-launcher')).toBe(false);
});
it('o agarrão aéreo só acerta alvo no ar', () => {
  const sim = new Simulation(createGameConfig(1024,576), [sm0g, bob], {training:true, initialDistance:65});
  const n: FrameInput = {direction:'N',buttons:new Set()};
  const step = (a:FrameInput=n) => sim.stepFrame([a,n]);
  step({direction:'U',buttons:new Set()});
  step({direction:'N',buttons:new Set(['1','2'])});
  for(let i=0;i<50;i++) { step(); expect(sim.snapshot().hitEvents.some(event => event.moveId === 'air-grab')).toBe(false); }
});

it('agarrão aéreo derruba o alvo no quadro do arremesso sem derrubar o SM0G-000', () => {
  const sim = new Simulation(createGameConfig(1024,576), [sm0g, bob], {training:true, initialDistance:65});
  const n: FrameInput = {direction:'N',buttons:new Set()};
  const step = (a:FrameInput=n,b:FrameInput=n) => sim.stepFrame([a,b]);
  step({direction:'U',buttons:new Set()}, {direction:'U',buttons:new Set()});
  step({direction:'N',buttons:new Set(['1','2'])});
  let hit = false;
  for(let i=0;i<40;i++) { step(); if(sim.snapshot().hitEvents.some(event => event.moveId === 'air-grab')) { hit=true; break; } }
  expect(hit).toBe(true);
  const capture = sim.snapshot().characters.map(character => ({x:character.x,y:character.y}));
  while(sim.snapshot().hitstopFramesRemaining) {
    step();
    expect(sim.snapshot().characters.map(character => ({x:character.x,y:character.y}))).toEqual(capture);
  }
  step();
  const [self,target] = sim.snapshot().characters;
  expect(self.grounded).toBe(false);
  expect(self.attack).toBeDefined();
  expect(target.grounded).toBe(true);
  expect(target.y).toBe(createGameConfig(1024,576).arena.floorY);
  expect(target.mode).toBe('knockdown');
  expect(target.commandGrabbed).toBeUndefined();
  expect(target.remainingStateFrames).toBeGreaterThanOrEqual(bob.juggle!.getupFrames + 18);
  const heldPosition = { x:self.x, y:self.y };
  while (sim.snapshot().characters[0].attack) {
    step();
    const attacker = sim.snapshot().characters[0];
    if (attacker.attack) expect({x:attacker.x,y:attacker.y}).toEqual(heldPosition);
  }
  expect(sim.snapshot().characters[0].y).toBeGreaterThanOrEqual(heldPosition.y);
  expect(sim.snapshot().characters[1].mode).toBe('knockdown');
});

it('limita a hitbox da ultimate ao alcance das mãos nos dois lados', () => {
  const state = new Simulation(createGameConfig(1024,576), [sm0g, bob]).snapshot().characters[0];
  const move = sm0g.moves.find(candidate => candidate.id === 'ultimate-grab')!;
  const right = createHitbox({...state,x:500,facing:'right'},move);
  const left = createHitbox({...state,x:500,facing:'left'},move);
  const light = sm0g.moves.find(candidate => candidate.id === 'light-punch')!;
  const lightRight = createHitbox({...state,x:500,facing:'right'},light);
  expect(right.width).toBe(lightRight.width);
  expect(right.x).toBe(lightRight.x);
  expect(left.width).toBe(lightRight.width);
  expect(right.x - 500).toBeCloseTo(500 - (left.x + left.width));
});

it('executa o arremesso distante com o comando autorizado e lança a vítima', () => {
  const sim = new Simulation(createGameConfig(1024,576), [sm0g, bob], {training:true, initialDistance:65});
  const n: FrameInput = {direction:'N',buttons:new Set()};
  const step = (direction:FrameInput['direction']='N', button?:'2') => sim.stepFrame([{direction,buttons:new Set(button?[button]:[])},n]);
  step('B'); step('DB'); step('D'); step('DF'); step('F','2');
  let hit = false;
  for(let i=0;i<80;i++){step();if(sim.snapshot().hitEvents.some(event => event.moveId === 'grab-throw')) {hit=true;break;}}
  expect(hit).toBe(true);
  expect(sim.snapshot().characters[1].throwFlight).toBeUndefined();
  while(sim.snapshot().hitstopFramesRemaining) step();
  expect(sim.snapshot().characters[1].throwFlight).toBe(true);
  expect(sim.snapshot().characters[1].wallBouncePending).toBeDefined();
  const startX = sim.snapshot().characters[1].x;
  for (let i = 0; i < 30; i++) step();
  expect(sim.snapshot().characters[1].x - startX).toBeGreaterThan(220);
});

it('launcher permite saltar e acertar o agarrão aéreo antes de o alvo cair', () => {
  const sim = new Simulation(createGameConfig(1024,576), [sm0g, bob], {training:true, initialDistance:65});
  const n: FrameInput = {direction:'N',buttons:new Set()};
  const step = (direction:FrameInput['direction']='N', button?:'1'|'2') => sim.stepFrame([{direction,buttons:new Set(button?[button]:[])},n]);
  step('D'); step('DB'); step('B','2');
  let launched = false;
  for(let i=0;i<80;i++) {step();if(sim.snapshot().hitEvents.some(event => event.moveId === 'grab-launcher')) {launched=true;break;}}
  expect(launched).toBe(true);
  expect(sim.snapshot().characters[1].grounded).toBe(true);
  while(sim.snapshot().hitstopFramesRemaining) step();
  expect(sim.snapshot().characters[1].verticalVelocity).toBeLessThan(0);
  while(sim.snapshot().characters[0].attack) step();
  step('U'); sim.stepFrame([{direction:'N',buttons:new Set(['1','2'])},n]);
  let grabbed = false;
  for(let i=0;i<50;i++) {step();if(sim.snapshot().hitEvents.some(event => event.moveId === 'air-grab')) {grabbed=true;break;}}
  expect(grabbed).toBe(true);
});

it('após o launcher aceita soco aéreo seguido de agarrão aéreo', () => {
  const sim = new Simulation(createGameConfig(1024,576), [sm0g, bob], {training:true, initialDistance:65});
  const n:FrameInput={direction:'N',buttons:new Set()};
  const step=(direction:FrameInput['direction']='N',button?:'1'|'2')=>sim.stepFrame([{direction,buttons:new Set(button?[button]:[])},n]);
  const wait=(id:string)=>{for(let i=0;i<100;i++){if(sim.snapshot().hitEvents.some(e=>e.moveId===id))return;step();}throw new Error(`não acertou ${id}`)};
  step('D');step('DB');step('B','2');wait('grab-launcher');
  while(sim.snapshot().characters[0].attack)step();
  step('U');step('N','1');wait('air-light-punch');
  while(sim.snapshot().hitstopFramesRemaining)step();
  sim.stepFrame([{direction:'N',buttons:new Set(['1','2'])},n]);wait('air-grab');
});

it('mostra os command grabs como especiais e com suas sequências completas', async () => {
  const { fighterMoveList, filterMoveList } = await import('../training/MoveList');
  const { moveInputLabel } = await import('../ui/combatLabels');
  const entries = fighterMoveList(sm0g);
  const expected: Record<string,string> = {
    'grab-headbutt':'d,df,f,1', 'grab-slam':'d,df,f,2', 'grab-low':'d,db,b,3',
    'grab-launcher':'d,db,b,2', 'grab-throw':'b,db,d,df,f,2', 'air-grab':'no ar + 1+2',
  };
  for (const [id, notation] of Object.entries(expected)) {
    const entry = entries.find(candidate => candidate.id === id)!;
    expect(entry.notation).toBe(notation);
    expect(entry.categories).toEqual(['special']);
    expect(moveInputLabel(entry.move!)).toBe(notation);
    expect(filterMoveList(entries, 'special', '').some(candidate => candidate.id === id)).toBe(true);
    expect(filterMoveList(entries, 'throw', '').some(candidate => candidate.id === id)).toBe(false);
  }
  expect(moveInputLabel(sm0g.moves.find(move => move.id === 'hammer-punch')!)).toBe('d,df,f,1+2');
});

it('mantém o launcher em contato durante toda a pausa antes de lançar a vítima', () => {
  const sim = new Simulation(createGameConfig(1024,576), [sm0g, bob], {training:true, initialDistance:65});
  const n:FrameInput={direction:'N',buttons:new Set()};
  const step=(direction:FrameInput['direction']='N',button?:'2')=>sim.stepFrame([{direction,buttons:new Set(button?[button]:[])},n]);
  step('D'); step('DB'); step('B','2');
  for(let i=0;i<80 && !sim.snapshot().hitEvents.some(event=>event.moveId==='grab-launcher');i++) step();
  const paused=sim.snapshot();
  expect(paused.hitEvents.some(event=>event.moveId==='grab-launcher')).toBe(true);
  const ticks=paused.hitstopFramesRemaining;
  expect(ticks).toBeGreaterThan(0);
  for(let i=0;i<ticks-1;i++) {
    step();
    expect(sim.snapshot().characters[1]).toMatchObject({grounded:true,y:paused.characters[1].y});
  }
  step();
  expect(sim.snapshot().characters[1].grounded).toBe(false);
  expect(sim.snapshot().characters[1].verticalVelocity).toBeLessThan(0);
});

it('captura antes da cabeçada e aplica o dano apenas depois da espera', () => {
  const sim=new Simulation(createGameConfig(1024,576),[sm0g,bob],{training:true,initialDistance:65});
  const n:FrameInput={direction:'N',buttons:new Set()};
  const step=(direction:FrameInput['direction']='N',button?:'1')=>sim.stepFrame([{direction,buttons:new Set(button?[button]:[])},n]);
  step('D');step('DF');step('F','1');
  for(let i=0;i<80 && !sim.snapshot().hitEvents.some(e=>e.moveId==='grab-headbutt');i++)step();
  expect(sim.snapshot().characters[1].health).toBe(bob.maxHealth);
  while(sim.snapshot().hitstopFramesRemaining)step();
  for(let i=0;i<9;i++){step();expect(sim.snapshot().characters[1].health).toBe(bob.maxHealth);}
  step();expect(sim.snapshot().characters[1].health).toBe(bob.maxHealth-dmg('grab-headbutt'));
});

it('anda mais devagar para trás e nunca inicia dash', () => {
  expect(sm0g.movement.backwardWalkSpeed).toBeLessThan(sm0g.movement.walkSpeed);
  for (const direction of ['F','B'] as const) {
    const sim=new Simulation(createGameConfig(2200,700),[sm0g,bob],{training:true,initialDistance:900});
    const n:FrameInput={direction:'N',buttons:new Set()}; const d:FrameInput={direction,buttons:new Set()};
    sim.stepFrame([d,n]);sim.stepFrame([n,n]);sim.stepFrame([d,n]);
    expect(sim.snapshot().characters[0].mode).not.toBe('dashing');
    sim.stepFrame([{...n,dash:direction},n]);expect(sim.snapshot().characters[0].mode).not.toBe('dashing');
  }
});

it('mantém uma única pose agachada e a guarda durante bloqueio', () => {
  const state=new Simulation(createGameConfig(1024,576),[sm0g,bob]).snapshot().characters[0];
  for(const frame of [0,6,20,60]) expect(getSm0gPose({...state,mode:'crouching',crouching:true},frame)).toEqual({name:'crouch',drawing:3});
  for(const mode of ['blocking','blockstun'] as const) for(const frame of [0,6,20])
    expect(getSm0gPose({...state,mode},frame)).toEqual({name:'guard',drawing:5});
});

it('usa a reação de agarrado em todos os lutadores mesmo no ar ou caídos', async () => {
  const { texas }=await import('../engine/data/fighters/texas');
  const { getBobSpritePose }=await import('../rendering/animations/bobSprites');
  const { getTexasSpritePose }=await import('../rendering/animations/texasSprites');
  for (const fighter of [sm0g,bob,texas]) {
    const state=new Simulation(createGameConfig(1024,576),[fighter,bob]).snapshot().characters[0];
    for(const mode of ['hitstun','knockdown'] as const) {
      const victim={...state,mode,grounded:false,commandGrabbed:true,grabbedStartedFrame:100};
      if(fighter.id==='sm0g') expect(getSm0gPose(victim,104).name).toBe('grabbed');
      if(fighter.id==='bob') expect(getBobSpritePose(victim,104)?.texture).toBe('bob-grabbed');
      if(fighter.id==='texas') expect(getTexasSpritePose(victim,104)?.texture).toBe('texas-grabbed');
    }
  }
});

it('mantém a preparação e o impacto da cabeçada e do agarrão ao chão por mais tempo', () => {
  const state=new Simulation(createGameConfig(1024,576),[sm0g,bob]).snapshot().characters[0];
  for (const [id,button] of [['grab-headbutt','1'],['grab-slam','2']] as const) {
    const move=sm0g.moves.find(m=>m.id===id)!;
    const at=(elapsedFrames:number)=>getSm0gPose({...state,mode:'active',attack:{moveId:id,buttons:[button],elapsedFrames,hasHit:true}},0).drawing;
    expect([at(move.startup+9),at(move.startup+10),at(move.startup+15),at(move.startup+16),at(move.startup+23)]).toEqual([2,3,3,4,4]);
  }
});

it('provoca mais devagar usando todos os quadros', () => {
  const sim=new Simulation(createGameConfig(1024,576),[sm0g,bob],{training:true,initialDistance:400});
  const n:FrameInput={direction:'N',buttons:new Set()};
  sim.stepFrame([{...n,taunt:true},n]);
  const start=sim.snapshot().characters[0].tauntStartedFrame!;
  expect(start).toBeDefined();
  for(let i=0;i<120;i++) {
    const state=sim.snapshot().characters[0];
    if (state.tauntStartedFrame!==undefined) {
      const pose=getSm0gPose(state,sim.snapshot().frame);
      expect(['taunt-enter','taunt','taunt-exit']).toContain(pose.name);expect(pose.drawing).toBeGreaterThanOrEqual(0);expect(pose.drawing).toBeLessThanOrEqual(5);
    }
    sim.stepFrame([n,n]);
  }
  expect(sim.snapshot().characters[0].tauntStartedFrame).toBeUndefined();
});

it('ativa a ultimate pelo atalho universal, agarra mesmo com guarda e lança para cima', () => {
  const sim=new Simulation(createGameConfig(1024,576),[sm0g,bob],{training:true,initialDistance:65});
  sim.fillTrainingRage();
  const n:FrameInput={direction:'N',buttons:new Set()}; const guard:FrameInput={direction:'B',buttons:new Set()};
  sim.stepFrame([{...n,ultimate:true},guard]);
  expect(sim.snapshot().ultimateActivation?.ownerIds).toContain('player-1');
  expect(sim.snapshot().ultimateActivation?.remainingFrames).toBe(74);
  for(let i=0;i<250 && !sim.snapshot().hitEvents.some(e=>e.moveId==='ultimate-grab');i++) sim.stepFrame([n,guard]);
  expect(sim.snapshot().hitEvents).toContainEqual(expect.objectContaining({moveId:'ultimate-grab',outcome:'hit'}));
  const healthAtCapture = sim.snapshot().characters[1].health;
  expect(healthAtCapture).toBe(bob.maxHealth);
  const comboDamage = () => sim.snapshot().comboHistory.filter(combo => combo.attackerId === 'player-1').reduce((total, combo) => total + combo.damage, 0);
  expect(comboDamage()).toBe(0);
  while(sim.snapshot().hitstopFramesRemaining) sim.stepFrame([n,guard]);
  for (let i=0;i<SM0G_ULTIMATE_HOLD_FRAMES - 1;i++) {
    expect(sim.snapshot().characters[1].commandGrabbed).toBe(true);
    expect(hiddenBySm0gUltimate(sim.snapshot().characters[1], sim.snapshot().characters[0])).toBe(true);
    const attacker = sim.snapshot().characters[0];
    const age = attacker.attack!.elapsedFrames - (attacker.attack!.startupFrames ?? 20);
    expect(getSm0gPose(attacker, sim.snapshot().frame).drawing).toBe(age < SM0G_ULTIMATE_SPIN_FRAMES ? 2 + Math.floor(age / 4) % 3 : 5);
    sim.stepFrame([n,guard]);
  }
  sim.stepFrame([n,guard]);
  expect(sim.snapshot().characters[1].verticalVelocity).toBeLessThan(0);
  expect(sim.snapshot().characters[1].spinStartedFrame).toBeDefined();
  expect(hiddenBySm0gUltimate(sim.snapshot().characters[1], sim.snapshot().characters[0])).toBe(false);
  let highestY = sim.snapshot().characters[1].y;
  let flightFrames = 0;
  while (sim.snapshot().characters[1].ultimateImpactFrame === undefined && flightFrames < 210) {
    expect(sim.snapshot().characters[1].health).toBe(healthAtCapture);
    sim.stepFrame([n, n]);
    highestY = Math.min(highestY, sim.snapshot().characters[1].y);
    flightFrames++;
  }
  expect(highestY).toBeLessThan(0);
  expect(comboDamage()).toBe(dmg('ultimate-grab'));
  expect(flightFrames).toBeGreaterThanOrEqual(118);
  expect(flightFrames).toBeLessThanOrEqual(122);
  expect(sim.snapshot().characters[1].health).toBe(healthAtCapture - dmg('ultimate-grab'));
  expect(sim.snapshot().characters[1].grounded).toBe(false);
  expect(sim.snapshot().characters[1].verticalVelocity).toBeLessThan(0);
  for (let i=0;i<40 && !sim.snapshot().characters[1].grounded;i++) sim.stepFrame([n,n]);
  expect(sim.snapshot().characters[1].grounded).toBe(true);
  expect(sim.snapshot().characters[1].health).toBe(healthAtCapture - dmg('ultimate-grab'));
  expect(sim.snapshot().characters[1].mode).toBe('knockdown');
  for (let i=0;i<60;i++) { expect(sim.snapshot().characters[1].remainingStateFrames).toBeGreaterThan(12); sim.stepFrame([n,n]); }
  expect(sim.snapshot().characters[1].spinStartedFrame).toBeUndefined();
});

it('preserva a duração maior quando ultimates diferentes começam simultaneamente', () => {
  const sim = new Simulation(createGameConfig(1024,576), [sm0g, bob], {training:true, initialDistance:400});
  sim.fillTrainingRage();
  const ultimate: FrameInput = {direction:'N', buttons:new Set(), ultimate:true};
  sim.stepFrame([ultimate, ultimate]);
  expect(sim.snapshot().ultimateActivation).toMatchObject({ownerIds:['player-1', 'player-2'], remainingFrames:149});
});

it('faz a vítima girar junto com as poses da ultimate e alternar a profundidade', () => {
  const [actor, victim] = new Simulation(createGameConfig(1024,576), [sm0g, bob]).snapshot().characters;
  const move = sm0g.moves.find(candidate => candidate.id === 'ultimate-grab')!;
  const at = (age:number) => sm0gCapturePose({...victim, commandGrabbed:true}, {...actor,
    attack:{moveId:move.id, buttons:[], elapsedFrames:move.startup + age, hasHit:true}});
  const front = at(0), side = at(2), back = at(9), complete = at(12);
  expect(front.captureSpin?.phase).toBe(0);
  expect(side.x).not.toBeCloseTo(front.x);
  expect(back.captureSpin?.depth).toBe(9);
  expect(complete.x).toBeCloseTo(front.x);
});

it('só inicia o nocaute da ultimate no primeiro impacto no chão', () => {
  const target = {...bob, maxHealth:200};
  const sim = new Simulation(createGameConfig(1024,576), [sm0g, target], {initialDistance:65});
  (sim as unknown as {characters:[{rage:number}, unknown]}).characters[0].rage = sm0g.rage!.maximum;
  const neutral:FrameInput = {direction:'N', buttons:new Set()};
  sim.stepFrame([{...neutral, ultimate:true}, neutral]);
  for (let i=0; i<450 && sim.snapshot().characters[1].ultimateImpactFrame === undefined; i++) {
    expect(sim.snapshot().characters[1].health).toBe(200);
    expect(sim.snapshot().knockoutStartedAt).toBeUndefined();
    sim.stepFrame([neutral,neutral]);
  }
  expect(sim.snapshot().characters[1].ultimateImpactFrame).toBeDefined();
  expect(sim.snapshot().characters[1].health).toBe(0);
  expect(sim.snapshot().knockoutStartedAt).toBeDefined();
});

it.each(['left','right'] as const)('apresenta a vítima do agarrão ao chão acompanhando as mãos para %s', facing => {
  const [sm0gState, victim] = new Simulation(createGameConfig(1024,576), [sm0g, bob]).snapshot().characters;
  const move = sm0g.moves.find(candidate => candidate.id === 'grab-slam')!;
  const attacker = { ...sm0gState, facing, attack: { moveId:move.id, buttons:['2'] as const, elapsedFrames:move.startup, hasHit:true } };
  const grabbed = { ...victim, commandGrabbed:true, sm0gGrabReaction:{ moveId:move.id, startedFrame:0, startedLying:false } };
  const low = sm0gCapturePose(grabbed, attacker);
  const high = sm0gCapturePose(grabbed, { ...attacker, attack:{...attacker.attack, elapsedFrames:move.startup + 4} });
  expect(high.y).toBeLessThan(low.y);
  expect(Math.sign(high.x - attacker.x)).toBe(facing === 'right' ? 1 : -1);
  expect(sm0gCapturePose(grabbed, { ...attacker, attack:{...attacker.attack, elapsedFrames:move.startup + 16} })).toBe(grabbed);
});

it('mantém a captura no terceiro quadro antes de causar o impacto ao chão', () => {
  const sim=new Simulation(createGameConfig(1024,576),[sm0g,bob],{training:true,initialDistance:65});
  const n:FrameInput={direction:'N',buttons:new Set()};
  const step=(direction:FrameInput['direction']='N',button?:'2')=>sim.stepFrame([{direction,buttons:new Set(button?[button]:[])},n]);
  step('D');step('DF');step('F','2');
  for(let i=0;i<80 && !sim.snapshot().hitEvents.some(e=>e.moveId==='grab-slam');i++)step();
  expect(sim.snapshot().hitEvents.some(e=>e.moveId==='grab-slam')).toBe(true);
  expect(sim.snapshot().characters[1].health).toBe(bob.maxHealth);
  while(sim.snapshot().hitstopFramesRemaining)step();
  for(let i=0;i<9;i++){step();expect(sim.snapshot().characters[1].health).toBe(bob.maxHealth);expect(sim.snapshot().characters[1].mode).not.toBe('knockdown');}
  step();expect(sim.snapshot().characters[1].health).toBe(bob.maxHealth-dmg('grab-slam'));expect(sim.snapshot().characters[1].mode).toBe('knockdown');
});

it('mostra o puxão para cima e o arremesso no quadro em que a vítima sai do chão', () => {
  for (const [id, keys] of [['grab-launcher', ['D', 'DB', 'B']], ['grab-throw', ['B', 'DB', 'D', 'DF', 'F']]] as const) {
    const sim = new Simulation(createGameConfig(1024, 576), [sm0g, bob], { training: true, initialDistance: 65 });
    const n: FrameInput = { direction: 'N', buttons: new Set() };
    keys.forEach((direction, index) => sim.stepFrame([{ direction, buttons: new Set(index === keys.length - 1 ? ['2'] : []) }, n]));
    const floor = sim.snapshot().characters[1].y;
    let before = -1, lifted = false;
    for (let i = 0; i < 100 && !lifted; i++) {
      sim.stepFrame([n, n]);
      const [attacker, target] = sim.snapshot().characters;
      lifted = target.y < floor;
      const pose = getSm0gPose(attacker, sim.snapshot().frame);
      if (lifted) { expect(pose, id).toEqual({ name: id, drawing: 4 }); expect(before, id).toBe(3); }
      else if (attacker.attack?.hasHit) before = pose.drawing;
    }
    expect(lifted, id).toBe(true);
  }
});

it.each(['left','right'] as const)('mantém o agarrado nas mãos e a fumaça no braço em cada quadro da cabeçada para %s', facing => {
  const [sm0gState, victim] = new Simulation(createGameConfig(1024,576), [sm0g, bob]).snapshot().characters;
  const move = sm0g.moves.find(candidate => candidate.id === 'grab-headbutt')!;
  for (const age of [4, 9]) {
    const attacker = { ...sm0gState, facing, attack: { moveId:move.id, buttons:['1'] as const, elapsedFrames:move.startup + age, hasHit:true } };
    const target = { ...victim, commandGrabbed:true, sm0gGrabReaction:{ moveId:move.id, startedFrame:0, startedLying:false } };
    const held = sm0gCapturePose(target, attacker);
    expect(held.x, `x ${age}`).toBe(target.x);
    expect(held.y, `y ${age}`).toBe(target.y);
    expect(held.grounded, `chão ${age}`).toBe(target.grounded);
  }
  const smoke = sm0gEffects({ ...sm0gState, facing, attack: { moveId:'hammer-punch', buttons:['3'] as const, elapsedFrames:sm0g.moves.find(candidate => candidate.id === 'hammer-punch')!.startup + 2, hasHit:false } });
  expect(smoke.map(effect => effect.name)).toEqual(['hammer-punch']);
  const mirrored = sm0gEffects({ ...sm0gState, facing: facing === 'right' ? 'left' : 'right', attack: { moveId:'hammer-punch', buttons:['3'] as const, elapsedFrames:sm0g.moves.find(candidate => candidate.id === 'hammer-punch')!.startup + 2, hasHit:false } });
  expect(mirrored[0].x).toBeCloseTo(-smoke[0].x);
  expect(mirrored[0].y).toBeCloseTo(smoke[0].y);
});

it('o agarrão baixo é mais lento e o baixo, o arremesso e o agarrão ao chão seguem as mãos até soltar', () => {
  const [sm0gState, victim] = new Simulation(createGameConfig(1024,576), [sm0g, bob]).snapshot().characters;
  expect(sm0g.moves.find(candidate => candidate.id === 'grab-low')!.startup).toBeGreaterThan(30);
  for (const id of ['grab-low', 'grab-throw', 'grab-slam'] as const) {
    const move = sm0g.moves.find(candidate => candidate.id === id)!;
    const attacker = (age:number) => ({ ...sm0gState, attack: { moveId:id, buttons:['2'] as const, elapsedFrames:move.startup + age, hasHit:true } });
    const target = { ...victim, x:victim.x + 40, sm0gGrabReaction:{ moveId:id, startedFrame:0, startedLying:false } };
    const held = sm0gCapturePose(target, attacker(2));
    expect(held.x, id).not.toBe(target.x);
    expect(sm0gCapturePose(target, attacker(20)), id).toBe(target);
  }
});

it('a vítima da ultimate só é solta depois do último desenho e a ultimate errada mostra só a abertura e pune muito', () => {
  const [actor, victim] = new Simulation(createGameConfig(1024,576), [sm0g, bob]).snapshot().characters;
  const move = sm0g.moves.find(candidate => candidate.id === 'ultimate-grab')!;
  const at = (age:number) => sm0gCapturePose({...victim, commandGrabbed:true}, {...actor, attack:{moveId:move.id, buttons:[], elapsedFrames:move.startup + age, hasHit:true}});
  const spinning = at(SM0G_ULTIMATE_SPIN_FRAMES - 1), overhead = at(SM0G_ULTIMATE_SPIN_FRAMES + 1);
  expect(spinning.captureSpin).toBeDefined();
  const pose = (age:number) => getSm0gPose({...actor, attack:{moveId:move.id, buttons:[], elapsedFrames:move.startup + age, hasHit:true}}, 0);
  const lastDrawing = Array.from({ length: 12 }, (_, index) => pose(SM0G_ULTIMATE_SPIN_FRAMES - 2 + index)).filter(shown => shown.name === 'ultimate-grab' && shown.drawing === 5);
  expect(lastDrawing).toHaveLength(SM0G_ULTIMATE_LAST_FRAMES);
  expect(SM0G_ULTIMATE_LAST_FRAMES).toBe(6);
  expect(pose(SM0G_ULTIMATE_HOLD_FRAMES).name).toBe('idle');
  expect(overhead.captureSpin).toBeUndefined();
  expect(overhead.y).toBeLessThan(actor.y - 100);
  const miss = (elapsed:number) => getSm0gPose({...actor, attack:{moveId:move.id, buttons:[], elapsedFrames:elapsed, hasHit:false}}, 0);
  expect([miss(5), miss(move.startup + 1), miss(move.startup + 40)].map(pose => pose.drawing)).toEqual([0, 0, 1]);
  expect(move.recovery).toBe(60);
});

it('o SM0G-000 vira o rosto de um lado ao outro enquanto gira com a vítima na ultimate', () => {
  const [actor] = new Simulation(createGameConfig(1024,576), [sm0g, bob]).snapshot().characters;
  const move = sm0g.moves.find(candidate => candidate.id === 'ultimate-grab')!;
  const phase = (age:number, hasHit = true) => sm0gSpinPhase({...actor, attack:{moveId:move.id, buttons:[], elapsedFrames:move.startup + age, hasHit}});
  expect(phase(0)).toBe(0);
  expect(Math.cos(phase(6)!)).toBeLessThan(0);
  expect(Math.cos(phase(12)!)).toBeCloseTo(1);
  expect(phase(SM0G_ULTIMATE_SPIN_FRAMES)).toBeUndefined();
  expect(phase(3, false)).toBeUndefined();
});

describe('regras de combo do SM0G-000', () => {
  const setup = () => {
    const sim = new Simulation(createGameConfig(1024,576), [sm0g, bob], {training:true, initialDistance:65});
    const n: FrameInput = {direction:'N',buttons:new Set()};
    const press = (direction:FrameInput['direction'], ...buttons:('1'|'2'|'3'|'4')[]) => sim.stepFrame([{direction,buttons:new Set(buttons)}, n]);
    const idle = (frames = 1) => { for (let i=0;i<frames;i++) sim.stepFrame([n,n]); };
    const until = (id:string, limit = 80) => { for (let i=0;i<limit;i++) { idle(); if (sim.snapshot().hitEvents.some(event => event.moveId === id)) return true; } return false; };
    return { sim, n, press, idle, until };
  };
  const startable = (sim:Simulation, id:string) => (sim as unknown as { canStart(c:unknown, i:number, m:unknown): boolean })
    .canStart(sim.snapshot().characters[0], 0, sm0g.moves.find(move => move.id === id));

  it('a ultimate perde 80 de dano por golpe anterior no combo, até 160', () => {
    const { sim, press, idle, until } = setup();
    sim.fillTrainingRage();
    press('N','1'); expect(until('light-punch')).toBe(true);
    sim.stepFrame([{direction:'N',buttons:new Set(),ultimate:true}, {direction:'N',buttons:new Set()}]);
    for (let i=0;i<300 && !sim.snapshot().hitEvents.some(event => event.moveId === 'ultimate-grab'); i++) idle();
    const hit = sim.snapshot().hitEvents.find(event => event.moveId === 'ultimate-grab');
    expect(hit?.damage).toBe(sm0g.moves.find(move => move.id === 'ultimate-grab')!.damage - 80);
  });
  it('o soco duplo (1+2) só acerta uma vez por combo', () => {
    const { sim, press, idle, until } = setup();
    press('N','1','2'); expect(until('double-punch')).toBe(true);
    for (let i=0;i<40 && startable(sim, 'double-punch') === false;i++) idle();
    expect(startable(sim, 'double-punch')).toBe(false);
  });
  it('o chute forte só entra uma vez no combo, em pé ou agachado', () => {
    const { sim, press, idle, until } = setup();
    press('N','4'); expect(until('heavy-kick')).toBe(true);
    expect(sim.snapshot().comboHistory.some(combo => combo.active && combo.usedOnce?.includes('heavy-kick'))).toBe(true);
    for (let i=0;i<30 && sim.snapshot().comboHistory.some(combo => combo.active);i++) {
      for (const next of ['heavy-kick', 'crouch-heavy-kick']) expect(startable(sim, next), `${next} ${i}`).toBe(false);
      idle();
    }
  });
  it('depois de um golpe em pé no combo, nenhum golpe agachado começa', () => {
    const { sim, press, idle, until } = setup();
    press('N','2'); expect(until('heavy-punch')).toBe(true);
    expect(sim.snapshot().comboHistory.some(combo => combo.active && combo.usedStanding)).toBe(true);
    for (let i=0;i<20 && sim.snapshot().comboHistory.some(combo => combo.active);i++) {
      for (const next of ['crouch-punch', 'crouch-uppercut', 'crouch-light-kick', 'crouch-heavy-kick']) expect(startable(sim, next), `${next} ${i}`).toBe(false);
      idle();
    }
  });
  it('cada agarrão só entra uma vez por combo', () => {
    for (const move of sm0g.moves.filter(candidate => candidate.category === 'throw')) expect(move.oncePerCombo, move.id).toBeTruthy();
    const { sim, press, idle, until } = setup();
    press('D'); press('DF'); press('F','1'); expect(until('grab-headbutt')).toBe(true);
    expect(sim.snapshot().comboHistory.some(combo => combo.active && combo.usedOnce?.includes('grab-headbutt'))).toBe(true);
    for (let i=0;i<30 && sim.snapshot().comboHistory.some(combo => combo.active);i++) { expect(startable(sim, 'grab-headbutt'), `${i}`).toBe(false); idle(); }
  });
  it('o 1+2 é um golpe potente: nenhum soco forte ou chute forte depois dele, só antes', () => {
    const { sim, press, idle, until } = setup();
    press('N','1','2'); expect(until('double-punch')).toBe(true);
    expect(sim.snapshot().comboHistory.some(combo => combo.active && combo.usedPower)).toBe(true);
    for (let i=0;i<30 && sim.snapshot().comboHistory.some(combo => combo.active);i++) {
      for (const next of ['heavy-punch', 'heavy-kick', 'crouch-uppercut', 'crouch-heavy-kick']) expect(startable(sim, next), `${next} ${i}`).toBe(false);
      idle();
    }
  });
  it.each(['grab-low', 'crouch-uppercut'])('%s termina o combo: nada novo começa até a vítima se recuperar', id => {
    const { sim, press, idle, until } = setup();
    if (id === 'grab-low') { press('D'); press('DF'); press('F','2'); expect(until('grab-slam')).toBe(true); while (sim.snapshot().hitstopFramesRemaining) idle(); idle(10); press('D'); press('DB'); press('B','3'); } else press('D','2');
    expect(until(id)).toBe(true);
    let checked = 0;
    for (let i=0;i<80 && sim.snapshot().comboHistory.some(combo => combo.active);i++) { for (const next of ['light-punch', 'double-punch', 'grab-slam']) expect(startable(sim, next), `${next} ${i}`).toBe(false); checked++; idle(); }
    expect(checked).toBeGreaterThan(10);
  });
});

describe('ultimate, cabeçada e agarrão aéreo: tempos e dano', () => {
  const n: FrameInput = {direction:'N',buttons:new Set()};
  it('libera o SM0G-000 após o lançamento e protege a vítima até se levantar', () => {
    const sim = new Simulation(createGameConfig(1024,576), [sm0g, bob], {training:true, initialDistance:65});
    sim.fillTrainingRage(); sim.stepFrame([{...n, ultimate:true}, n]);
    for (let i=0;i<300 && !sim.snapshot().characters[1].spinStartedFrame;i++) sim.stepFrame([n,n]);
    for (let i=0;i<3;i++) sim.stepFrame([n,n]);
    expect(sim.snapshot().characters[0].attack).toBeUndefined();
    const x = sim.snapshot().characters[0].x;
    for (let i=0;i<12;i++) sim.stepFrame([{...n,direction:'F'},n]);
    expect(sim.snapshot().characters[0].x).toBeGreaterThan(x);
    for (let i=0;i<300 && sim.snapshot().characters[1].knockdownBy?.moveId === 'ultimate-grab';i++) {
      sim.stepFrame([{...n,buttons:new Set(['1'])},n]);
      expect(sim.snapshot().hitEvents.some(event => event.attackerId === 'player-1' && event.moveId !== 'ultimate-grab')).toBe(false);
    }
    expect(sim.snapshot().characters[1].knockdownBy).toBeUndefined();
  });
  it('a cabeçada atordoa de novo a partir do impacto, até depois de o SM0G-000 poder agir', () => {
    const sim = new Simulation(createGameConfig(1024,576), [sm0g, bob], {training:true, initialDistance:65});
    const press = (direction:FrameInput['direction'], ...buttons:('1'|'2')[]) => sim.stepFrame([{direction,buttons:new Set(buttons)}, n]);
    press('D'); press('DF'); press('F','1');
    for (let i=0;i<100 && !sim.snapshot().hitEvents.some(event => event.moveId === 'grab-headbutt');i++) sim.stepFrame([n,n]);
    let free = -1;
    for (let i=0;i<120 && free < 0;i++) { sim.stepFrame([n,n]); if (!sim.snapshot().characters[0].attack) free = i; }
    expect(free).toBeGreaterThan(0);
    const victim = sim.snapshot().characters[1];
    expect(victim.mode).toBe('hitstun');
    expect(victim.remainingStateFrames).toBeGreaterThan(3);
    expect(sim.snapshot().comboHistory.some(combo => combo.active)).toBe(true);
  });
  it('o dano do agarrão aéreo só conta quando o oponente chega ao chão', () => {
    const sim = new Simulation(createGameConfig(1024,576), [sm0g, bob], {training:true, initialDistance:65});
    sim.stepFrame([{direction:'U',buttons:new Set()}, {direction:'U',buttons:new Set()}]);
    sim.stepFrame([{direction:'N',buttons:new Set(['1','2'])}, n]);
    const comboDamage = () => sim.snapshot().comboHistory.filter(combo => combo.attackerId === 'player-1').reduce((total, combo) => total + combo.damage, 0);
    let hit = false;
    for (let i=0;i<60;i++) {
      sim.stepFrame([n,n]);
      const victim = sim.snapshot().characters[1];
      if (sim.snapshot().hitEvents.some(event => event.moveId === 'air-grab')) hit = true;
      if (hit && !victim.grounded) { expect(victim.health).toBe(bob.maxHealth); expect(comboDamage()).toBe(0); }
      if (hit && victim.grounded) break;
    }
    expect(hit).toBe(true);
    expect(sim.snapshot().characters[1].health).toBe(bob.maxHealth - dmg('air-grab'));
    expect(comboDamage()).toBe(dmg('air-grab'));
  });
});


it.each([0, 1])('chute forte alcança Bob agachado e respeita a guarda overhead, jogador %i', player => {
  for (const [direction, outcome] of [['D', 'hit'], ['DB', 'hit'], ['B', 'block']] as const) {
    const defs = player === 0 ? [sm0g, bob] as const : [bob, sm0g] as const;
    const sim = new Simulation(createGameConfig(1024, 576), defs, {training:true, initialDistance:65});
    const guard: FrameInput = {direction, buttons:new Set()};
    const neutral: FrameInput = {direction:'N', buttons:new Set()};
    const step = (attack: FrameInput) => sim.stepFrame(player === 0 ? [attack, guard] : [guard, attack]);
    step({direction:'N', buttons:new Set(['4'])});
    for (let tick=0; tick<80 && !sim.snapshot().hitEvents.length; tick++) step(neutral);
    expect(sim.snapshot().hitEvents[0]).toMatchObject({moveId:'heavy-kick', outcome});
  }
});


it('antecipa as reações aos quatro agarrões e mantém Texas em pé na cabeçada', () => {
  for (const fighter of [bob, texas]) {
    const target = new Simulation(createGameConfig(1024,576), [sm0g, fighter]).snapshot().characters[1];
    for (const moveId of ['grab-slam','grab-launcher','grab-low','grab-throw']) {
      const state = {...target, commandGrabbed:true, sm0gGrabReaction:{moveId, startedFrame:0, startedLying:false}};
      expect(sm0gReaction(state, 0)?.drawing).toBe(moveId === 'grab-slam' || moveId === 'grab-throw' ? 0 : moveId === 'grab-low' ? 1 : 2);
      if (moveId === 'grab-slam' || moveId === 'grab-low') expect(sm0gReaction(state, 2)?.drawing).toBe(moveId === 'grab-slam' ? 1 : 2);
    }
    {
      const state = {...target, commandGrabbed:true, sm0gGrabReaction:{moveId:'grab-headbutt', startedFrame:0, startedLying:false}};
      expect(sm0gReaction(state, 0)?.drawing).toBe(1);
      expect(sm0gReaction(state, 40)?.drawing).toBe(2);
    }
  }
});


it.each([
  ['grab-headbutt', ['D','DF','F'], '1'],
  ['grab-slam', ['D','DF','F'], '2'],
  ['grab-launcher', ['D','DB','B'], '2'],
  ['grab-throw', ['B','DB','D','DF','F'], '2'],
] as const)('%s congela os dois lutadores no contato antes de continuar', (moveId, directions, button) => {
  const sim = new Simulation(createGameConfig(1024,576), [sm0g, bob], {training:true, initialDistance:65});
  const n:FrameInput = {direction:'N',buttons:new Set()};
  directions.forEach((direction, index) => sim.stepFrame([{direction,buttons:new Set(index === directions.length - 1 ? [button] : [])},n]));
  for (let i=0;i<100 && !sim.snapshot().hitEvents.some(event => event.moveId === moveId);i++) sim.stepFrame([n,n]);
  const contact = sim.snapshot();
  expect(contact.hitEvents.some(event => event.moveId === moveId)).toBe(true);
  expect(contact.hitstopFramesRemaining).toBe(10);
  const pose = getSm0gPose(contact.characters[0], contact.frame);
  const reaction = sm0gReaction(contact.characters[1], contact.frame);
  for (let i=0;i<9;i++) {
    sim.stepFrame([n,n]);
    const paused = sim.snapshot();
    expect(paused.frame).toBe(contact.frame);
    expect(getSm0gPose(paused.characters[0], paused.frame)).toEqual(pose);
    expect(sm0gReaction(paused.characters[1], paused.frame)).toEqual(reaction);
  }
  sim.stepFrame([n,n]);
  if (moveId === 'grab-slam') expect(sm0gReaction(sim.snapshot().characters[1], sim.snapshot().frame)).toEqual(reaction);
  sim.stepFrame([n,n]);
  expect(sim.snapshot().frame).toBeGreaterThan(contact.frame);
  if (moveId === 'grab-slam') expect(sm0gReaction(sim.snapshot().characters[1], sim.snapshot().frame)?.drawing).toBe(reaction!.drawing + 1);
});


it.each(['left','right'] as const)('o arremesso puxa a vítima para trás junto à mão, virado para %s', facing => {
  const [base, victim] = new Simulation(createGameConfig(1024,576), [sm0g, bob]).snapshot().characters;
  const move = sm0g.moves.find(candidate => candidate.id === 'grab-throw')!;
  const sign = facing === 'right' ? 1 : -1;
  const actor = {...base, facing, attack:{moveId:move.id, buttons:['2'] as const, elapsedFrames:move.startup + 4, hasHit:true}};
  const target = {...victim, x:base.x + sign * 80, sm0gGrabReaction:{moveId:move.id, startedFrame:0, startedLying:false}};
  const hand = sm0gHand(actor, 'grab-throw', 3)!;
  const shown = sm0gCapturePose(target, actor);
  expect((shown.x - actor.x) * sign).toBeLessThan(0);
  expect(shown.x).toBeCloseTo(actor.x + hand.x + sign * 35);
});

it.each([['grab-low', 2, 3], ['grab-slam', 1, 2], ['grab-throw', 1, 2]] as const)('%s usa o desenho correto no contato e avança depois', (moveId, contact, next) => {
  const state = new Simulation(createGameConfig(1024,576), [sm0g, bob]).snapshot().characters[0];
  const move = sm0g.moves.find(candidate => candidate.id === moveId)!;
  const attack = {moveId, buttons:move.input.buttons, elapsedFrames:move.startup, hasHit:true};
  const before = {...attack, elapsedFrames:move.startup - 1, hasHit:false};
  expect(getSm0gPose({...state, attack:before}, 0)).toEqual({name:moveId, drawing:contact});
  expect(getSm0gInbetween({...state, attack:before}, 0)).toBeUndefined();
  expect(getSm0gPose({...state, attack}, 0)).toEqual({name:moveId, drawing:contact});
  expect(getSm0gInbetween({...state, attack}, 0)).toBeUndefined();
  expect(getSm0gPose({...state, attack:{...attack, elapsedFrames:move.startup + 1}}, 0)).toEqual({name:moveId, drawing:next});
});


it.each(['bob', 'texas'] as const)('reação de %s ao agarrão baixo deitado avança após a pausa', fighterId => {
  const fighter = fighterId === 'bob' ? bob : texas;
  const target = new Simulation(createGameConfig(1024,576), [sm0g, fighter]).snapshot().characters[1];
  const state = {...target, commandGrabbed:true, sm0gGrabReaction:{moveId:'grab-low', startedFrame:10, startedLying:true}};
  expect(sm0gReaction(state, 11)?.drawing).toBe(0);
  expect(sm0gReaction(state, 12)?.drawing).toBe(1);
});

it.each([[0, '1'], [1, '1'], [0, '4'], [1, '4']] as const)('cabeçada permite golpe manual após a recuperação no mesmo combo, jogador %i botão %s', (player, button) => {
  const defs = player === 0 ? [sm0g, bob] as const : [bob, sm0g] as const;
  const sim = new Simulation(createGameConfig(1024,576), defs, {training:true, initialDistance:65});
  const neutral:FrameInput = {direction:'N',buttons:new Set()};
  const step = (input:FrameInput = neutral) => sim.stepFrame(player === 0 ? [input, neutral] : [neutral, input]);
  for (const direction of ['D','DF','F'] as const) step({direction, buttons:new Set(direction === 'F' ? ['1'] : [])});
  for (let i=0;i<100 && !sim.snapshot().hitEvents.some(hit => hit.moveId === 'grab-headbutt');i++) step();
  expect(sim.snapshot().hitEvents.some(hit => hit.moveId === 'grab-headbutt')).toBe(true);
  for (let i=0;i<150 && sim.snapshot().characters[player].attack;i++) step();
  step({direction:'N',buttons:new Set([button])});
  let landed = false;
  for (let i=0;i<40;i++) { step(); if (sim.snapshot().hitEvents.some(hit => hit.moveId === (button === '1' ? 'light-punch' : 'heavy-kick'))) { landed = true; break; } }
  expect(landed).toBe(true);
  const combos = sim.snapshot().comboHistory.filter(combo => combo.attackerId === `player-${player + 1}`);
  expect(combos).toHaveLength(1);
  expect(combos[0].hits).toBe(2);
});

it.each([bob, texas])('captura de $name no agarrão ao chão começa em pé e só levanta após a pausa', fighter => {
  const sim = new Simulation(createGameConfig(1024,576), [sm0g, fighter], {training:true, initialDistance:65});
  const n:FrameInput = {direction:'N',buttons:new Set()};
  for (const direction of ['D','DF','F'] as const) sim.stepFrame([{direction,buttons:new Set(direction === 'F' ? ['2'] : [])},n]);
  for (let i=0;i<100 && !sim.snapshot().hitEvents.some(hit => hit.moveId === 'grab-slam');i++) sim.stepFrame([n,n]);
  const contact = sim.snapshot(), [actor, victim] = contact.characters;
  expect(sm0gReaction(victim,contact.frame)?.drawing).toBe(0);
  expect(sm0gCapturePose(victim,actor).y).toBe(victim.y);
  while (sim.snapshot().hitstopFramesRemaining) sim.stepFrame([n,n]);
  sim.stepFrame([n,n]);
  const resumed = sim.snapshot();
  expect(sm0gReaction(resumed.characters[1],resumed.frame)?.drawing).toBe(1);
  expect(sm0gCapturePose(resumed.characters[1],resumed.characters[0]).y).toBeLessThan(victim.y);
});

it.each([bob, texas])('$name usa as reações normais após o impacto no chão e o lançamento aéreo', fighter => {
  const target = new Simulation(createGameConfig(1024,576), [sm0g, fighter]).snapshot().characters[1];
  const down = {...target, grounded:true, mode:'knockdown' as const, remainingStateFrames:36, commandGrabbed:undefined,
    sm0gGrabReaction:{moveId:'grab-slam', startedFrame:0, startedLying:false}};
  expect(sm0gReaction(down, 30)).toEqual({name:fighter.id === 'texas' ? 'fall-landing' : 'fall', drawing:5});
  const air = {...target, grounded:false, mode:'hitstun' as const, commandGrabbed:true,
    sm0gGrabReaction:{moveId:'grab-launcher', startedFrame:0, startedLying:false}};
  expect(sm0gReaction(air, 12)?.name).toBe('air-hurt');
  expect(sm0gReaction({...down, remainingStateFrames:12}, 30)).toBeUndefined();
});

it.each(['air-grab', 'ultimate-grab', 'grab-launcher'])('Texas usa a queda corrigida após a soltura de %s', moveId => {
  const target = new Simulation(createGameConfig(1024,576), [sm0g, texas]).snapshot().characters[1];
  const down = {...target, grounded:true, mode:'knockdown' as const, remainingStateFrames:36, commandGrabbed:undefined,
    sm0gGrabReaction:{moveId, startedFrame:0, startedLying:false}};
  expect(sm0gReaction(down, 30)).toEqual({name:'fall-landing', drawing:5});
  expect(getTexasSpritePose(down, 30)).toMatchObject({texture:'texas-fall-landing', frame:5});
});

it.each([bob, texas])('$name mostra captura, reação aérea e queda na sequência do arremesso distante', fighter => {
  const sim = new Simulation(createGameConfig(1024,576), [sm0g, fighter], {training:true, initialDistance:65});
  const n:FrameInput = {direction:'N',buttons:new Set()};
  for (const direction of ['B','DB','D','DF','F'] as const) sim.stepFrame([{direction,buttons:new Set(direction === 'F' ? ['2'] : [])},n]);
  for (let i=0;i<100 && !sim.snapshot().hitEvents.some(hit => hit.moveId === 'grab-throw');i++) sim.stepFrame([n,n]);
  let snap = sim.snapshot();
  expect(snap.hitEvents.some(hit => hit.moveId === 'grab-throw')).toBe(true);
  expect(sm0gReaction(snap.characters[1],snap.frame)?.name).toBe('sm0g-reaction-grab-throw');
  while (sim.snapshot().hitstopFramesRemaining) sim.stepFrame([n,n]);
  snap = sim.snapshot();
  expect(snap.characters[1].throwPull).toBeDefined();
  expect(sm0gReaction(snap.characters[1],snap.frame)?.name).toBe('sm0g-reaction-grab-throw');
  for (let i=0;i<20 && sim.snapshot().characters[1].grounded;i++) sim.stepFrame([n,n]);
  snap = sim.snapshot();
  expect(snap.characters[1].grounded).toBe(false);
  expect(sm0gReaction(snap.characters[1],snap.frame)?.name).toBe('air-hurt');
  for (let i=0;i<150 && !sim.snapshot().characters[1].grounded;i++) sim.stepFrame([n,n]);
  snap = sim.snapshot();
  expect(snap.characters[1].grounded).toBe(true);
  expect(sm0gReaction(snap.characters[1],snap.frame)).toEqual({name:fighter.id === 'texas' ? 'fall-landing' : 'fall', drawing:5});
});


it.each([0,1])('agarrão baixo não acerta adversário em pé ou agachado, jogador %i', player => {
  for (const direction of ['N','D'] as const) {
    const defs = player === 0 ? [sm0g, bob] as const : [bob, sm0g] as const;
    const sim = new Simulation(createGameConfig(1024,576), defs, {training:true, initialDistance:65});
    const target:FrameInput = {direction,buttons:new Set()};
    const step = (input:FrameInput) => sim.stepFrame(player === 0 ? [input,target] : [target,input]);
    for (const d of ['D','DB','B'] as const) step({direction:d,buttons:new Set(d === 'B' ? ['3'] : [])});
    let hit = false;
    for (let i=0;i<80;i++) { step({direction:'N',buttons:new Set()}); hit ||= sim.snapshot().hitEvents.some(event => event.moveId === 'grab-low'); }
    expect(hit).toBe(false);
  }
});

it('seleciona perfect block, combo breakers e recuperação aérea do SM0G-000', () => {
  const state = new Simulation(createGameConfig(1024,576), [sm0g, bob]).snapshot().characters[0];
  expect(getSm0gPose({...state, mode:'blockstun', perfectBlockStartedFrame:10}, 12).name).toBe('perfect-block');
  expect(getSm0gPose({...state, rageAnimation:{kind:'breaker', startedFrame:10, airborne:false}}, 14).name).toBe('combo-breaker');
  expect(getSm0gPose({...state, grounded:false, mode:'airborne', rageAnimation:{kind:'breaker', startedFrame:10, airborne:true}}, 14).name).toBe('combo-breaker-air');
  expect(getSm0gPose({...state, grounded:false, mode:'airborne', rageAnimation:{kind:'air-recovery', startedFrame:10, airborne:true}}, 14).name).toBe('air-recovery');
  expect(getSm0gPose({...state, mode:'knockdown', remainingStateFrames:30}, 14)).toEqual({name:'fall',drawing:5});
});

it('mostra a reação de captura no agarrão normal antes de voltar à queda', () => {
  const state = new Simulation(createGameConfig(1024,576), [sm0g, bob]).snapshot().characters[0];
  const captured = {...state, mode:'knockdown' as const, grounded:true, remainingStateFrames:30, grabbedStartedFrame:10};
  expect(getSm0gPose(captured, 10).name).toBe('grabbed');
  expect(getSm0gPose(captured, 25).name).toBe('grabbed');
  expect(getSm0gPose(captured, 26).name).toBe('fall');
});

it.each([bob, texas])('mostra a captura do SM0G-000 no agarrão normal de $id', fighter => {
  const sim = new Simulation(createGameConfig(1024, 576), [fighter, sm0g], {training:true, initialDistance:65});
  const neutral: FrameInput = {direction:'N', buttons:new Set()};
  sim.stepFrame([{direction:'N', buttons:new Set(['1','3'])}, neutral]);
  let captured = false;
  for (let i = 0; i < 100; i++) {
    sim.stepFrame([neutral, neutral]);
    const snapshot = sim.snapshot(), target = snapshot.characters[1];
    if (target.grabbedStartedFrame !== undefined && snapshot.frame - target.grabbedStartedFrame < 16) {
      captured = true;
      expect(getSm0gPose(target, snapshot.frame).name).toBe('grabbed');
    }
  }
  expect(captured).toBe(true);
});

it.each([0,1])('agarrão normal 1+3 do SM0G-000 derruba e arremessa para frente, jogador %i', player => {
  const defs = player === 0 ? [sm0g, bob] as const : [bob, sm0g] as const;
  const sim = new Simulation(createGameConfig(1024,576), defs, {training:true, initialDistance:65});
  const n:FrameInput = {direction:'N',buttons:new Set()};
  const step = (own:FrameInput = n) => sim.stepFrame(player === 0 ? [own,n] : [n,own]);
  step({direction:'N',buttons:new Set(['1','3'])});
  for (let i=0;i<100 && !sim.snapshot().hitEvents.some(e => e.moveId === 'throw-13');i++) step();
  expect(sim.snapshot().hitEvents.some(e => e.moveId === 'throw-13')).toBe(true);
  for (let i=0;i<30 && !sim.snapshot().characters[1-player].throwFlight;i++) step();
  expect(sim.snapshot().characters[1-player].throwFlight).toBe(true);
  expect(sim.snapshot().characters[1-player].mode).toBe('knockdown');
});

it('não repete soco forte mantido após o quique do arremesso distante', () => {
  const sim = new Simulation(createGameConfig(1024, 576), [sm0g, bob], { training:true, wall:true, initialDistance:65 });
  const n: FrameInput = { direction:'N', buttons:new Set() };
  const step = (direction:FrameInput['direction'], held = false) => sim.stepFrame([{ direction, buttons:new Set(held ? ['2'] : []) }, n]);
  for (const direction of ['B','DB','D','DF'] as const) step(direction);
  step('F', true);
  let bounced = false, extraPunch = false;
  for (let i = 0; i < 240; i++) {
    step('N', true);
    const snapshot = sim.snapshot();
    bounced ||= Boolean(snapshot.characters[1].wallBounceEffect);
    extraPunch ||= snapshot.characters[0].attack?.moveId === 'heavy-punch';
  }
  expect(bounced).toBe(true);
  expect(extraPunch).toBe(false);
  step('N');
  for (let i = 0; i < 5; i++) step('N', true);
  expect(sim.snapshot().characters[0].attack?.moveId).toBe('heavy-punch');
});

it('o vapor do agarrão baixo só começa depois da pausa de contato', () => {
  const state = new Simulation(createGameConfig(1024,576), [sm0g, bob]).snapshot().characters[0];
  const move = sm0g.moves.find(candidate => candidate.id === 'grab-low')!;
  const attack = {moveId:move.id, buttons:['3' as const], elapsedFrames:move.startup, hasHit:true};
  expect(sm0gEffects({...state, attack}, undefined, true)).toEqual([]);
  expect(sm0gEffects({...state, attack}, undefined, false).map(effect=>effect.name)).toEqual(['grab-low']);
  const launcher = sm0g.moves.find(candidate => candidate.id === 'grab-launcher')!;
  expect(sm0gEffects({...state, attack:{...attack, moveId:launcher.id, elapsedFrames:launcher.startup + 4}})).toEqual([]);
  const throwMove = sm0g.moves.find(candidate => candidate.id === 'grab-throw')!;
  expect(sm0gEffects({...state, attack:{...attack, moveId:throwMove.id, elapsedFrames:throwMove.startup + 8}}).map(effect=>effect.name)).toEqual(['grab-throw']);
});

it.each(['right', 'left'] as const)('posiciona a mão do novo agarrão baixo no chão e a eleva para %s', facing => {
  const [actor, victim] = new Simulation(createGameConfig(1024, 576), [sm0g, bob]).snapshot().characters;
  const move = sm0g.moves.find(candidate => candidate.id === 'grab-low')!;
  const at = (age:number) => ({...actor, facing, attack:{moveId:move.id, buttons:['3' as const], elapsedFrames:move.startup + age, hasHit:true}});
  const low = sm0gHand(at(0), 'grab-low', 2)!;
  const raised = sm0gHand(at(2), 'grab-low', 3)!;
  expect(Math.abs(low.y)).toBeLessThan(10);
  expect(raised.y).toBeLessThan(low.y - 100);
  const target = {...victim, sm0gGrabReaction:{moveId:move.id,startedFrame:0,startedLying:true}};
  expect(sm0gCapturePose(target, at(2)).y).toBeLessThan(target.y);
});


it.each([bob,texas,sm0g])('impede ataques e defesa da vítima $name durante toda a ultimate', fighter => {
  const sim = new Simulation(createGameConfig(1024,576),[sm0g,fighter],{training:true,initialDistance:65});
  const n:FrameInput={direction:'N',buttons:new Set()};
  sim.fillTrainingRage(); sim.stepFrame([{...n,ultimate:true},n]);
  for(let i=0;i<250 && !sim.snapshot().characters[0].attack?.hasHit;i++) sim.stepFrame([n,n]);
  expect(sim.snapshot().characters[0].attack?.hasHit).toBe(true);
  let frames=0;
  for(let i=0;i<400;i++) {
    const target=sim.snapshot().characters[1];
    if (!target.knockdownBy && !target.commandGrabbed) break;
    sim.stepFrame([n,{direction:i%2?'B':'N',buttons:new Set(i%3?['1']:['2'])}]);
    const after=sim.snapshot().characters[1];
    if(after.knockdownBy?.moveId==='ultimate-grab' || after.commandGrabbed) {
      expect(after.attack, `frame ${i}`).toBeUndefined();
      expect(['blocking','blockstun']).not.toContain(after.mode);
      frames++;
    }
  }
  expect(frames).toBeGreaterThan(80);
});

it('quem anda contra o outro para, sem empurrá-lo', () => {
  const sim = new Simulation(createGameConfig(1024,576),[sm0g,bob],{training:true});
  const n:FrameInput={direction:'N',buttons:new Set()}, forward:FrameInput={direction:'F',buttons:new Set()};
  for (let i = 0; i < 400; i++) sim.stepFrame([forward, n]);
  const [first, second] = sim.snapshot().characters;
  const start = second.x;
  for (let i = 0; i < 60; i++) sim.stepFrame([forward, n]);
  expect(sim.snapshot().characters[1].x).toBe(start);
  expect(sim.snapshot().characters[0].x).toBeLessThan(start);
  expect(first.x).toBeLessThan(second.x);
});

it('mostra o SM0G-000 derrotado deitado ao fim do round, com o quadro visual congelado antes do pouso', () => {
  const sim = new Simulation(createGameConfig(1024,576), [bob, sm0g], {initialDistance:56});
  const target = sim.snapshot().characters[1];
  const landed = { ...target, mode:'knockdown' as const, grounded:true, remainingStateFrames:999, stateStartedFrame:Number.NEGATIVE_INFINITY,
    animationTransition:{ from:{ ...target, grounded:false }, startedFrame:60 } } as typeof target;
  expect(getSm0gPose(landed, 40)).toEqual({ name:'fall', drawing:5 });
});

it('abre combos: o soco em arco distante é seguido por um soco fraco que acerta, sem permitir soco forte (regra do 1+2)', () => {
  const run = (follow: '1' | '2') => {
    const sim = new Simulation(createGameConfig(1024,576), [sm0g, bob], {training:true, initialDistance:120});
    const n:FrameInput = {direction:'N',buttons:new Set()}, f:FrameInput = {direction:'F',buttons:new Set()};
    for (const input of [f, n, f, {direction:'F',buttons:new Set(['2'])} as FrameInput]) sim.stepFrame([input, n]);
    let contact = -1; const hits:string[] = [];
    for (let i = 0; i < 100; i++) {
      sim.stepFrame([contact >= 0 && i >= contact + 6 && i < contact + 8 ? {direction:'N',buttons:new Set([follow])} : n, n]);
      const snap = sim.snapshot();
      if (contact < 0 && snap.hitEvents.some(hit => hit.moveId === 'far-arc-punch')) contact = i;
      hits.push(...snap.hitEvents.map(hit => hit.moveId));
    }
    return hits;
  };
  expect(run('1')).toEqual(['far-arc-punch', 'light-punch']);
  expect(run('2')).toEqual(['far-arc-punch']);
});

it('o SM0G-000 derrotado no ar continua animando a queda depois do fim do round, com o relógio visual parado', () => {
  const sim = new Simulation(createGameConfig(1024,576), [bob, sm0g], {initialDistance:56});
  const target = sim.snapshot().characters[1];
  const falling = { ...target, mode:'airborne' as const, grounded:false, y:target.y - 200, verticalVelocity:-2, health:0,
    stateStartedFrame:0, hitReaction:{ level:'high', startedFrame:0 } as never };
  const drawings = [0, 4, 8, 12].map(ticks => getSm0gPose(settleAfterRound(falling, ticks, target.y, .8, true), 0).drawing);
  expect(drawings[3]).toBeGreaterThan(drawings[0]);
  expect(drawings).toEqual([...drawings].sort((a, b) => a - b));
});

it('o último soco do 1,1,1 deixa o alvo em hitstun mais longo que a recuperação, para o combo continuar', () => {
  const sim = new Simulation(createGameConfig(1024,576), [sm0g, bob], {training:true, initialDistance:50});
  const press:FrameInput = {direction:'N',buttons:new Set(['1'])}, n:FrameInput = {direction:'N',buttons:new Set()};
  const hits:{stun:number; advantage:number}[] = [];
  sim.stepFrame([press, n]);
  for (let i = 0; i < 120 && hits.length < 3; i++) {
    const a = sim.snapshot().characters[0];
    sim.stepFrame([!a.attack || (a.attack.hasHit && a.attack.elapsedFrames >= 2 && i % 6 === 0) ? press : n, n]);
    for (const hit of sim.snapshot().hitEvents) if (hit.outcome === 'hit') hits.push({stun:hit.defenderStunFrames, advantage:hit.frameAdvantage});
  }
  expect(hits).toHaveLength(3);
  expect(hits[2]).toEqual({stun:24, advantage:24 - 13});
  expect(hits[1].advantage).toBe(0);
});
