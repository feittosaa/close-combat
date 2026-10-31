import { expect, it } from 'vitest';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { cowboy } from '../engine/data/fighters/cowboy';
import { getCowboySpriteLayers, getCowboySpritePose, getCowboyUltimateActivationPose } from '../rendering/animations/cowboySprites';

it('completa a provocação antes de retornar gradualmente ao repouso', () => {
  const state = new Simulation(createGameConfig(1024,576),[cowboy,cowboy]).snapshot().characters[0];
  const taunt={...state,tauntStartedFrame:0};
  expect(getCowboySpritePose(taunt,35)).toMatchObject({texture:'cowboy-taunt',frame:5});
  expect(getCowboySpritePose(taunt,36)).toMatchObject({texture:'cowboy-exit-taunt',frame:0});
  expect(getCowboySpritePose(taunt,47)).toMatchObject({texture:'cowboy-exit-taunt',frame:5});
  expect(getCowboySpritePose({...state,tauntStartedFrame:undefined},48)?.texture).toBe('cowboy-idle');
});

it.each([0,1])('sincroniza seis poses próprias com os seis disparos da ultimate do jogador %i',player => {
  const state = new Simulation(createGameConfig(1024,576),[cowboy,cowboy]).snapshot().characters[player];
  expect(getCowboyUltimateActivationPose(state,149)).toMatchObject({texture:'cowboy-exit-taunt',frame:5});
  for(let shot=0;shot<6;shot++) {
    const attacking={...state,attack:{moveId:'bulls-eye',buttons:[] as const,elapsedFrames:1+shot*18,hasHit:false}};
    expect(getCowboySpritePose(attacking,shot*18)).toMatchObject({texture:'cowboy-ultimate-body',frame:shot,flipX:player===1});
  }
});

it('anima a postura de carga e retorna ao tiro ao soltar', () => {
  const state = new Simulation(createGameConfig(1024,576),[cowboy,cowboy]).snapshot().characters[0];
  const charging = {...state,attack:{moveId:'heavy-punch',buttons:['2'] as const,elapsedFrames:13,hasHit:false,chargeFrames:14}};
  expect(getCowboySpritePose(charging,14)).toMatchObject({texture:'cowboy-charge-heavy-punch',frame:2});
  expect(getCowboySpritePose({...charging,attack:{...charging.attack,chargeFrames:22}},22)).toMatchObject({texture:'cowboy-charge-heavy-punch',frame:3});
  expect(getCowboySpritePose({...charging,attack:{...charging.attack,chargeReleased:true}},23)?.texture).toBe('cowboy-heavy-punch');
});

it.each([2,3,4])('mantém a folha alternada do combo durante a carga no golpe %i', length => {
  const state = new Simulation(createGameConfig(1024,576),[cowboy,cowboy]).snapshot().characters[0];
  const charging = {...state,chain:['light-punch',...Array(length-1).fill('heavy-punch')],
    attack:{moveId:'heavy-punch',buttons:['2'] as const,elapsedFrames:9,startupFrames:10,hasHit:false,chargeFrames:80}};
  expect(getCowboySpritePose(charging,80)?.texture).toBe(length % 2 ? 'cowboy-combo-right-shot' : 'cowboy-combo-left-shot');
});

it('uses the standing grabbed reaction until the throw pulls the fighter away', () => {
  const state = new Simulation(createGameConfig(1024,576),[cowboy,cowboy]).snapshot().characters[0];
  const captured = {...state, mode:'knockdown' as const, grabbedStartedFrame:40};
  expect(getCowboySpritePose(captured,40)?.texture).toBe('cowboy-grabbed');
  expect(getCowboySpritePose(captured,47)?.texture).toBe('cowboy-grabbed');
  expect(getCowboySpritePose(captured,48)?.texture).toBe('cowboy-knockdown');
});

it.each([['low','hurt-low'],['mid','hurt'],['high','hurt-high']] as const)('selects %s damage artwork and restarts it at each hit', (level, texture) => {
  const state = new Simulation(createGameConfig(1024,576),[cowboy,cowboy]).snapshot().characters[0];
  const hurt = {...state, mode:'hitstun' as const, hitReaction:{level,startedFrame:40}};
  const initial = getCowboySpritePose(hurt,40);
  expect(initial?.texture).toBe(`cowboy-${texture}`);
  expect(getCowboySpritePose(hurt,50)?.frame).not.toBe(initial?.frame);
  expect(getCowboySpritePose({...hurt,hitReaction:{level,startedFrame:50}},50)?.frame).toBe(initial?.frame);
});

