import { describe, expect, it } from 'vitest';
import { cowboy } from '../engine/data/fighters/cowboy';
import { shoto } from '../engine/data/fighters/shoto';
import { createGameConfig } from '../engine/data/gameConfig';
import { Simulation, volleyShotDamage } from '../engine/simulation/Simulation';
import type { AttackButton, Direction, FrameInput } from '../input/types';
import { contactHeight, createHitbox, createHurtbox, createHurtZones } from '../engine/collision/combatGeometry';
import { intersects } from '../engine/collision/intersects';
import { cowboySheetScale, getCowboySpriteLayers } from '../rendering/animations/cowboySprites';
import { COWBOY_GRAB_SHOTS } from '../engine/combat/cowboyGrab';

it.each([0,1])('reinicia a reação da vítima nos tiros do agarrão 2+4: jogador %i', player => {
  const sim = new Simulation(createGameConfig(1024,576),[cowboy,cowboy],{training:true,initialDistance:65});
  const step = (value:FrameInput = input()) => sim.stepFrame(player === 0 ? [value,input()] : [input(),value]);
  step({direction:'N',buttons:new Set(['2','4'])});
  const seen:number[] = [];
  for (let tick=0; tick<120; tick++) {
    step();
    const snapshot = sim.snapshot(), attacker = snapshot.characters[player], target = snapshot.characters[1-player];
    const confirmed = attacker.attack?.throwConfirmedFrame;
    if (confirmed === undefined || target.hitReaction?.startedFrame !== snapshot.frame - 1) continue;
    const age = target.hitReaction.startedFrame - confirmed;
    if (COWBOY_GRAB_SHOTS.some(shot => shot === age)) {
      seen.push(age);
      expect(getCowboySpriteLayers(target,snapshot.frame)[0].texture).toBe('cowboy-hurt');
    }
  }
  expect(seen).toEqual([...COWBOY_GRAB_SHOTS]);
});

it('divide a vulnerabilidade em cabeça, barriga e pernas sem mudar sua área total', () => {
  const state = new Simulation(createGameConfig(1024,576),[cowboy,cowboy]).snapshot().characters[0];
  for (const posture of [state, {...state,crouching:true}, {...state,grounded:false}]) {
    const box = createHurtbox(posture), zones = createHurtZones(posture);
    for (const level of ['high','mid','low'] as const) {
      const zone = zones[level];
      expect(contactHeight(posture,{ownerId:'p',attackId:'test',x:box.x,y:zone.y+zone.height/2-1,width:box.width,height:2})).toBe(level);
    }
    expect(zones.high.height + zones.mid.height + zones.low.height).toBeCloseTo(box.height);
  }
  expect(createHurtbox({...state,crouching:true}).width).toBeGreaterThan(createHurtbox(state).width);
  expect(createHurtbox({...state,grounded:false}).width).toBeGreaterThan(createHurtbox(state).width);
});

it.each([0,1])('dispara no limite mesmo mantendo o botão pressionado: jogador %i', player => {
  const defs = player === 0 ? [cowboy,shoto] as const : [shoto,cowboy] as const;
  const sim = new Simulation(createGameConfig(1024,576),defs,{training:true,initialDistance:100});
  const held = input('N','2');
  for (let tick=0;tick<145 && !sim.snapshot().hitEvents.length;tick++) sim.stepFrame(player===0?[held,input()]:[input(),held]);
  expect(sim.snapshot().hitEvents[0]).toMatchObject({moveId:'heavy-punch',outcome:'hit',damage:53});
});

it.each([0,1])('permite os três pisões defendidos sem reiniciar o combo: jogador %i', player => {
  const defs = player === 0 ? [cowboy,shoto] as const : [shoto,cowboy] as const;
  const sim = new Simulation(createGameConfig(1024,576),defs,{training:true,initialDistance:65});
  const step=(value:FrameInput=input())=>sim.stepFrame(player===0?[value,input('DB')]:[input('DB'),value]);
  for (let kick=0;kick<3;kick++) {
    step(input('N','3'));
    for(let tick=0;tick<60&&!sim.snapshot().hitEvents.length;tick++) step();
    expect(sim.snapshot().hitEvents[0]).toMatchObject({moveId:'light-kick',outcome:'block'});
    while(sim.snapshot().hitstopFramesRemaining)step();
  }
  const previous=sim.snapshot().characters[player].attack!.elapsedFrames;
  step(input('N','3'));
  expect(sim.snapshot().characters[player].attack!.elapsedFrames).toBeGreaterThan(previous);
});

const input = (direction: Direction = 'N', button?: AttackButton): FrameInput => ({ direction, buttons: new Set(button ? [button] : []) });

it.each([0, 1])('chute 3+4 é overhead contra as duas guardas, jogador %i', player => {
  const move = cowboy.moves.find(candidate => candidate.id === 'power-kick')!;
  expect(move).toMatchObject({ hitLevel: 'mid', overhead: true });
  for (const defender of [shoto, cowboy]) {
    for (const [direction, outcome] of [['B', 'block'], ['DB', 'hit']] as const) {
      const defs = player === 0 ? [cowboy, defender] as const : [defender, cowboy] as const;
      const sim = new Simulation(createGameConfig(1024, 576), defs, { training: true, initialDistance: 56 });
      const guard = input(direction);
      const step = (value: FrameInput = input()) => sim.stepFrame(player === 0 ? [value, guard] : [guard, value]);
      step({ direction: 'N', buttons: new Set(['3', '4']) });
      for (let tick = 0; tick < 90 && !sim.snapshot().hitEvents.length; tick++) step();
      expect(sim.snapshot().hitEvents[0]).toMatchObject({ moveId: 'power-kick', outcome });
    }
  }
});

it.each([0,1])('o afastamento e o laço quicam o adversário na borda e o lançam de volta, jogador %i', player => {
 for (const move of ['push-away', 'throw-13'] as const) {
  const base = createGameConfig(1024,576);
  const config = {...base, arena:{...base.arena, left:0, right:350, maxSeparation:undefined}};
  const defs = player === 0 ? [cowboy, shoto] as const : [shoto, cowboy] as const;
  const sim = new Simulation(config,defs,{training:true,initialDistance:56});
  const step = (a:FrameInput=input(), b:FrameInput=input()) => sim.stepFrame(player === 0 ? [a,b] : [b,a]);
  for (let i=0; i<160; i++) step(input('F'),input('B'));
  if (move === 'push-away') {
    for (const d of ['D','DF','F'] as const) step(input(d));
    step(input('F','4'));
  } else step({direction:'N', buttons:new Set(['1','3'])});
  for (let i=0; i<160 && !sim.snapshot().characters[1-player].wallBounceEffect; i++) step();
  const target = sim.snapshot().characters[1-player];
  expect(target.wallBounceEffect).toBeDefined();
  const direction = target.wallBounceEffect!.direction;
  const wall = direction > 0 ? config.arena.right : config.arena.left;
  const contact = target.wallBounceEffect!.x + direction * target.collision.bodyWidth / 2;
  const visibleWidth = config.arena.viewportWidth! / 1.6;
  expect(Math.abs(wall - contact)).toBeLessThanOrEqual(visibleWidth * .02);
  expect(target.mode).toBe('hitstun');
  expect(target.grounded).toBe(false);
  expect(target.verticalVelocity).toBe(-8);
  expect(target.juggle?.gravityScale).toBeCloseTo((defs[1-player].juggle?.initialGravityScale ?? 1) * .65);
  const attacker = sim.snapshot().characters[player];
  expect(attacker.chain).toBeUndefined();
  expect(attacker.hitSequence).toBeUndefined();
  expect(sim.snapshot().comboHistory.some(combo => combo.active && combo.attackerId === attacker.characterId)).toBe(false);
  const atBounce = target.x;
  for (let i=0; i<10; i++) step();
  expect((sim.snapshot().characters[1-player].x - atBounce) * target.wallBounceEffect!.direction).toBeLessThanOrEqual(0);
  expect(sim.snapshot().characters[1-player].grounded).toBe(false);
  expect(sim.snapshot().characters[player].attack).toBeUndefined();
  for (let i=0; i<30; i++) step();
  const returned = sim.snapshot().characters[1-player];
  const spacing = (returned.x - sim.snapshot().characters[player].x) * direction;
  expect(spacing).toBeGreaterThan(0);
  expect(spacing).toBeLessThanOrEqual((returned.collision.bodyWidth + attacker.collision.bodyWidth) / 2 + 41);
  expect(returned.grounded).toBe(false);
  step(input('N','1'));
  expect(sim.snapshot().characters[player].attack?.moveId).toBe('light-punch');
  for (let i=0; i<90 && !sim.snapshot().hitEvents.some(event=>event.attackerId===attacker.characterId && event.moveId==='light-punch'); i++) step();
  const next = sim.snapshot();
  expect(next.hitEvents.some(event=>event.attackerId===attacker.characterId && event.moveId==='light-punch' && event.outcome==='hit')).toBe(true);
  expect(next.comboHistory.find(combo=>combo.active && combo.attackerId===attacker.characterId)?.hits).toBe(1);
 }
});

it.each([0,1])('o limite da tela no meio da arena não causa quique nem arrasta o atacante, jogador %i', player => {
 for (const move of ['push-away', 'throw-13'] as const) {
  const base=createGameConfig(1024,576);
  const config={...base,arena:{...base.arena,maxSeparation:200}};
  const sim=new Simulation(config,player===0?[cowboy,shoto]:[shoto,cowboy],{training:true,initialDistance:56});
  const step=(value:FrameInput=input())=>sim.stepFrame(player===0?[value,input()]:[input(),value]);
  if (move === 'push-away') {
    for(const d of ['D','DF','F'] as const)step(input(d));
    step(input('F','4'));
  } else step({direction:'N',buttons:new Set(['1','3'])});
  for(let i=0;i<100 && !sim.snapshot().hitEvents.length;i++)step();
  expect(sim.snapshot().hitEvents[0]?.moveId).toBe(move);
  const attackerX=sim.snapshot().characters[player].x;
  for(let i=0;i<100;i++) {
    step();
    expect(sim.snapshot().characters[1-player].wallBounceEffect).toBeUndefined();
  }
  const snapshot=sim.snapshot();
  expect(snapshot.characters[1-player].wallBounceEffect).toBeUndefined();
  expect(snapshot.characters[player].x).toBeCloseTo(attackerX);
  expect(Math.abs(snapshot.characters[0].x-snapshot.characters[1].x)).toBeLessThanOrEqual(config.arena.maxSeparation);
 }
});

it.each([0,1])('um golpe letal ainda quica antes do fim do round, jogador %i', player => {
  const base=createGameConfig(1024,576), config={...base,arena:{...base.arena,left:0,right:350,maxSeparation:undefined}};
  const fragile={...shoto,maxHealth:1};
  const sim=new Simulation(config,player===0?[cowboy,fragile]:[fragile,cowboy],{initialDistance:56});
  const step=(a:FrameInput=input(),b:FrameInput=input())=>sim.stepFrame(player===0?[a,b]:[b,a]);
  for(let i=0;i<160;i++)step(input('F'),input('B'));
  for(const d of ['D','DF','F'] as const)step(input(d));
  step(input('F','4'));
  for(let i=0;i<100 && !sim.snapshot().characters[1-player].wallBounceEffect;i++)step();
  expect(sim.snapshot().characters[1-player].wallBounceEffect).toBeDefined();
  expect(sim.snapshot().characters[1-player].health).toBe(0);
  expect(sim.snapshot().phase).toBe('fight');
  for(let i=0;i<200 && sim.snapshot().phase==='fight';i++)step();
  expect(sim.snapshot().phase).toBe('round-over');
});

it.each([0,1])('permite dash aéreo nos dois sentidos com duplo toque ou atalho: jogador %i', player => {
  for (const direction of ['F','B'] as const) for (const shortcut of [false,true]) {
    const defs = player === 0 ? [cowboy,shoto] as const : [shoto,cowboy] as const;
    const sim = new Simulation(createGameConfig(2200,700), defs, {training:true,initialDistance:400});
    const step=(value:FrameInput=input())=>sim.stepFrame(player===0?[value,input()]:[input(),value]);
    step(input('U')); step();
    if (!shortcut) { step(input(direction)); step(); }
    const before=sim.snapshot().characters[player];
    step(shortcut ? {...input(),dash:direction} : input(direction));
    const after=sim.snapshot().characters[player];
    const sign=(before.facing==='right'?1:-1)*(direction==='F'?1:-1);
    expect(after.mode).toBe('dashing');
    expect(after.grounded).toBe(false);
    expect(createHurtbox(after).width).toBe(cowboy.collision.hurtboxes.airborne.width);
    expect(createHurtbox(after).height).toBe(cowboy.collision.hurtboxes.airborne.height);
    expect((after.x-before.x)*sign).toBeCloseTo(direction==='F'?cowboy.movement.dashSpeed:cowboy.movement.backdashSpeed);
    expect(after.y).toBe(before.y);
    expect(after.verticalVelocity).toBe(before.verticalVelocity);
    step(); expect(sim.snapshot().characters[player].mode).toBe('dashing');
    for(let tick=0;tick<80 && !sim.snapshot().characters[player].grounded;tick++)step();
    expect(sim.snapshot().characters[player].grounded).toBe(true);
    expect(sim.snapshot().characters[player].mode).not.toBe('dashing');
  }
});

it('não habilita dash aéreo no Shoto',()=>{
  const sim=new Simulation(createGameConfig(2200,700),[shoto,cowboy],{training:true,initialDistance:400});
  sim.stepFrame([input('U'),input()]);
  sim.stepFrame([{...input(),dash:'F'},input()]);
  expect(sim.snapshot().characters[0].mode).toBe('airborne');
});

it.each([0,1])('limita o dash aéreo a um por salto e restaura após pousar: jogador %i', player => {
  const defs=player===0?[cowboy,shoto] as const:[shoto,cowboy] as const;
  const sim=new Simulation(createGameConfig(2200,700),defs,{training:true,initialDistance:400});
  const step=(value:FrameInput=input())=>sim.stepFrame(player===0?[value,input()]:[input(),value]);
  step(input('U')); step({...input(),dash:'F'});
  expect(sim.snapshot().characters[player].airDashUsed).toBe(true);
  for(let tick=0;tick<26;tick++)step();
  expect(sim.snapshot().characters[player].grounded).toBe(false);
  step({...input(),dash:'B'});
  expect(sim.snapshot().characters[player].mode).not.toBe('dashing');
  while(!sim.snapshot().characters[player].grounded)step();
  step(input('U')); step({...input(),dash:'B'});
  expect(sim.snapshot().characters[player].mode).toBe('dashing');
});

it.each([0,1])('dash aéreo para trás funciona sob ameaça e pode ser interrompido por ataque aéreo: jogador %i', player=>{
  const defs=player===0?[cowboy,shoto] as const:[shoto,cowboy] as const;
  const sim=new Simulation(createGameConfig(2200,700),defs,{training:true,initialDistance:350});
  const step=(self:FrameInput=input(),opponent:FrameInput=input())=>sim.stepFrame(player===0?[self,opponent]:[opponent,self]);
  step(input('U')); step(input(),input('N','1'));
  step({...input('B'),dash:'B'});
  expect(sim.snapshot().characters[player].mode).toBe('dashing');
  step(input('N','1'));
  expect(sim.snapshot().characters[player].attack?.moveId).toBe('air-light-punch');
  expect(sim.snapshot().characters[player].mode).toBe('startup');
});

it.each([0, 1])('mantém raiz e caixas estáveis durante golpes sem deslocamento: jogador %i', player => {
  for (const [direction, button] of [['N','1'],['N','2'],['N','3'],['D','4']] as const) {
    const defs = player === 0 ? [cowboy,shoto] as const : [shoto,cowboy] as const;
    const sim = new Simulation(createGameConfig(1024,576),defs,{training:true,initialDistance:400});
    const step=(value:FrameInput)=>sim.stepFrame(player===0?[value,input()]:[input(),value]);
    const start=sim.snapshot().characters[player].x;
    step(input(direction,button));
    for(let tick=0;tick<25;tick++) {
      const state=sim.snapshot().characters[player];
      expect(state.x).toBe(start);
      const hurtbox=createHurtbox(state);
      expect(hurtbox.x+hurtbox.width/2).toBeCloseTo(state.x);
      if(state.attack){
        const move=cowboy.moves.find(candidate=>candidate.id===state.attack!.moveId)!;
        const hitbox=createHitbox(state,move);
        expect(player===0?hitbox.x-state.x:state.x-(hitbox.x+hitbox.width)).toBe(move.hitbox.forward);
      }
      step(input(direction));
    }
  }
});

it('torna a rasteira mais rápida preservando queda e alcance', () => {
  const sweep=cowboy.moves.find(move=>move.id==='crouch-heavy-kick')!;
  expect(sweep).toMatchObject({startup:10,recovery:26,knockdown:true,hitbox:{forward:25,width:70}});
});

it('dá mais antecipação e recuperação à coronhada', () => {
  const strike = cowboy.moves.find(move => move.id === 'crouch-punch')!;
  expect(strike).toMatchObject({startup: 13, activeFrames: 3, recovery: 22});
  expect(cowboy.moves.find(move => move.id === 'crouch-combo-shot')).toMatchObject({startup:9,activeFrames:3,recovery:18});
});

it.each([0, 1])('carrega o soco forte por até dois segundos e dispara automaticamente: jogador %i', player => {
  for (const [heldFrames, expectedDamage] of [[1,38],[59,38],[60,46],[119,46],[120,53]] as const) {
    const defs = player === 0 ? [cowboy,shoto] as const : [shoto,cowboy] as const;
    const sim = new Simulation(createGameConfig(1024,576), defs, {training:true,initialDistance:100});
    const step = (value:FrameInput) => sim.stepFrame(player === 0 ? [value,input()] : [input(),value]);
    for (let tick=0; tick<heldFrames; tick++) step(input('N','2'));
    expect(sim.snapshot().projectiles).toHaveLength(0);
    expect(sim.snapshot().characters[player].attack?.chargeFrames).toBe(heldFrames);
    if (!sim.snapshot().hitEvents.length) step(input());
    for(let tick=0;tick<80 && !sim.snapshot().hitEvents.length;tick++)step(input());
    expect(sim.snapshot().hitEvents[0], `tempo ${heldFrames}`).toMatchObject({moveId:'heavy-punch',outcome:'hit',damage:expectedDamage});
  }
});

it.each([0,1])('carrega um soco forte no combo de tiros sem trocar a receita: jogador %i', player => {
  const defs = player === 0 ? [cowboy,shoto] as const : [shoto,cowboy] as const;
  const sim = new Simulation(createGameConfig(1024,576),defs,{training:true,initialDistance:100});
  const step=(value:FrameInput=input())=>sim.stepFrame(player===0?[value,input()]:[input(),value]);
  step(input('N','1'));
  for(let tick=0;tick<60&&!sim.snapshot().hitEvents.length;tick++)step();
  expect(sim.snapshot().hitEvents[0]).toMatchObject({moveId:'light-punch',outcome:'hit'});
  while(sim.snapshot().hitstopFramesRemaining)step();
  for(let tick=0;tick<60;tick++)step(input('N','2'));
  expect(sim.snapshot().characters[player]).toMatchObject({chain:['light-punch','heavy-punch'],attack:{moveId:'heavy-punch',chargeFrames:60}});
  step();
  for(let tick=0;tick<80&&!sim.snapshot().hitEvents.length;tick++)step();
  expect(sim.snapshot().hitEvents[0]).toMatchObject({moveId:'heavy-punch',outcome:'hit',damage:46});
});

it.each([0, 1])('executa as receitas aéreas com uma entrada por tiro: jogador %i', player => {
  for (const buttons of [['1', '1', '2'], ['2', '2']] as const) {
    const defs = player === 0 ? [cowboy, shoto] as const : [shoto, cowboy] as const;
    const sim = new Simulation(createGameConfig(1024, 576), defs, {training: true, initialDistance: 65});
    const step = (value: FrameInput) => sim.stepFrame(player === 0 ? [value, input()] : [input(), value]);
    step(input('U'));
    for (const button of buttons) {
      step(input('N', button));
      const expected = button === '1' ? 'air-light-punch' : 'air-heavy-punch';
      expect(sim.snapshot().characters[player].attack?.moveId).toBe(expected);
      for (let tick = 0; tick < 60; tick++) {
        step(input());
        const self = sim.snapshot().characters[player];
        if (!sim.snapshot().hitstopFramesRemaining && self.attack &&
            (self.attack.hitOutcome === 'hit' || self.attack.elapsedFrames >= (self.attack.startupFrames ?? 0) + (button === '1' ? 3 : 4))) break;
      }
    }
    expect(sim.snapshot().characters[player].chain?.length).toBe(buttons.length);
    for (let tick = 0; tick < 35; tick++) step(input());
    expect(sim.snapshot().recentContacts.filter(entry => entry.event.attackerId === `player-${player + 1}` && entry.event.outcome === 'hit').map(entry => entry.event.moveId))
      .toEqual(buttons.map(button => button === '1' ? 'air-light-punch' : 'air-heavy-punch'));
  }
});