it('uses a separate low reaction while crouching', () => {
  const state = new Simulation(createGameConfig(1024,576),[cowboy,cowboy]).snapshot().characters[0];
  const crouched = {...state,mode:'hitstun' as const,crouching:true,hitReaction:{level:'low' as const,startedFrame:40}};
  expect(getCowboySpritePose(crouched,40)?.texture).toBe('cowboy-crouch-hurt-low');
  expect(getCowboySpritePose({...crouched,hitReaction:{level:'mid',startedFrame:40}},40)?.texture).toBe('cowboy-crouch-hurt');
});

it.each([0, 1])('uses approved shots and three distinct stomp phases, mirrored for player %i', player => {
  const sim = new Simulation(createGameConfig(1024,576),[cowboy,cowboy],{training:true});
  const state = sim.snapshot().characters[player];
  const shot = { ...state, attack: { moveId:'light-punch',buttons:['1'] as const,elapsedFrames:0,hasHit:false } };
  expect(getCowboySpritePose(shot,0)).toMatchObject({texture:'cowboy-light-punch',frame:0,flipX:player===1});
  shot.attack.elapsedFrames=8;
  expect(getCowboySpritePose(shot,8)).toMatchObject({texture:'cowboy-light-punch',frame:2});
  shot.attack.elapsedFrames=11;
  expect(getCowboySpritePose(shot,11)?.frame).toBe(3);
  for (let i=1;i<=3;i++) {
    const stomp = {...state,chain:Array(i).fill('light-kick'),attack:{moveId:'light-kick',buttons:['3'] as const,elapsedFrames:10,hasHit:false}};
    expect(getCowboySpritePose(stomp,10)).toMatchObject({texture:'cowboy-light-kick',frame:i*2-1,flipX:player===1});
  }
});

it('uses the corrected two-gun anti-air during activity and the rising jump pose', () => {
  const state = new Simulation(createGameConfig(1024,576),[cowboy,cowboy]).snapshot().characters[0];
  const attack = {...state,attack:{moveId:'heavy-shot',buttons:['2'] as const,elapsedFrames:23,hasHit:false}};
  expect(getCowboySpritePose(attack,23)).toMatchObject({texture:'cowboy-heavy-shot',frame:2});
  attack.attack.elapsedFrames=24;
  expect(getCowboySpritePose(attack,24)?.frame).toBe(3);
  expect(getCowboySpritePose({...state,grounded:false,verticalVelocity:-3,airborneElapsedFrames:12},12)?.frame).toBe(2);
});

it('selects a distinct prepared texture for every authored attack through its active phase', () => {
  const state = new Simulation(createGameConfig(1024,576),[cowboy,cowboy]).snapshot().characters[0];
  for (const move of cowboy.moves) {
    const action = {...state,attack:{moveId:move.id,buttons:move.input.buttons,elapsedFrames:move.startup,hasHit:false}};
    const pose = getCowboySpritePose(action,move.startup);
    expect(pose?.texture,move.id).toBe(`cowboy-${move.category === 'throw' ? 'throw' : move.screenVolley ? 'ultimate-body' : move.id}`);
    expect(pose!.frame,move.id).toBeGreaterThanOrEqual(0);
    expect(pose!.frame,move.id).toBeLessThan(6);
  }
});

it('plays crouch and guard entry before holding their defensive pose', () => {
  const state = new Simulation(createGameConfig(1024,576),[cowboy,cowboy]).snapshot().characters[0];
  const crouch = {...state,mode:'crouching' as const,crouching:true,stateStartedFrame:10};
  expect(getCowboySpritePose(crouch,10)).toMatchObject({texture:'cowboy-crouch',frame:0});
  expect(getCowboySpritePose(crouch,12)?.frame).toBe(1);
  expect(getCowboySpritePose(crouch,14)?.frame).toBe(2);
  expect(getCowboySpritePose(crouch,16)).toMatchObject({texture:'cowboy-crouch',frame:2});
  expect(getCowboySpritePose(crouch,30)?.frame).toBe(3);
  const guard = {...crouch,mode:'blocking' as const};
  expect(getCowboySpritePose(guard,10)).toMatchObject({texture:'cowboy-crouch-guard',frame:0});
  expect(getCowboySpritePose(guard,14)?.frame).toBe(2);
});

it.each([0, 1])('stays crouched when a crouching attack recovers for player %i', player => {
  const state = new Simulation(createGameConfig(1024, 576), [cowboy, cowboy]).snapshot().characters[player];
  const from = {...state, mode: 'recovery' as const, crouching: true};
  const recovered = {...state, mode: 'crouching' as const, crouching: true,
    animationTransition: {startedFrame: 20, from}};
  for (let frame = 20; frame < 26; frame++) {
    expect(getCowboySpritePose(recovered, frame)?.frame).toBeGreaterThanOrEqual(2);
  }
});