it.each([0, 1])('o recuo do segundo tiro aéreo sustenta e eleva a Cowboy: jogador %i', player => {
  const sim = new Simulation(createGameConfig(1024,576), [cowboy,cowboy], {training:true,initialDistance:300});
  const step = (value:FrameInput) => sim.stepFrame(player === 0 ? [value,input()] : [input(),value]);
  step(input('U')); step(input('N','1'));
  for(let i=0;i<12;i++) step(input());
  step(input('N','1'));
  for(let i=0;i<7;i++) step(input());
  const before = sim.snapshot().characters[player];
  step(input());
  const shot = sim.snapshot().characters[player];
  expect(shot.attack?.elapsedFrames).toBe(8);
  expect(shot.y).toBeLessThan(before.y);
  expect(shot.verticalVelocity).toBeLessThan(0);
});

it('usa mobilidade maior para a Cowboy', () => {
  expect(cowboy.movement).toMatchObject({walkSpeed:2.6,backwardWalkSpeed:2.1,jumpVelocity:-12,dashSpeed:5,backdashSpeed:4.1});
});

it.each([0, 1])('provocação é acionada uma vez e interrompida por movimento: jogador %i', player => {
  const sim = new Simulation(createGameConfig(1024, 576), [cowboy, cowboy], {training:true});
  const step = (value: FrameInput) => sim.stepFrame(player === 0 ? [value, input()] : [input(), value]);
  const taunt = {...input(), taunt:true};
  step(taunt);
  expect(sim.snapshot().characters[player].tauntStartedFrame).toBeDefined();
  const start = sim.snapshot().characters[player].tauntStartedFrame;
  for (let i = 0; i < 5; i++) step(taunt);
  expect(sim.snapshot().characters[player].tauntStartedFrame).toBe(start);
  step(input('F'));
  expect(sim.snapshot().characters[player].tauntStartedFrame).toBeUndefined();
});

it.each([0, 1])('encerra a provocação naturalmente após 132 quadros: jogador %i', player => {
  const sim = new Simulation(createGameConfig(1024,576),[cowboy,cowboy],{training:true});
  const step = (value:FrameInput) => sim.stepFrame(player === 0 ? [value,input()] : [input(),value]);
  step({...input(),taunt:true});
  for(let tick=0;tick<131;tick++)step(input());
  expect(sim.snapshot().characters[player].tauntStartedFrame).toBeDefined();
  step(input());
  expect(sim.snapshot().characters[player].tauntStartedFrame).toBeUndefined();
});

it.each([0, 1])('usa chute potente médio e laço que lança para longe: jogador %i', player => {
  for (const [buttons, id] of [[['3','4'], 'power-kick'], [['1','3'], 'throw-13']] as const) {
    const defs = player === 0 ? [cowboy, shoto] as const : [shoto, cowboy] as const;
    const sim = new Simulation(createGameConfig(1024, 576), defs, {training:true, initialDistance:65});
    const chord: FrameInput = {direction:'N', buttons:new Set(buttons)};
    const step = (value: FrameInput, defender: FrameInput = input()) => sim.stepFrame(player === 0 ? [value, defender] : [defender, value]);
    const before = sim.snapshot().characters;
    step(chord);
    for (let tick = 0; tick < 45 && !sim.snapshot().hitEvents.length; tick++) step(input());
    expect(sim.snapshot().hitEvents[0]).toMatchObject({moveId:id, outcome:'hit'});
    const move = cowboy.moves.find(candidate => candidate.id === id)!;
    expect(move.hitLevel).toBe(id === 'throw-13' ? 'high' : 'mid');
    if (move.category === 'throw') {
      const contact = sim.snapshot().characters;
      expect(Math.abs(contact[1-player].x - before[1-player].x)).toBeLessThan(10);
      for (let tick = 0; tick < 35; tick++) step(input());
      const after = sim.snapshot().characters;
      expect(Math.abs(after[player].x - after[1-player].x)).toBeGreaterThan(Math.abs(before[player].x - before[1-player].x) + 100);
      expect(after[1-player].mode).toBe('knockdown');
    }
  }
});

it.each([0, 1])('laço erra alvos agachados e acerta alvos em pé: jogador %i', player => {
  for (const targetFighter of [shoto, cowboy]) for (const direction of ['D', 'DB', 'N'] as const) for (const charged of [false, true]) {
    const defs = player === 0 ? [cowboy, targetFighter] as const : [targetFighter, cowboy] as const;
    const sim = new Simulation(createGameConfig(1024, 576), defs, { training: true, initialDistance: 65 });
    const chord: FrameInput = { direction: 'N', buttons: new Set(['1', '3']) };
    const defender = input(direction);
    const step = (attacker: FrameInput) => sim.stepFrame(player === 0 ? [attacker, defender] : [defender, attacker]);
    step(chord);
    if (charged) for (let tick = 0; tick < 60; tick++) step(chord);
    for (let tick = 0; tick < 100; tick++) step(input());
    const state = sim.snapshot();
    const hits = state.recentContacts.filter(contact => contact.event.moveId === 'throw-13');
    expect(hits.length, `${targetFighter.id}, ${direction}, charged=${charged}`).toBe(direction === 'N' ? 1 : 0);
    expect(state.characters[1 - player].health).toBe(direction === 'N' ? 925 : 1000);
  }
});

it.each([0, 1])('a caixa do laço passa acima dos alvos agachados: jogador %i', player => {
  const move = cowboy.moves.find(candidate => candidate.id === 'throw-13')!;
  for (const targetFighter of [cowboy, shoto]) for (const chargeFrames of [1, 60]) {
    const defs = player === 0 ? [cowboy, targetFighter] as const : [targetFighter, cowboy] as const;
    const sim = new Simulation(createGameConfig(1024, 576), defs, { training: true, initialDistance: 65 });
    const [attacker, defender] = [sim.snapshot().characters[player], sim.snapshot().characters[1 - player]];
    attacker.attack = { moveId: move.id, buttons: ['1', '3'], elapsedFrames: move.startup, hasHit: false, chargeFrames };
    const box = createHitbox(attacker, move);
    expect(intersects(box, createHurtbox({ ...defender, crouching: false }))).toBe(true);
    expect(intersects(box, createHurtbox({ ...defender, crouching: true }))).toBe(false);
  }
});

it.each([0, 1])('carrega o alcance do laço sem mudar o dano: jogador %i', player => {
  for (const [buttons,id] of [[['1','3'],'throw-13']] as const) {
    const defs = player === 0 ? [cowboy,shoto] as const : [shoto,cowboy] as const;
    const sim = new Simulation(createGameConfig(1024,576),defs,{training:true,initialDistance:200});
    const step=(value:FrameInput=input())=>sim.stepFrame(player===0?[value,input()]:[input(),value]);
    const chord: FrameInput = {direction:'N',buttons:new Set(buttons)};
    const move = cowboy.moves.find(candidate=>candidate.id===id)!;
    step(chord);
    const initial = createHitbox(sim.snapshot().characters[player],move);
    for(let tick=1;tick<30;tick++) step(chord);
    const halfway = createHitbox(sim.snapshot().characters[player],move);
    expect(halfway.width).toBeGreaterThan(initial.width);
    expect(halfway.width).toBeLessThan(move.hitbox.width * 1.3);
    for(let tick=30;tick<60;tick++) step(chord);
    const full = sim.snapshot().characters[player];
    expect(full.attack).toMatchObject({moveId:id,chargeFrames:60,chargeReleased:true});
    expect(createHitbox(full,move).width).toBeCloseTo(move.hitbox.width * 1.3);
    for(let tick=0;tick<15&&!sim.snapshot().hitEvents.length;tick++)step();
    expect(sim.snapshot().hitEvents[0]).toMatchObject({moveId:id,outcome:'hit',damage:move.damage});
  }
});

it.each([0, 1])('soltar qualquer botão libera o agarrão com o alcance acumulado: jogador %i', player => {
  const defs = player === 0 ? [cowboy,shoto] as const : [shoto,cowboy] as const;
  const sim = new Simulation(createGameConfig(1024,576),defs,{training:true,initialDistance:200});
  const step=(value:FrameInput)=>sim.stepFrame(player===0?[value,input()]:[input(),value]);
  for(let tick=0;tick<30;tick++)step({direction:'N',buttons:new Set(['1','3'])});
  const move = cowboy.moves.find(candidate=>candidate.id==='throw-13')!;
  const chargedWidth = createHitbox(sim.snapshot().characters[player],move).width;
  step(input('N','1'));
  const released=sim.snapshot().characters[player];
  expect(released.attack).toMatchObject({moveId:'throw-13',chargeFrames:30,chargeReleased:true});
  expect(createHitbox(released,move).width).toBe(chargedWidth);
});

it.each([0, 1])('arremessa gradualmente para trás sem mover quem laçou: jogador %i', player => {
  const defs = player === 0 ? [cowboy, shoto] as const : [shoto, cowboy] as const;
  const sim = new Simulation(createGameConfig(1024, 576), defs, {training:true, initialDistance:65});
  const step = (value: FrameInput = input()) => sim.stepFrame(player === 0 ? [value,input()] : [input(),value]);
  step({direction:'B',buttons:new Set(['1','3'])});
  for (let tick = 0; tick < 40 && !sim.snapshot().hitEvents.length; tick++) step();
  expect(sim.snapshot().hitEvents[0]).toMatchObject({moveId:'throw-13',outcome:'hit'});
  const contact = sim.snapshot().characters;
  const facingSign = contact[player].facing === 'right' ? 1 : -1;
  let previous = contact[1-player].x;
  for (let tick = 0; tick < 25; tick++) {
    step();
    const current = sim.snapshot().characters;
    expect(Math.abs(current[1-player].x - previous)).toBeLessThan(20);
    expect(current[player].x).toBeCloseTo(contact[player].x);
    previous = current[1-player].x;
  }
  expect((previous - contact[player].x) * facingSign).toBeLessThan(-100);
});

it.each([0, 1])('laça de mais longe e puxa antes de chutar para frente: jogador %i', player => {
  const defs = player === 0 ? [cowboy, shoto] as const : [shoto, cowboy] as const;
  const sim = new Simulation(createGameConfig(1024, 576), defs, {training:true, initialDistance:115});
  const step = (value:FrameInput = input()) => sim.stepFrame(player === 0 ? [value,input()] : [input(),value]);
  step({direction:'N',buttons:new Set(['1','3'])});
  for (let tick=0; tick<40 && !sim.snapshot().hitEvents.length; tick++) step();
  expect(sim.snapshot().hitEvents[0]).toMatchObject({moveId:'throw-13',outcome:'hit'});
  while (sim.snapshot().hitstopFramesRemaining) step();
  const before = sim.snapshot().characters;
  for (let tick=0; tick<6; tick++) step();
  const pulled = sim.snapshot().characters;
  expect(Math.abs(pulled[player].x-pulled[1-player].x)).toBeLessThan(Math.abs(before[player].x-before[1-player].x));
  for (let tick=0; tick<30; tick++) step();
  const launched = sim.snapshot().characters;
  expect(Math.abs(launched[player].x-launched[1-player].x)).toBeGreaterThan(Math.abs(before[player].x-before[1-player].x));
});

it.each([0, 1])('Bulls Eye dispara seis projéteis móveis em alturas crescentes: jogador %i', player => {
  const defs = player === 0 ? [cowboy,shoto] as const : [shoto,cowboy] as const;
  const sim = new Simulation(createGameConfig(1024,576), defs, {training:true,initialDistance:400});
  const step = (value:FrameInput = input()) => sim.stepFrame(player === 0 ? [value,input()] : [input(),value]);
  sim.fillTrainingRage(); step({...input(),ultimate:true});
  while (sim.snapshot().ultimateActivation) { expect(sim.snapshot().projectiles).toHaveLength(0); step(); }
  const seen = new Map<number,{x:number;y:number;velocity:number}>();
  for (let tick=0;tick<240;tick++) {
    for (const shot of sim.snapshot().projectiles.filter(p=>p.visual === 'volley')) {
      if (!seen.has(shot.id)) seen.set(shot.id,{x:shot.x,y:shot.y,velocity:shot.velocity});
    }
    step();
  }
  const shots = [...seen.values()];
  expect(shots).toHaveLength(6);
  expect(shots.map(shot=>shot.y)).toEqual([444,400,356,312,268,224]);
  expect(shots.every(shot=>shot.velocity === (player === 0 ? 24 : -24))).toBe(true);
  expect(sim.snapshot().recentContacts.some(entry=>entry.event.moveId==='bulls-eye')).toBe(true);
});

it.each([0, 1])('o primeiro disparo da ultimate percorre distância antes de atingir: jogador %i', player => {
  const defs = player === 0 ? [cowboy,shoto] as const : [shoto,cowboy] as const;
  const sim = new Simulation(createGameConfig(1024,576), defs, {training:true,initialDistance:400});
  const step = (value:FrameInput = input()) => sim.stepFrame(player === 0 ? [value,input()] : [input(),value]);
  sim.fillTrainingRage(); step({...input(),ultimate:true});
  while (sim.snapshot().ultimateActivation) step();
  for(let tick=0;tick<11;tick++) { step(); expect(sim.snapshot().projectiles.filter(p=>p.visual==='volley')).toHaveLength(0); }
  step();
  expect(sim.snapshot().characters[1-player].health).toBe(1000);
  const shot = sim.snapshot().projectiles.find(p=>p.visual==='volley');
  expect(shot).toBeDefined();
  const start=shot!.x; step();
  expect(Math.abs(sim.snapshot().projectiles.find(p=>p.id===shot!.id)!.x-start)).toBe(24);
  for(let tick=0;tick<80 && !sim.snapshot().recentContacts.length;tick++)step();
  expect(sim.snapshot().recentContacts[0]?.event).toMatchObject({moveId:'bulls-eye',outcome:'hit'});
});

it.each([0,1])('a ultimate levanta e acerta seis vezes após o primeiro disparo: jogador %i', player => {
  for (const targetFighter of [shoto,cowboy]) for (const distance of [100,400]) {
    const defs=player===0?[cowboy,targetFighter] as const:[targetFighter,cowboy] as const;
    const sim=new Simulation(createGameConfig(1024,576),defs,{training:true,initialDistance:distance});
    const step=()=>sim.stepFrame([input(),input()]);
    sim.fillTrainingRage(); sim.stepFrame(player===0?[{...input(),ultimate:true},input()]:[input(),{...input(),ultimate:true}]);
    const heights:number[]=[]; const steps:number[]=[];
    for(let tick=0;tick<500;tick++) {
      step();
      for (const event of sim.snapshot().hitEvents) if (event.moveId==='bulls-eye' && event.outcome==='hit') {
        heights.push(sim.snapshot().characters[1-player].y); steps.push(event.volleyStep!);
        expect(sim.snapshot().characters[1-player].verticalVelocity).toBeLessThan(0);
      }
      if(steps.length===6) break;
    }
    expect(steps,`${targetFighter.id}, distância ${distance}`).toEqual([0,1,2,3,4,5]);
    for(let index=1;index<heights.length;index++)expect(heights[index]).toBeLessThan(heights[index-1]);
    expect(sim.snapshot().comboHistory.slice(-1)[0]).toMatchObject({hits:6,damage:360});
    expect(sim.snapshot().characters[1-player].mode).toBe('knockdown');
    for(let tick=0;tick<120&&!sim.snapshot().characters[1-player].grounded;tick++) step();
    expect(sim.snapshot().characters[1-player]).toMatchObject({grounded:true,mode:'knockdown'});
  }
});

it.each([0,1])('completa a ultimate mesmo após zerar a vida no primeiro tiro, jogador %i', player => {
  const attacker = {...cowboy, moves:cowboy.moves.map(move => move.id === 'bulls-eye' ? {...move, rageCost:0} : move), rage:{...cowboy.rage!, maximum:0}};
  const target = {...shoto, maxHealth:1};
  const sim = new Simulation(createGameConfig(1024,576), player === 0 ? [attacker,target] : [target,attacker], {initialDistance:100});
  const step = (value:FrameInput=input()) => sim.stepFrame(player === 0 ? [value,input()] : [input(),value]);
  step({...input(),ultimate:true});
  const shots:number[] = [];
  for (let tick=0; tick<500 && shots.length<6; tick++) {
    step();
    for (const event of sim.snapshot().hitEvents) if (event.moveId === 'bulls-eye' && event.outcome === 'hit') shots.push(event.volleyStep!);
    if (shots.length && shots.length < 6) expect(sim.snapshot().phase).toBe('fight');
  }
  expect(shots).toEqual([0,1,2,3,4,5]);
  expect(sim.snapshot().characters[1-player].health).toBe(0);
});

it.each([0,1])('o primeiro disparo da ultimate só é bloqueado agachado: jogador %i', player => {
  for (const [guard,expected] of [['B','hit'],['DB','block']] as const) {
    const defs=player===0?[cowboy,shoto] as const:[shoto,cowboy] as const;
    const sim=new Simulation(createGameConfig(1024,576),defs,{training:true,initialDistance:250});
    const defender=input(guard);
    const step=(attacker:FrameInput=input())=>sim.stepFrame(player===0?[attacker,defender]:[defender,attacker]);
    sim.fillTrainingRage();step({...input(),ultimate:true});
    for(let tick=0;tick<240 && !sim.snapshot().recentContacts.some(c=>c.event.moveId==='bulls-eye');tick++)step();
    expect(sim.snapshot().recentContacts.find(c=>c.event.moveId==='bulls-eye')?.event).toMatchObject({volleyStep:0,outcome:expected});
  }
});

it.each([0, 1])('executa duas coronhadas e um tiro no combo agachado: jogador %i', player => {
  const defs=player===0?[cowboy,shoto] as const:[shoto,cowboy] as const;
  const sim=new Simulation(createGameConfig(1024,576),defs,{training:true,initialDistance:65});
  const step=(value:FrameInput)=>sim.stepFrame(player===0?[value,input()]:[input(),value]);
  for(const expected of ['crouch-punch','crouch-punch','crouch-combo-shot']) {
    step(input('D','1'));
    expect(sim.snapshot().characters[player].attack?.moveId).toBe(expected);
    expect(sim.snapshot().characters[player].crouching).toBe(true);
    let hit=false;
    for(let tick=0;tick<80;tick++) {
      step(input('D'));
      if(sim.snapshot().hitEvents.some(event=>event.moveId===expected && event.outcome==='hit')) {hit=true;break;}
    }
    expect(hit,expected).toBe(true);
    while(sim.snapshot().hitstopFramesRemaining)step(input('D'));
  }
  expect(sim.snapshot().characters[1-player].health).toBe(946);
});

it.each([0, 1])('não executa o finalizador com apenas uma entrada: jogador %i', player => {
  const defs=player===0?[cowboy,shoto] as const:[shoto,cowboy] as const;
  const sim=new Simulation(createGameConfig(1024,576),defs,{training:true,initialDistance:300});
  const step=(value:FrameInput)=>sim.stepFrame(player===0?[value,input()]:[input(),value]);
  step(input('D','1'));
  for(let tick=0;tick<50;tick++) {
    step(input('D'));
    expect(sim.snapshot().characters[player].attack?.moveId).not.toBe('crouch-combo-shot');
    expect(sim.snapshot().projectiles).toHaveLength(0);
  }
});

it.each([0, 1])('afastamento bloqueado não derruba: jogador %i', player => {
  const defs=player===0?[cowboy,shoto] as const:[shoto,cowboy] as const;
  const sim=new Simulation(createGameConfig(1024,576),defs,{training:true,initialDistance:56});
  const step=(value:FrameInput)=>sim.stepFrame(player===0?[value,input('B')]:[input('B'),value]);
  for(const direction of ['D','DF','F'] as const)step(input(direction));
  step(input('F','4'));
  let outcome: string | undefined;
  for(let tick=0;tick<35;tick++) {
    step(input());
    const event=sim.snapshot().hitEvents.find(hit=>hit.moveId==='push-away');
    if(event){outcome=event.outcome;break;}
  }
  expect(outcome).toBe('block');
  expect(sim.snapshot().characters[1-player].mode).toBe('blockstun');
});