it.each([0, 1])('plays distinct forward and backward dashes for player %i', player => {
  const state = new Simulation(createGameConfig(1024,576),[cowboy,cowboy]).snapshot().characters[player];
  for (const [direction, texture] of [['forward', 'cowboy-dash-forward'], ['backward', 'cowboy-dash-backward']] as const) {
    const dash = {...state, mode:'dashing' as const, movementDirection:direction, stateStartedFrame:20};
    expect(getCowboySpritePose(dash,20)).toMatchObject({texture, frame:0, flipX:player===1});
    expect(getCowboySpritePose(dash,30)?.frame).toBe(3);
    expect(getCowboySpritePose(dash,43)?.frame).toBe(5);
    expect(getCowboySpritePose(dash,40)?.frame).toBe(5);
    expect(getCowboySpritePose({...dash, grounded:false},20)).toMatchObject({texture:texture.replace('cowboy-dash-', 'cowboy-air-dash-'), frame:0, flipX:player===1});
  }
});

it.each(['idle','walk','crouch','air'] as const)('uses the authored %s turn in either direction without changing combat facing', kind => {
  const state = new Simulation(createGameConfig(1024,576),[cowboy,cowboy]).snapshot().characters[0];
  for (const from of ['left','right'] as const) {
    const facing: 'left' | 'right' = from === 'left' ? 'right' : 'left';
    const turning = {...state, facing, facingTransition:{from,startedFrame:20},
      grounded:kind !== 'air', crouching:kind === 'crouch', mode:kind === 'walk' ? 'moving' as const : 'neutral' as const};
    expect(getCowboySpritePose(turning,20)).toMatchObject({texture:`cowboy-turn-${kind}`,frame:0,flipX:from === 'left'});
    expect(getCowboySpritePose(turning,30)).toMatchObject({texture:`cowboy-turn-${kind}`,frame:5,flipX:from === 'left'});
    expect(getCowboySpritePose(turning,32)?.texture).not.toBe(`cowboy-turn-${kind}`);
    expect(turning.facing).toBe(facing);
  }
});

it.each([0, 1])('animates recovery after the last shot instead of holding the firing pose: player %i', player => {
  const state = new Simulation(createGameConfig(1024,576),[cowboy,cowboy]).snapshot().characters[player];
  const combo = {...state,chain:['light-punch','heavy-punch','heavy-punch','heavy-punch'],
    attack:{moveId:'heavy-punch',buttons:['2'] as const,elapsedFrames:24, startupFrames:24,hasHit:false}};
  expect(getCowboySpritePose(combo,24)).toMatchObject({texture:'cowboy-combo-left-shot',frame:2});
  expect(getCowboySpritePose({...combo,chain:combo.chain.slice(0,3)},24)).toMatchObject({texture:'cowboy-combo-right-shot',frame:2});
  const recovery = [28,34,42,53].map(elapsed=>{
    combo.attack.elapsedFrames=elapsed;
    return getCowboySpritePose(combo,elapsed)!.frame;
  });
  expect(recovery).toEqual([3,4,5,5]);
});

it.each([0, 1])('materializes arms around shots without making the fighter translucent: player %i', player => {
  const state = new Simulation(createGameConfig(1024,576),[cowboy,cowboy]).snapshot().characters[player];
  const shot = {...state, attack:{moveId:'light-punch',buttons:['1'] as const,elapsedFrames:0,hasHit:false}};
  expect(getCowboySpriteLayers(shot,0)).toHaveLength(1);
  for (const [elapsed, effectFrame] of [[2,0],[4,1],[6,2],[11,3],[13,4],[15,5]] as const) {
    shot.attack.elapsedFrames=elapsed;
    const layers=getCowboySpriteLayers(shot,elapsed);
    expect(layers).toHaveLength(2);
    expect(layers[0]).toMatchObject({texture:'cowboy-magic-horizontal',frame:effectFrame,flipX:player===1});
    expect(layers[1]).toMatchObject({texture:'cowboy-light-punch',alpha:1});
  }
  shot.attack.elapsedFrames=8;
  expect(getCowboySpriteLayers(shot,8)).toHaveLength(2);
  expect(getCowboySpriteLayers(state,0)).toHaveLength(1);
});

it('keeps Cowboy animation cadence deterministic at different display rates', () => {
  const run = (fps: number) => {
    const sim = new Simulation(createGameConfig(1024,576),[cowboy,cowboy],{training:true,initialDistance:80});
    const trace: unknown[] = [];
    for (let i=0;i<fps*3;i++) sim.advance(1000/fps,(_characters, frame)=>{
      const snapshot=sim.snapshot();
      trace.push(snapshot.characters.map(state=>getCowboySpriteLayers(state,snapshot.frame)));
      return [{direction:frame<35?'F':'N',buttons:new Set(frame===45?['1' as const]:[])}, {direction:'N',buttons:new Set()}];
    });
    return trace;
  };
  const reference=run(60);
  for (const fps of [30,120,144]) expect(run(fps)).toEqual(reference);
});