describe('Cowboy protótipo', () => {
  it('tem quatro básicos por postura aérea e no chão e apenas as receitas autoradas', () => {
    expect(cowboy.moves.filter(move => move.category === 'basic' && !move.airborne)).toHaveLength(4);
    expect(cowboy.moves.filter(move => move.category === 'basic' && move.airborne)).toHaveLength(4);
    expect(cowboy.combos?.map(combo => combo.notation)).toEqual(['d+2,2', '4,4,2', '3,3,3', '1,2,2,2', 'd+1,1,1', 'no ar + 1,1,2', 'no ar + 2,2']);
  });
  it.each([0, 1])('executa os disparos e o afastamento do lado %i', player => {
    for (const [button, id, distance] of [['1', 'quick-shot', 65], ['2', 'heavy-shot', 65], ['4', 'push-away', 56]] as const) {
      const definitions = player === 0 ? [cowboy, shoto] as const : [shoto, cowboy] as const;
      const sim = new Simulation(createGameConfig(1024, 576), definitions, { training: true, initialDistance: distance });
      const step = (value: FrameInput) => sim.stepFrame(player === 0 ? [value, input()] : [input(), value]);
      for (const direction of ['D', 'DF', 'F'] as const) step(input(direction));
      step(input('F', button));
      expect(sim.snapshot().characters[player].attack?.moveId).toBe(id);
      let hit = false;
      for (let tick = 0; tick < 150; tick++) {
        step(input());
        if (sim.snapshot().hitEvents.some(event => event.moveId === id)) { hit = true; break; }
      }
      expect(hit).toBe(true);
      if (id === 'push-away') {
        expect(sim.snapshot().characters[1 - player].mode).toBe('knockdown');
        const atImpact = sim.snapshot().characters[1 - player].x;
        while (sim.snapshot().hitstopFramesRemaining) {
          step(input());
          expect(sim.snapshot().characters[1 - player].x).toBe(atImpact);
        }
        let previous = atImpact;
        for (let tick = 0; tick < 12; tick++) {
          step(input());
          const position = sim.snapshot().characters[1 - player].x;
          expect(Math.abs(position - previous)).toBeLessThan(9);
          expect((position - previous) * (player === 0 ? 1 : -1)).toBeGreaterThan(0);
          previous = position;
        }
        expect(Math.abs(previous - atImpact)).toBeCloseTo(100);
      }
    }
  });
});

it.each([0, 1])('dispara horizontalmente, para baixo no ar e para cima agachada: jogador %i', player => {
  for (const [button, direction, jump, verticalSign] of [
    ['1', 'N', false, 0], ['2', 'N', false, 0],
    ['1', 'N', true, 1], ['2', 'N', true, 1], ['2', 'D', false, -1],
  ] as const) {
    const definitions = player === 0 ? [cowboy, shoto] as const : [shoto, cowboy] as const;
    const sim = new Simulation(createGameConfig(1024, 576), definitions, { training: true, initialDistance: 400 });
    const step = (value: FrameInput) => sim.stepFrame(player === 0 ? [value, input()] : [input(), value]);
    if (jump) { step(input('U')); step(input()); }
    step(input(direction, button));
    for (let tick = 0; tick < 25 && !sim.snapshot().projectiles.length; tick++) step(input());
    const shot = sim.snapshot().projectiles[0];
    expect(shot).toBeDefined();
    expect(Math.sign(shot.velocity)).toBe(player === 0 ? 1 : -1);
    expect(Math.sign(shot.verticalVelocity ?? 0)).toBe(verticalSign);
  }
});

it.each([0, 1])('rasteira derruba no acerto, mas não na guarda ou no vazio: jogador %i', player => {
  for (const [distance, guard, expected] of [[65, 'N', 'hit'], [65, 'DB', 'block'], [220, 'N', 'miss']] as const) {
    const definitions = player === 0 ? [cowboy, shoto] as const : [shoto, cowboy] as const;
    const sim = new Simulation(createGameConfig(1024, 576), definitions, { training: true, initialDistance: distance });
    const step = (value: FrameInput) => sim.stepFrame(player === 0 ? [value, input(guard)] : [input(guard), value]);
    step(input('D', '4'));
    let outcome = 'miss';
    for (let tick = 0; tick < 30; tick++) {
      step(input('D'));
      const event = sim.snapshot().hitEvents.find(hit => hit.moveId === 'crouch-heavy-kick');
      if (event) { outcome = event.outcome; break; }
    }
    expect(outcome).toBe(expected);
    expect(sim.snapshot().characters[1 - player].mode === 'knockdown').toBe(expected === 'hit');
  }
});

it('usa proporção de altura de 1,60 m para 1,85 m e chutes curtos', () => {
  expect(cowboy.collision.hurtboxes.standing.height / shoto.collision.hurtboxes.standing.height).toBeCloseTo(1.6 / 1.85, 3);
  for (const id of ['light-kick', 'heavy-kick', 'crouch-light-kick', 'crouch-heavy-kick']) {
    const move = cowboy.moves.find(entry => entry.id === id)!;
    expect(move.hitLevel).toBe('low');
    expect(move.hitbox.width).toBeLessThanOrEqual(70);
  }
});

it.each([0, 1])('tiros especiais têm dano alto e alcance curto: jogador %i', player => {
  for (const [button, id, damage] of [['1', 'quick-shot', 65], ['2', 'heavy-shot', 80]] as const) {
    for (const [distance, defense, expected] of [[65, 'N', 'hit'], [65, 'B', 'block'], [300, 'N', 'miss'], [65, 'D', 'miss']] as const) {
      const definitions = player === 0 ? [cowboy, shoto] as const : [shoto, cowboy] as const;
      const sim = new Simulation(createGameConfig(1024, 576), definitions, { training: true, initialDistance: distance });
      const step = (value: FrameInput) => sim.stepFrame(player === 0 ? [value, input(defense)] : [input(defense), value]);
      for (const direction of ['D', 'DF', 'F'] as const) step(input(direction));
      step(input('F', button));
      let outcome = 'miss';
      for (let tick = 0; tick < 70; tick++) {
        step(input());
        const event = sim.snapshot().hitEvents.find(hit => hit.moveId === id);
        if (event) { outcome = event.outcome; expect(event.damage).toBe(expected === 'hit' ? damage : 0); break; }
      }
      expect(outcome).toBe(expected);
    }
  }
});

it.each([0, 1])('permite segurar os especiais e soltar para disparar: jogador %i', player => {
  for (const [button,id,damage] of [['1','quick-shot',65],['2','heavy-shot',80]] as const) {
    const defs = player === 0 ? [cowboy,shoto] as const : [shoto,cowboy] as const;
    const sim = new Simulation(createGameConfig(1024,576),defs,{training:true,initialDistance:100});
    const step=(value:FrameInput=input())=>sim.stepFrame(player===0?[value,input()]:[input(),value]);
    for (const direction of ['D','DF','F'] as const) step(input(direction));
    for(let tick=0;tick<59;tick++)step(input('F',button));
    expect(sim.snapshot().characters[player].attack).toMatchObject({moveId:id,chargeFrames:59});
    expect(sim.snapshot().projectiles).toHaveLength(0);
    step();
    for(let tick=0;tick<70&&!sim.snapshot().hitEvents.length;tick++)step();
    expect(sim.snapshot().hitEvents[0]).toMatchObject({moveId:id,outcome:'hit',damage});
  }
});

it.each([0, 1])('dispara automaticamente os especiais após um segundo: jogador %i', player => {
  for (const [button,id] of [['1','quick-shot'],['2','heavy-shot']] as const) {
    const defs = player === 0 ? [cowboy,shoto] as const : [shoto,cowboy] as const;
    const sim = new Simulation(createGameConfig(1024,576),defs,{training:true,initialDistance:100});
    const step=(value:FrameInput)=>sim.stepFrame(player===0?[value,input()]:[input(),value]);
    for (const direction of ['D','DF','F'] as const) step(input(direction));
    for(let tick=0;tick<65;tick++)step(input('F',button));
    expect(sim.snapshot().characters[player].attack).toMatchObject({moveId:id,chargeFrames:60,chargeReleased:true});
  }
});

it.each([0, 1])('tiro especial forte alcança adversário no ar próximo: jogador %i', player => {
  const definitions = player === 0 ? [cowboy, shoto] as const : [shoto, cowboy] as const;
  const sim = new Simulation(createGameConfig(1024, 576), definitions, { training: true, initialDistance: 85 });
  const step = (value: FrameInput, target: FrameInput) => sim.stepFrame(player === 0 ? [value, target] : [target, value]);
  for (const direction of ['D', 'DF', 'F'] as const) step(input(direction), input());
  step(input('F', '2'), input('U'));
  let hit = false;
  for (let tick = 0; tick < 45; tick++) {
    step(input(), input());
    if (sim.snapshot().hitEvents.some(event => event.moveId === 'heavy-shot' && event.outcome === 'hit')) { hit = true; break; }
  }
  expect(hit).toBe(true);
});

it.each([0, 1])('executa 3,3,3 com entradas e acertos separados: jogador %i', player => {
  const defs = player === 0 ? [cowboy, shoto] as const : [shoto, cowboy] as const;
  const sim = new Simulation(createGameConfig(1024, 576), defs, { training: true, initialDistance: 65 });
  const step = (value: FrameInput) => sim.stepFrame(player === 0 ? [value, input()] : [input(), value]);
  for (let strike = 0; strike < 3; strike++) {
    step(input('N', '3'));
    let hit = false;
    for (let tick = 0; tick < 50; tick++) {
      step(input());
      if (sim.snapshot().hitEvents.some(event => event.moveId === 'light-kick' && event.outcome === 'hit')) { hit = true; break; }
    }
    expect(hit).toBe(true);
    while (sim.snapshot().hitstopFramesRemaining) step(input());
  }
  expect(sim.snapshot().characters[1 - player].health).toBe(928);
});

it.each([0, 1])('impede chute fraco agachado após chute fraco em pé no mesmo combo: jogador %i', player => {
  for (const count of [1,3]) {
    const defs = player === 0 ? [cowboy,shoto] as const : [shoto,cowboy] as const;
    const sim = new Simulation(createGameConfig(1024,576),defs,{training:true,initialDistance:65});
    const step = (value:FrameInput=input()) => sim.stepFrame(player === 0 ? [value,input()] : [input(),value]);
    for (let strike=0;strike<count;strike++) {
      step(input('N','3'));
      for (let tick=0;tick<80 && !sim.snapshot().hitEvents.length;tick++) step();
      expect(sim.snapshot().hitEvents[0]).toMatchObject({moveId:'light-kick',outcome:'hit'});
      while (sim.snapshot().hitstopFramesRemaining) step();
    }
    step(input('D','3'));
    expect(sim.snapshot().characters[player].attack?.moveId).toBe('light-kick');
    expect(sim.snapshot().comboHistory.slice(-1)[0]).toMatchObject({hits:count,usedStandingLightKick:true,active:true});
    for(let tick=0;tick<100;tick++) step();
    step(input('D','3'));
    expect(sim.snapshot().characters[player].attack?.moveId).toBe('crouch-light-kick');
  }
});

it.each([0, 1])('confirma 1,2,2 e emenda a ultimate pelo comando ou atalho: jogador %i', player => {
  for (const [method,distance,punches] of [['command',100,3],['shortcut',100,3],['command',250,3],['shortcut',250,3],['command',100,4],['shortcut',100,4]] as const) {
    const defs = player === 0 ? [cowboy,shoto] as const : [shoto,cowboy] as const;
    const sim = new Simulation(createGameConfig(1024,576),defs,{training:true,initialDistance:distance});
    sim.fillTrainingRage();
    const step=(value:FrameInput=input())=>sim.stepFrame(player===0?[value,input()]:[input(),value]);
    for (const button of (['1','2','2','2'] as const).slice(0,punches)) {
      step(input('N',button));
      for(let tick=0;tick<100&&!sim.snapshot().hitEvents.length;tick++)step();
      expect(sim.snapshot().hitEvents[0]).toMatchObject({moveId:button==='1'?'light-punch':'heavy-punch',outcome:'hit'});
      while(sim.snapshot().hitstopFramesRemaining)step();
    }
    if(method==='shortcut') step({...input(),ultimate:true});
    else {
      for(const direction of ['B','DB','D','DF','F'] as const) step(input(direction));
      step({direction:'F',buttons:new Set(['1','2'])});
    }
    for(let tick=0;tick<8&&!sim.snapshot().ultimateActivation;tick++)step();
    expect(sim.snapshot().ultimateActivation,method).toBeDefined();
    for(let tick=0;tick<240 && !sim.snapshot().recentContacts.some(c=>c.event.moveId==='bulls-eye');tick++) step();
    const combo=sim.snapshot().comboHistory.find(c=>c.attackerId===`player-${player+1}`);
    const ultimate = cowboy.moves.find(move => move.id === 'bulls-eye')!;
    expect(combo,method).toMatchObject({hits:punches+1,damage:20+(punches-1)*38+volleyShotDamage(ultimate,punches,0)});
    for(let tick=0;tick<500 && (sim.snapshot().comboHistory.find(c=>c.attackerId===`player-${player+1}`)?.hits ?? 0)<punches+6;tick++)step();
    expect(sim.snapshot().comboHistory.find(c=>c.attackerId===`player-${player+1}`),method)
      .toMatchObject({hits:punches+6,damage:20+(punches-1)*38+360-20*punches});
  }
});

it('distribui exatamente a redução da ultimate e não aplica dano negativo', () => {
  const ultimate = cowboy.moves.find(move => move.id === 'bulls-eye')!;
  const shots = (hits: number) => Array.from({length:6}, (_, shot) => volleyShotDamage(ultimate,hits,shot));
  expect(shots(0)).toEqual([60,60,60,60,60,60]);
  expect(shots(6)).toEqual([40,40,40,40,40,40]);
  expect(shots(4).reduce((sum,damage) => sum + damage,0)).toBe(280);
  expect(shots(18)).toEqual([0,0,0,0,0,0]);
  expect(shots(25)).toEqual([0,0,0,0,0,0]);
});

it.each([0, 1])('comando da ultimate exige movimento completo e rage: jogador %i', player => {
  const defs = player === 0 ? [cowboy,shoto] as const : [shoto,cowboy] as const;
  for (const [rage,directions,expected] of [[true,['B','DB','D','DF','F'],true],[false,['B','DB','D','DF','F'],false],[true,['D','DF','F'],false]] as const) {
    const sim=new Simulation(createGameConfig(1024,576),defs,{training:true,initialDistance:400});
    if (rage) sim.fillTrainingRage();
    const step=(value:FrameInput)=>sim.stepFrame(player===0?[value,input()]:[input(),value]);
    directions.forEach(direction=>step(input(direction)));
    step({direction:'F',buttons:new Set(['1','2'])});
    expect(Boolean(sim.snapshot().ultimateActivation)).toBe(expected);
  }
});

it.each([0, 1])('não reinicia os três chutes durante o mesmo combo confirmado: jogador %i', player => {
  const defs = player === 0 ? [cowboy, shoto] as const : [shoto, cowboy] as const;
  const sim = new Simulation(createGameConfig(1024, 576), defs, {training:true, initialDistance:65});
  const step = (value:FrameInput = input()) => sim.stepFrame(player === 0 ? [value,input()] : [input(),value]);
  for (let kick = 0; kick < 3; kick++) {
    step(input('N','3'));
    for (let tick = 0; tick < 60 && !sim.snapshot().hitEvents.length; tick++) step();
    expect(sim.snapshot().hitEvents[0]).toMatchObject({moveId:'light-kick',outcome:'hit'});
    while (sim.snapshot().hitstopFramesRemaining) step();
  }
  const previous = sim.snapshot().characters[player].attack;
  step(input('N','3'));
  expect(sim.snapshot().characters[player].attack?.elapsedFrames).toBeGreaterThan(previous!.elapsedFrames);
});

it.each([0, 1])('não cancela o soco fraco confirmado para outro soco fraco: jogador %i', player => {
  const defs = player === 0 ? [cowboy,shoto] as const : [shoto,cowboy] as const;
  const sim = new Simulation(createGameConfig(1024,576),defs,{training:true,initialDistance:65});
  const step=(value:FrameInput=input())=>sim.stepFrame(player===0?[value,input()]:[input(),value]);
  step(input('N','1'));
  for(let i=0;i<60 && !sim.snapshot().hitEvents.length;i++)step();
  expect(sim.snapshot().hitEvents[0]).toMatchObject({moveId:'light-punch',outcome:'hit'});
  while(sim.snapshot().hitstopFramesRemaining)step();
  const elapsed=sim.snapshot().characters[player].attack!.elapsedFrames;
  step(input('N','1'));
  expect(sim.snapshot().characters[player].attack!.elapsedFrames).toBeGreaterThan(elapsed);
});

it.each([0, 1])('permite o chute forte após os três chutes confirmados: jogador %i', player => {
  const defs = player === 0 ? [cowboy, shoto] as const : [shoto, cowboy] as const;
  const sim = new Simulation(createGameConfig(1024,576),defs,{training:true,initialDistance:65});
  const step = (value:FrameInput = input()) => sim.stepFrame(player === 0 ? [value,input()] : [input(),value]);
  for (let kick=0;kick<3;kick++) {
    step(input('N','3'));
    for (let tick=0;tick<60 && !sim.snapshot().hitEvents.length;tick++) step();
    expect(sim.snapshot().hitEvents[0]).toMatchObject({moveId:'light-kick',outcome:'hit'});
    while (sim.snapshot().hitstopFramesRemaining) step();
  }
  step(input('N','4'));
  expect(sim.snapshot().characters[player].attack?.moveId).toBe('heavy-kick');
});

it.each([0, 1])('depois de 3,3,3 o próximo golpe do combo não pode ser outro 3, mesmo com receita que começa com 3: jogador %i', player => {
  const texas = { ...cowboy, combos: [...cowboy.combos!, { id: 'dev-3-4', name: 'Teste', notation: '3,4', moveIds: ['light-kick', 'heavy-kick'] }] };
  const run = (next: '3' | '1') => {
    const sim = new Simulation(createGameConfig(1024,576), [texas,texas], {training:true,initialDistance:65});
    const step = (value:FrameInput = input()) => sim.stepFrame(player === 0 ? [value,input()] : [input(),value]);
    for (const button of ['3','3','3'] as const) {
      step(input('N',button));
      for (let tick=0;tick<80 && !sim.snapshot().hitEvents.length;tick++) step();
      while (sim.snapshot().hitstopFramesRemaining) step();
    }
    step(input('N',next)); step();
    return sim.snapshot().characters[player].attack;
  };
  expect(run('3')?.elapsedFrames).toBeGreaterThan(5);
  expect(run('1')?.moveId).toBe('light-punch');
});

it.each([0, 1])('cada golpe baixo reinicia a reação de dano da Cowboy: jogador %i', player => {
  const defs = [cowboy,cowboy] as const;
  const sim = new Simulation(createGameConfig(1024,576), defs, {training:true,initialDistance:65});
  const step = (value:FrameInput = input()) => sim.stepFrame(player === 0 ? [value,input()] : [input(),value]);
  let last = -1;
  for (const button of ['3','3','3'] as const) {
    step(input('N',button));
    for (let tick=0;tick<80 && !sim.snapshot().hitEvents.length;tick++) step();
    expect(sim.snapshot().hitEvents[0]?.outcome).toBe('hit');
    const reaction = sim.snapshot().characters[1-player].hitReaction;
    expect(reaction?.level).toBe('low');
    expect(reaction!.startedFrame).toBeGreaterThan(last);
    last = reaction!.startedFrame;
    while (sim.snapshot().hitstopFramesRemaining) step();
  }
});

it.each([0, 1])('um soco alto do Shoto seleciona a reação alta da Cowboy: jogador %i', player => {
  const defs = player === 0 ? [shoto,cowboy] as const : [cowboy,shoto] as const;
  const sim = new Simulation(createGameConfig(1024,576),defs,{training:true,initialDistance:65});
  const step=(value:FrameInput=input())=>sim.stepFrame(player===0?[value,input()]:[input(),value]);
  step(input('N','1'));
  for(let i=0;i<60 && !sim.snapshot().hitEvents.length;i++)step();
  expect(sim.snapshot().hitEvents[0]?.outcome).toBe('hit');
  expect(sim.snapshot().characters[1-player].hitReaction?.level).toBe('high');
});

it.each([0, 1])('cancela o soco fraco bloqueado para o combo de chutes: jogador %i', player => {
  const defs = player === 0 ? [cowboy, shoto] as const : [shoto, cowboy] as const;
  const sim = new Simulation(createGameConfig(1024, 576), defs, {training: true, initialDistance: 65});
  const step = (value: FrameInput) => sim.stepFrame(player === 0 ? [value, input('B')] : [input('B'), value]);
  step(input('N', '1'));
  for (let tick = 0; tick < 50 && !sim.snapshot().hitEvents.length; tick++) step(input());
  expect(sim.snapshot().hitEvents[0]?.outcome).toBe('block');
  while (sim.snapshot().hitstopFramesRemaining) step(input());
  step(input('N', '3'));
  expect(sim.snapshot().characters[player].attack?.moveId).toBe('light-kick');
});

it.each([0, 1])('encadeia 1,2,2,2 com dois tiros atrasados após acertos: jogador %i', player => {
  const defs = player === 0 ? [cowboy, shoto] as const : [shoto, cowboy] as const;
  const sim = new Simulation(createGameConfig(1024, 576), defs, { training: true, initialDistance: 100 });
  const step = (value: FrameInput) => sim.stepFrame(player === 0 ? [value, input('B')] : [input('B'), value]);
  // Defender só começa a defender após o primeiro impacto.
  const first = (value: FrameInput) => sim.stepFrame(player === 0 ? [value, input()] : [input(), value]);
  first(input('N', '1'));
  while (!sim.snapshot().hitEvents.length) first(input());
  while (sim.snapshot().hitstopFramesRemaining) first(input());
  for (const startup of [10, 24, 24]) {
    step(input('N', '2'));
    expect(sim.snapshot().characters[player].attack?.startupFrames).toBe(startup);
    let hit = false;
    for (let tick = 0; tick < 100; tick++) {
      step(input());
      if (sim.snapshot().hitEvents.some(event => event.moveId === 'heavy-punch' && event.outcome === 'hit')) { hit = true; break; }
    }
    expect(hit).toBe(true);
    while (sim.snapshot().hitstopFramesRemaining) step(input());
  }
  expect(sim.snapshot().characters[1 - player].health).toBe(866);
});

it.each([0, 1])('permite punir entre os tiros quando os primeiros foram bloqueados: jogador %i', player => {
  const defs = player === 0 ? [cowboy, shoto] as const : [shoto, cowboy] as const;
  const sim = new Simulation(createGameConfig(1024, 576), defs, { training: true, initialDistance: 65 });
  const step = (value: FrameInput, guard: FrameInput = input('B')) => sim.stepFrame(player === 0 ? [value, guard] : [guard, value]);
  for (const button of ['1', '2'] as const) {
    step(input('N', button));
    let blocked = false;
    for (let tick = 0; tick < 80; tick++) {
      step(input());
      if (sim.snapshot().hitEvents.some(event => event.outcome === 'block')) { blocked = true; break; }
    }
    expect(blocked).toBe(true);
    while (sim.snapshot().hitstopFramesRemaining) step(input());
  }
  step(input('N', '2'));
  expect(sim.snapshot().characters[player].attack?.startupFrames).toBe(24);
  let punished = false;
  for (let tick = 0; tick < 30; tick++) {
    const target = sim.snapshot().characters[1 - player];
    step(input(), target.mode === 'blockstun' ? input('B') : input('N', '1'));
    if (sim.snapshot().hitEvents.some(event => event.attackerId === `player-${2 - player}` && event.outcome === 'hit')) { punished = true; break; }
  }
  expect(punished).toBe(true);
});

it.each([0, 1])('tiro atrasado acerta quem solta a guarda depois dos dois primeiros: jogador %i', player => {
  const defs = player === 0 ? [cowboy, shoto] as const : [shoto, cowboy] as const;
  const sim = new Simulation(createGameConfig(1024, 576), defs, { training: true, initialDistance: 65 });
  const step = (value: FrameInput, guard: FrameInput = input('B')) => sim.stepFrame(player === 0 ? [value, guard] : [guard, value]);
  for (const button of ['1', '2'] as const) {
    step(input('N', button));
    for (let tick = 0; tick < 80; tick++) { step(input()); if (sim.snapshot().hitEvents.some(event => event.outcome === 'block')) break; }
    expect(sim.snapshot().hitEvents[0]?.outcome).toBe('block');
    while (sim.snapshot().hitstopFramesRemaining) step(input());
  }
  step(input('N', '2'));
  let hit = false;
  for (let tick = 0; tick < 60; tick++) {
    step(input(), input());
    if (sim.snapshot().hitEvents.some(event => event.moveId === 'heavy-punch' && event.outcome === 'hit')) { hit = true; break; }
  }
  expect(hit).toBe(true);
});

it.each([0, 1])('mantém confirmação dos projéteis em voo na sequência de longa distância: jogador %i', player => {
  const defs = player === 0 ? [cowboy, shoto] as const : [shoto, cowboy] as const;
  const sim = new Simulation(createGameConfig(1024, 576), defs, { training: true, initialDistance: 300 });
  const step = (value: FrameInput) => sim.stepFrame(player === 0 ? [value, input()] : [input(), value]);
  step(input('N', '1'));
  for (let tick = 0; tick < 12; tick++) step(input());
  step(input('N', '2'));
  for (let tick = 0; tick < 80 && !((sim.snapshot().characters[player].projectileComboHits ?? 0) & 2); tick++) step(input());
  expect((sim.snapshot().characters[player].projectileComboHits ?? 0) & 3).toBe(3);
  while (sim.snapshot().hitstopFramesRemaining) step(input());
  for (let shot = 0; shot < 2; shot++) {
    step(input('N', '2'));
    expect(sim.snapshot().characters[player].attack?.startupFrames).toBe(24);
    let hit = false;
    for (let tick = 0; tick < 100; tick++) {
      step(input());
      if (sim.snapshot().hitEvents.some(event => event.moveId === 'heavy-punch' && event.outcome === 'hit')) { hit = true; break; }
    }
    expect(hit).toBe(true);
    while (sim.snapshot().hitstopFramesRemaining) step(input());
  }
});

it.each([0,1])('permite quebrar o laço com o mesmo comando durante a captura: jogador %i', player => {
  for (const buttons of [['1','3'],['2','4']] as AttackButton[][]) {
    const defs=player===0?[cowboy,shoto] as const:[shoto,cowboy] as const;
    const sim=new Simulation(createGameConfig(1024,576),defs,{training:true,initialDistance:buttons[0] === '2' ? 65 : 100});
    const send=(attacker:FrameInput=input(),defender:FrameInput=input())=>sim.stepFrame(player===0?[attacker,defender]:[defender,attacker]);
    send({direction:'N',buttons:new Set(buttons)}); send();
    for(let i=0;i<40 && sim.snapshot().characters[1-player].grabbedStartedFrame===undefined;i++)send();
    expect(sim.snapshot().characters[1-player].mode).toBe('hitstun');
    const health=sim.snapshot().characters[1-player].health;
    send(input(),{direction:'N',buttons:new Set(buttons)});
    for(let i=0;i<30;i++)send();
    expect(sim.snapshot().characters[1-player].health).toBe(health);
    expect(sim.snapshot().recentContacts.filter(c=>c.event.moveId.startsWith('throw'))).toHaveLength(0);
  }
});

it.each([0,1])('mantém a captura por 15 quadros antes do arremesso: jogador %i', player => {
  const defs=player===0?[cowboy,cowboy] as const:[cowboy,cowboy] as const;
  const sim=new Simulation(createGameConfig(1024,576),defs,{training:true,initialDistance:100});
  const send=(attacker:FrameInput=input(),defender:FrameInput=input())=>sim.stepFrame(player===0?[attacker,defender]:[defender,attacker]);
  send({direction:'N',buttons:new Set(['1','3'])}); send();
  for(let i=0;i<40 && sim.snapshot().characters[1-player].grabbedStartedFrame===undefined;i++)send();
  const before=sim.snapshot().characters[1-player];
  for(let i=0;i<14;i++) {
    send();
    expect(sim.snapshot().characters[1-player]).toMatchObject({health:before.health, mode:'hitstun', grounded:true});
    expect(sim.snapshot().hitEvents).toHaveLength(0);
  }
  send();
  expect(sim.snapshot().hitEvents[0]).toMatchObject({moveId:'throw-13',outcome:'hit',damage:75});
  expect(sim.snapshot().characters[1-player].mode).toBe('knockdown');
});

it.each([0,1])('a direção para trás arremessa com 1+3 para o outro lado: jogador %i', player => {
  for (const buttons of [['1','3']] as AttackButton[][]) {
    const defs=player===0?[cowboy,shoto] as const:[shoto,cowboy] as const;
    const sim=new Simulation(createGameConfig(1024,576),defs,{training:true,initialDistance:65});
    const step=(value:FrameInput=input())=>sim.stepFrame(player===0?[value,input()]:[input(),value]);
    const initial=sim.snapshot().characters;
    const sign=initial[player].facing==='right'?1:-1;
    step({direction:'B',buttons:new Set(buttons)});
    for(let tick=0;tick<80&&!sim.snapshot().hitEvents.length;tick++)step();
    expect(sim.snapshot().hitEvents[0]).toMatchObject({outcome:'hit',pushbackDirection:sign>0?'left':'right'});
    for(let tick=0;tick<45;tick++)step();
    const states=sim.snapshot().characters;
    expect((states[1-player].x-states[player].x)*sign).toBeLessThan(0);
  }
});

it.each([0,1])('a dinamite explode no ar ao acertar ou terminar o alcance: jogador %i', player => {
  for (const [button,moveId] of [['1','quick-shot'],['2','heavy-shot']] as const) for (const distance of [65,300]) {
    const defs=player===0?[cowboy,shoto] as const:[shoto,cowboy] as const;
    const sim=new Simulation(createGameConfig(1024,576),defs,{training:true,initialDistance:distance});
    const step=(value:FrameInput=input())=>sim.stepFrame(player===0?[value,input()]:[input(),value]);
    for(const direction of ['D','DF','F'] as const)step(input(direction));
    step(input('F',button));
    let blast=false, hit=false;
    for(let tick=0;tick<100&&!blast;tick++) {
      step(); const snapshot=sim.snapshot();
      hit ||= snapshot.hitEvents.some(event=>event.moveId===moveId && event.outcome==='hit');
      const explosion=snapshot.explosions.find(item=>item.kind==='dynamite');
      if(explosion) { expect(explosion.y).toBeLessThan(createGameConfig(1024,576).arena.floorY); expect(explosion.ownerId).toBe(`player-${player + 1}`); blast=true; }
    }
    expect(blast).toBe(true);
    expect(hit).toBe(distance===65);
  }
});

it.each([0,1])('cada laço aceita apenas um botão correto na primeira tentativa: jogador %i', player => {
  for (const [chord,allowed,wrong] of [[['1','3'],['1','3'],['2','4']], [['2','4'],['2','4'],['1','3']]] as AttackButton[][][]) {
    for (const button of [...allowed,...wrong]) {
      const defs=player===0?[cowboy,shoto] as const:[shoto,cowboy] as const;
      const sim=new Simulation(createGameConfig(1024,576),defs,{training:true,initialDistance:65});
      const step=(attacker:FrameInput=input(),defender:FrameInput=input())=>sim.stepFrame(player===0?[attacker,defender]:[defender,attacker]);
      step({direction:'N',buttons:new Set(chord)}); step();
      for(let t=0;t<50&&sim.snapshot().characters[1-player].grabbedStartedFrame===undefined;t++)step();
      expect(sim.snapshot().characters[1-player].mode).toBe('hitstun');
      const health=sim.snapshot().characters[1-player].health;
      step(input(),input('N',button));
      if(wrong.includes(button)) { step(); step(input(),input('N',allowed[0])); }
      for(let t=0;t<75;t++)step();
      const target=sim.snapshot().characters[1-player];
      expect(target.health,`${chord.join('+')} e botão ${button}`).toBe(health-(wrong.includes(button)?(chord[0]==='1'?75:85):0));
    }
  }
});

it.each([0,1])('o agarrão 2+4 é próximo, rápido e não carrega: jogador %i', player => {
  const low=cowboy.moves.find(move=>move.id==='throw-24')!, normal=cowboy.moves.find(move=>move.id==='throw-13')!;
  expect(low.startup).toBe(18);
  expect(low.hitbox.forward + low.hitbox.width).toBeCloseTo((15 + 40) * 1.2);
  expect(low.hitLevel).toBe('mid'); expect(low.startup).toBeLessThan(normal.startup);
  expect(low.hitbox.width).toBeLessThan(normal.hitbox.width); expect(low.charge).toBeUndefined();
  for (const [distance,shouldHit] of [[65,true],[120,false],[160,false]] as const) {
    const defs=player===0?[cowboy,shoto] as const:[shoto,cowboy] as const;
    const sim=new Simulation(createGameConfig(1024,576),defs,{training:true,initialDistance:distance});
    const held:FrameInput={direction:'N',buttons:new Set(['2','4'])};
    const step=()=>sim.stepFrame(player===0?[held,input()]:[input(),held]);
    let capture=false;for(let t=0;t<100;t++){step(); if(sim.snapshot().characters[1-player].grabbedStartedFrame!==undefined)capture=true;}
    expect(capture).toBe(shouldHit);
    expect(sim.snapshot().characters[1-player].health).toBe(shouldHit?915:1000);
    if (shouldHit) expect(sim.snapshot().characters[1-player].x > sim.snapshot().characters[player].x).toBe(player === 0);
    if(shouldHit) expect(sim.snapshot().recentContacts.some(c=>c.event.moveId==='throw-24'&&c.event.outcome==='hit')).toBe(true);
  }
});

it.each([0,1])('o agarrão 2+4 mantém a captura, dispara e lança o alvo: jogador %i', player => {
  const defs=player===0?[cowboy,shoto] as const:[shoto,cowboy] as const;
  const sim=new Simulation(createGameConfig(1024,576),defs,{training:true,initialDistance:65});
  const step=(attack:FrameInput=input())=>sim.stepFrame(player===0?[attack,input()]:[input(),attack]);
  step({direction:'B',buttons:new Set(['2','4'])});
  let held=false, magic=false, horizontal=false, launched=false, landed=false;
  for(let tick=0;tick<110;tick++) {
    step(); const snapshot=sim.snapshot(), attacker=snapshot.characters[player], target=snapshot.characters[1-player];
    if(attacker.attack?.throwCapturedFrame!==undefined && attacker.attack.throwConfirmedFrame===undefined) {
      held=true; expect(target.health).toBe(1000); expect(target.grounded).toBe(true);
    }
    if(getCowboySpriteLayers(attacker,snapshot.frame).some(layer=>layer.texture==='cowboy-magic-down')) magic=true;
    if(getCowboySpriteLayers(attacker,snapshot.frame).some(layer=>layer.texture==='cowboy-magic-horizontal')) horizontal=true;
    if (attacker.attack?.throwConfirmedFrame !== undefined && snapshot.frame - attacker.attack.throwConfirmedFrame < 40) {
      expect(target.grounded).toBe(true);
      expect(target.health).toBe(1000);
    }
    if(attacker.attack?.throwConfirmedFrame!==undefined && !target.grounded) {
      launched=true; expect(target.mode).toBe('knockdown');
      expect(Math.sign(target.x-attacker.x)).toBe(player===0?1:-1);
    }
    if(launched && target.grounded && target.mode==='knockdown') landed=true;
  }
  expect({held,magic,horizontal,launched,landed}).toEqual({held:true,magic:true,horizontal:true,launched:true,landed:true});
});

it.each([0,1])('amplia somente a pose intermediária da vítima cowboy no agarrão 2+4: jogador %i', player => {
  const sim = new Simulation(createGameConfig(1024,576),[cowboy,cowboy],{training:true,initialDistance:65});
  const step=(value:FrameInput=input())=>sim.stepFrame(player===0?[value,input()]:[input(),value]);
  step({direction:'N',buttons:new Set(['2','4'])});
  let initial=false, middle=false, released=false;
  for (let tick=0; tick<120; tick++) {
    step(); const snapshot=sim.snapshot(), target=snapshot.characters[1-player];
    if (target.grabbedHold && target.grabbedStartedFrame !== undefined) {
      const age=snapshot.frame-target.grabbedStartedFrame;
      const pose=getCowboySpriteLayers(target,snapshot.frame)[0];
      if (age<16) { initial=true; expect(pose.texture).toBe('cowboy-grabbed'); expect(pose.scale).toBe(cowboySheetScale('grabbed')); }
      if (age>=16) { middle=true; expect(pose.scale).toBeCloseTo(cowboySheetScale(pose.texture.replace('cowboy-', ''), pose.frame) * 1.05, 9); }
    }
    if (middle && !target.grabbedHold) { released=true; break; }
  }
  expect({initial,middle,released}).toEqual({initial:true,middle:true,released:true});
});

it.each([0,1])('permite ao adversário pular durante a preparação do agarrão 2+4: jogador %i', player => {
  const defs=player===0?[cowboy,shoto] as const:[shoto,cowboy] as const;
  const sim=new Simulation(createGameConfig(1024,576),defs,{training:true,initialDistance:65});
  const step=(attacker:FrameInput, defender:FrameInput)=>sim.stepFrame(player===0?[attacker,defender]:[defender,attacker]);
  step({direction:'N',buttons:new Set(['2','4'])},input('U'));
  for(let tick=0;tick<35;tick++) step(input(),input());
  expect(sim.snapshot().characters[1-player].health).toBe(1000);
  expect(sim.snapshot().recentContacts.some(c=>c.event.moveId==='throw-24')).toBe(false);
});


it.each([0,1])('executa dois antiaéreos agachados no combo: jogador %i', player => {
  const definitions = player === 0 ? [cowboy, shoto] as const : [shoto, cowboy] as const;
  const sim = new Simulation(createGameConfig(1024,576), definitions, { training: true, initialDistance: 56 });
  const step = (value: FrameInput = input('D')) => sim.stepFrame(player === 0 ? [value, input()] : [input(), value]);
  for (let hit = 0; hit < 2; hit++) {
    step(input('D','2'));
    for (let tick = 0; tick < 100 && !sim.snapshot().hitEvents.some(event => event.moveId === 'anti-air'); tick++) step();
    expect(sim.snapshot().hitEvents.some(event => event.moveId === 'anti-air' && event.outcome === 'hit')).toBe(true);
    while (sim.snapshot().hitstopFramesRemaining) step();
  }
  expect(sim.snapshot().comboHistory.slice(-1)[0].hits).toBe(2);
});

it.each([0,1])('executa dois chutes fortes e tiro forte: jogador %i', player => {
  const definitions = player === 0 ? [cowboy, shoto] as const : [shoto, cowboy] as const;
  const sim = new Simulation(createGameConfig(1024,576), definitions, { training: true, initialDistance: 56 });
  const step = (value: FrameInput = input()) => sim.stepFrame(player === 0 ? [value, input()] : [input(), value]);
  for (const [button, move, startup] of [['4','heavy-kick',17], ['4','heavy-kick',12], ['2','heavy-punch',10]] as const) {
    step(input('N',button));
    expect(sim.snapshot().characters[player].attack?.startupFrames).toBe(startup);
    let hit = false;
    for (let tick = 0; tick < 150; tick++) {
      step();
      if (sim.snapshot().hitEvents.some(event => event.moveId === move && event.outcome === 'hit')) { hit = true; break; }
    }
    expect(hit, move).toBe(true);
    while (sim.snapshot().hitstopFramesRemaining) step();
  }
  expect(sim.snapshot().comboHistory.slice(-1)[0].hits).toBe(3);
});


it.each([0,1])('dispara dois projéteis simultâneos com 1+2: jogador %i', player => {
  const defs = player === 0 ? [cowboy,shoto] as const : [shoto,cowboy] as const;
  const sim = new Simulation(createGameConfig(1024,576),defs,{training:true,initialDistance:300});
  const step = (value:FrameInput=input()) => sim.stepFrame(player === 0 ? [value,input()] : [input(),value]);
  step({direction:'N',buttons:new Set(['1','2'])});
  for(let tick=0;tick<30 && sim.snapshot().projectiles.length<2;tick++) step();
  const shots=sim.snapshot().projectiles;
  expect(shots).toHaveLength(2);
  expect(shots.every(shot=>shot.attack.moveId==='double-shot')).toBe(true);
  expect(shots[0].x).toBe(shots[1].x);
  expect(Math.abs(shots[0].y-shots[1].y)).toBe(24);
  for(let tick=0;tick<80 && sim.snapshot().recentContacts.length<2;tick++)step();
  expect(sim.snapshot().recentContacts.filter(entry=>entry.event.moveId==='double-shot')).toHaveLength(2);
});

it('a gravidade ao apanhar no ar e ao ser levantado é a mesma do Bob (o pulo da Texas segue mais alto)', async () => {
  const { shoto } = await import('../engine/data/fighters/shoto');
  expect(cowboy.movement.jumpVelocity).toBeLessThan(shoto.movement.jumpVelocity);
  expect(cowboy.juggle).toEqual(shoto.juggle);
});
