import { expect, it } from 'vitest';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { texas } from '../engine/data/fighters/texas';
import type { FrameInput } from '../input/types';
import { texasSheetScale, getTexasRoundEndPose, settleAfterRound, getTexasSpriteLayers, getTexasSpritePose, getTexasUltimateActivationPose } from '../rendering/animations/texasSprites';
import chargeThrowAtlas from '../assets/sprites/characters/texas/high/charge-throw.atlas.json';

it.each([0, 1])('renders each defensive stance with spectral arms in front for player %i', player => {
  const state = new Simulation(createGameConfig(1024,576),[texas,texas]).snapshot().characters[player];
  for (const [grounded, crouching, body, arms] of [
    [true, false, 'texas-guard', 'texas-magic-guard'],
    [true, true, 'texas-crouch-guard', 'texas-magic-crouch-guard'],
    [false, false, 'texas-air-guard', 'texas-magic-guard'],
  ] as const) {
    const defending = {...state, grounded, crouching, mode:'blocking' as const, stateStartedFrame:100};
    const layers = getTexasSpriteLayers(defending,108);
    expect(layers.map(layer=>layer.texture)).toEqual([body, arms]);
    expect(layers[1]).toMatchObject({frame:2, flipX:player===1});
    expect(layers[1]).toMatchObject({scale:crouching ? 1.02 : 1.05,offsetY:crouching ? 25 : grounded ? 0 : 18});
    expect(getTexasSpriteLayers({...defending,mode:'blockstun'},108)[1].texture).toBe(arms);
    const from = {mode:'blocking' as const, stateStartedFrame:100, grounded, crouching, movementDirection:state.movementDirection, facing:state.facing, verticalVelocity:state.verticalVelocity};
    const leaving = {...state, grounded, crouching:false, mode:'neutral' as const, animationTransition:{from,startedFrame:110}};
    expect(getTexasSpriteLayers(leaving,111)[1]).toMatchObject({texture:arms,frame:3});
    expect(getTexasSpriteLayers(leaving,116)).toHaveLength(1);
    if (!grounded) expect(getTexasSpritePose(leaving,111)?.texture).toBe('texas-air-guard');
  }
});

it('uses the correct cells for every lasso charge frame', () => {
  expect(chargeThrowAtlas.meta.size).toEqual({ w: 3840, h: 2560 });
  for (let index = 0; index < 6; index++) {
    const frame = chargeThrowAtlas.frames[String(index) as keyof typeof chargeThrowAtlas.frames];
    expect(frame.frame).toEqual({ x: (index % 3) * 1280, y: Math.floor(index / 3) * 1280, w: 1280, h: 1280 });
  }
});

it.each([0,1])('uses the approved standing perfect-block and wall-bounce poses for player %i', player => {
  const state = new Simulation(createGameConfig(1024,576),[texas,texas]).snapshot().characters[player];
  const block = {...state, mode:'blockstun' as const, perfectBlockStartedFrame:100};
  expect(getTexasSpritePose(block,101)).toMatchObject({texture:'texas-perfect-block',frame:1});
  expect(getTexasSpritePose(block,105)).toMatchObject({texture:'texas-perfect-block',frame:2});
  expect(getTexasSpritePose({...block,crouching:true},105)?.texture).toBe('texas-crouch-guard');
  expect(getTexasSpritePose(block,113)?.texture).toBe('texas-guard');
  const bounce = {...state, mode:'hitstun' as const, grounded:false,
    wallBounceEffect:{x:state.x,y:state.y,frame:200,direction:1 as const}, hitReaction:{level:'mid' as const,startedFrame:190}};
  expect(getTexasSpritePose(bounce,200)).toMatchObject({texture:'texas-wall-bounce',frame:0});
  expect(getTexasSpritePose(bounce,218)).toMatchObject({texture:'texas-wall-bounce',frame:3});
  expect(getTexasSpritePose({...bounce,hitReaction:{level:'high',startedFrame:205}},206)?.texture).toBe('texas-hurt-high');
  expect(getTexasSpritePose(bounce,224)?.texture).toBe('texas-air-hurt');
});

it.each([0,1])('shows the heavy kick smear briefly before its clear impact pose for player %i', player => {
  const state = new Simulation(createGameConfig(1024,576),[texas,texas]).snapshot().characters[player];
  const move = texas.moves.find(candidate => candidate.id === 'heavy-kick')!;
  const attack = {moveId:move.id,buttons:move.input.buttons,elapsedFrames:move.startup - 1,hasHit:false};
  expect(getTexasSpritePose({...state,attack},0)).toMatchObject({texture:'texas-heavy-kick',frame:2,flipX:player===1});
  expect(getTexasSpritePose({...state,attack:{...attack,elapsedFrames:move.startup}},0)?.frame).toBe(3);
  expect(getTexasSpritePose({...state,attack:{...attack,elapsedFrames:move.startup + move.activeFrames}},0)?.frame).toBe(4);
});

it.each([0,1])('renders the round result using the correct orientation for player %i', player => {
  const state = new Simulation(createGameConfig(1024,576),[texas,texas]).snapshot().characters[player];
  expect(getTexasRoundEndPose(state,true,0)).toMatchObject({texture:'texas-victory',frame:0,flipX:player===1});
  expect(getTexasRoundEndPose(state,true,79)).toMatchObject({texture:'texas-victory',frame:5});
  expect(getTexasRoundEndPose(state,false,0)).toMatchObject({texture:'texas-defeat',frame:0});
  expect(getTexasRoundEndPose({...state,mode:'knockdown'},false,0)).toBeUndefined();
  expect(getTexasRoundEndPose({...state,grounded:false},true,0)).toBeUndefined();
});

it.each([0,1])('an airborne fighter keeps falling after the round ends and lands lying (loser) or standing (winner): player %i', player => {
  const state = new Simulation(createGameConfig(1024,576),[texas,texas]).snapshot().characters[player];
  const airborne = {...state, y: state.y - 60, grounded: false, verticalVelocity: -2, mode: 'hitstun' as const};
  const falling = settleAfterRound(airborne, 10, state.y, .55, true);
  expect(falling.grounded).toBe(false);
  expect(falling.y).toBeGreaterThan(airborne.y - 1);
  const lost = settleAfterRound(airborne, 40, state.y, .55, true);
  expect(lost).toMatchObject({y: state.y, grounded:true, verticalVelocity:0, mode:'knockdown'});
  expect(getTexasRoundEndPose(lost,false,0)).toBeUndefined();            // already lying: no standing defeat pose
  expect(getTexasSpritePose(lost, 0)?.texture).toBe('texas-fall-landing');   // shown lying, not getting up
  const won = settleAfterRound(airborne, 40, state.y, .55, false);
  expect(won).toMatchObject({grounded:true, mode:'neutral'});
  expect(getTexasRoundEndPose(won,true,0)?.texture).toBe('texas-victory');
  expect(settleAfterRound(airborne, 0, state.y, .55, true).y).toBe(airborne.y);   // it falls from where it was, with no jump
  expect(airborne.grounded).toBe(false);
});

it('keeps the round-end animation clock stable through the result and clears it on reset', () => {
  const config = createGameConfig(1024,576);
  const sim = new Simulation({...config,match:{...config.match,roundDurationFrames:1,roundEndPauseFrames:2}},[texas,texas]);
  const inputs: FrameInput[] = [{direction:'N',buttons:new Set()}, {direction:'N',buttons:new Set()}];
  sim.stepFrame(inputs);
  const ended = sim.snapshot();
  expect(ended.phase).toBe('round-over');
  expect(ended.roundEndedFrame).toBeDefined();
  sim.stepFrame(inputs);
  expect(sim.snapshot().roundEndedFrame).toBe(ended.roundEndedFrame);
  sim.resetMatch();
  expect(sim.snapshot().roundEndedFrame).toBeUndefined();
});

it.each([0,1])('plays the special idle after ten uninterrupted seconds for player %i', player => {
  const state = new Simulation(createGameConfig(1024,576),[texas,texas]).snapshot().characters[player];
  const idle = {...state, idleStartedFrame:20};
  expect(getTexasSpritePose(idle,619)?.texture).toBe('texas-idle');
  expect(getTexasSpritePose(idle,620)).toMatchObject({texture:'texas-idle-special',frame:0,flipX:player===1});
  expect(getTexasSpritePose(idle,629)?.frame).toBe(1);
  expect(getTexasSpritePose(idle,678)?.texture).toBe('texas-idle');
  expect(getTexasSpritePose(idle,1219)?.texture).toBe('texas-idle');
  expect(getTexasSpritePose(idle,1220)).toMatchObject({texture:'texas-idle-special',frame:0});
  expect(getTexasSpritePose(idle,1820)?.texture).toBe('texas-idle-special');
  expect(getTexasSpritePose({...idle,tauntStartedFrame:620},620)?.texture).toBe('texas-enter-taunt');
});

it('restarts the ten-second idle timer after a taunt', () => {
  const sim = new Simulation(createGameConfig(1024,576),[texas,texas],{training:true});
  const step = (taunt = false) => sim.advance(1000/60, () => [
    {direction:'N',buttons:new Set(),taunt}, {direction:'N',buttons:new Set()},
  ]);
  for (let i=0; i<610; i++) step();
  expect(getTexasSpritePose(sim.snapshot().characters[0],sim.snapshot().frame)?.texture).toBe('texas-idle-special');
  step(true);
  for (let i=0; i<132; i++) step();
  let snapshot = sim.snapshot();
  expect(getTexasSpritePose(snapshot.characters[0],snapshot.frame)?.texture).toBe('texas-idle');
  for (let i=0; i<598; i++) step();
  snapshot = sim.snapshot();
  expect(getTexasSpritePose(snapshot.characters[0],snapshot.frame)?.texture).toBe('texas-idle');
  for (let i=0; i<3; i++) step();
  snapshot = sim.snapshot();
  expect(getTexasSpritePose(snapshot.characters[0],snapshot.frame)?.texture).toBe('texas-idle-special');
});

it.each(['F','D','U'] as const)('restarts special idle after movement %s', direction => {
  const sim = new Simulation(createGameConfig(1024,576),[texas,texas],{training:true,initialDistance:300});
  const neutral: FrameInput = {direction:'N',buttons:new Set()};
  for (let tick = 0; tick < 610; tick++) sim.stepFrame([neutral,neutral]);
  let snapshot = sim.snapshot();
  expect(getTexasSpritePose(snapshot.characters[0],snapshot.frame)?.texture).toBe('texas-idle-special');
  sim.stepFrame([{direction,buttons:new Set()},neutral]);
  snapshot = sim.snapshot();
  expect(getTexasSpritePose(snapshot.characters[0],snapshot.frame)?.texture).not.toBe('texas-idle-special');
  for (let tick = 0; tick < 90 && (!snapshot.characters[0].grounded || snapshot.characters[0].mode !== 'neutral' || snapshot.characters[0].crouching); tick++) {
    sim.stepFrame([neutral,neutral]);
    snapshot = sim.snapshot();
  }
  expect(snapshot.characters[0].idleStartedFrame).toBeDefined();
  while (snapshot.frame - snapshot.characters[0].idleStartedFrame! < 599) {
    sim.stepFrame([neutral,neutral]);
    snapshot = sim.snapshot();
  }
  expect(getTexasSpritePose(snapshot.characters[0],snapshot.frame)?.texture).toBe('texas-idle');
  sim.stepFrame([neutral,neutral]);
  snapshot = sim.snapshot();
  expect(getTexasSpritePose(snapshot.characters[0],snapshot.frame)?.texture).toBe('texas-idle-special');
});

it('completa a provocação antes de retornar gradualmente ao repouso', () => {
  const state = new Simulation(createGameConfig(1024,576),[texas,texas]).snapshot().characters[0];
  const taunt={...state,tauntStartedFrame:0};
  for (const [offset,texture] of [[0,'texas-enter-taunt'],[44,'texas-taunt'],[88,'texas-exit-taunt']] as const) {
    for (let tick=0; tick<44; tick++) expect(getTexasSpritePose(taunt,offset + tick)).toMatchObject({texture,frame:Math.floor(tick * 6 / 44)});
  }
  expect(getTexasSpritePose({...state,tauntStartedFrame:undefined},132)?.texture).toBe('texas-idle');
});

it.each([0,1])('sincroniza seis poses próprias com os seis disparos da ultimate do jogador %i',player => {
  const state = new Simulation(createGameConfig(1024,576),[texas,texas]).snapshot().characters[player];
  expect(getTexasUltimateActivationPose(state,149)).toMatchObject({texture:'texas-exit-taunt',frame:5});
  for(let shot=0;shot<6;shot++) {
    const attacking={...state,attack:{moveId:'bulls-eye',buttons:[] as const,elapsedFrames:texas.moves.find(move=>move.id==='bulls-eye')!.startup+shot*18,hasHit:false}};
    expect(getTexasSpritePose(attacking,shot*18)).toMatchObject({texture:'texas-ultimate-body',frame:[0,1,2,3,4,5][shot],flipX:player===1});
    if (shot === 1 || shot === 3) expect(getTexasSpritePose({...attacking,attack:{...attacking.attack,elapsedFrames:attacking.attack.elapsedFrames+2}},shot*18+2)?.frame).toBe(shot+1);
  }
});

it.each([0,1])('desacelera a entrada e mantém o giro em movimento na ativação: jogador %i', player => {
  const state = new Simulation(createGameConfig(1024,576),[texas,texas]).snapshot().characters[player];
  expect(getTexasUltimateActivationPose(state,0)).toMatchObject({texture:'texas-enter-taunt',frame:0});
  expect(getTexasUltimateActivationPose(state,41)).toMatchObject({texture:'texas-enter-taunt',frame:5});
  let tick = 42;
  for (const [frame,duration] of [[0,12],[1,8],[2,8],[3,8],[1,8],[2,8],[3,8],[4,10],[5,20]] as const) {
    for (let offset=0; offset<duration; offset++) {
      expect(getTexasUltimateActivationPose(state,tick++)).toMatchObject({texture:'texas-taunt',frame,flipX:player===1});
    }
  }
  expect(tick).toBe(132);
  expect(getTexasUltimateActivationPose(state,132)).toMatchObject({texture:'texas-exit-taunt',frame:0});
  expect(getTexasUltimateActivationPose(state,149)).toMatchObject({texture:'texas-exit-taunt',frame:5});
});

it('anima a postura de carga e retorna ao tiro ao soltar', () => {
  const state = new Simulation(createGameConfig(1024,576),[texas,texas]).snapshot().characters[0];
  const charging = {...state,attack:{moveId:'heavy-punch',buttons:['2'] as const,elapsedFrames:13,hasHit:false,chargeFrames:14}};
  expect(getTexasSpritePose(charging,14)).toMatchObject({texture:'texas-charge-heavy-punch',frame:2});
  expect(getTexasSpritePose({...charging,attack:{...charging.attack,chargeFrames:22}},22)).toMatchObject({texture:'texas-charge-heavy-punch',frame:3});
  expect(getTexasSpritePose({...charging,attack:{...charging.attack,chargeReleased:true}},23)?.texture).toBe('texas-heavy-punch');
});

it.each([2,3,4])('mantém a folha alternada do combo durante a carga no golpe %i', length => {
  const state = new Simulation(createGameConfig(1024,576),[texas,texas]).snapshot().characters[0];
  const charging = {...state,chain:['light-punch',...Array(length-1).fill('heavy-punch')],
    attack:{moveId:'heavy-punch',buttons:['2'] as const,elapsedFrames:9,startupFrames:10,hasHit:false,chargeFrames:80}};
  expect(getTexasSpritePose(charging,80)?.texture).toBe(length % 2 ? 'texas-combo-right-shot' : 'texas-combo-left-shot');
});

it('holds the initial grab pose throughout the escape window, then falls', () => {
  const state = new Simulation(createGameConfig(1024,576),[texas,texas]).snapshot().characters[0];
  const captured = {...state, mode:'hitstun' as const, grabbedStartedFrame:40};
  for (let frame = 40; frame < 55; frame++) {
    expect(getTexasSpritePose({...captured, grabbedHold:true}, frame)).toMatchObject({ texture:'texas-grabbed', frame: 0, scale: texasSheetScale('grabbed') });
  }
  const pulled = {...captured, mode:'knockdown' as const, throwPull:{distancePerFrame:1,remainingFrames:5,launchDistance:100,launchFrames:20,liftSpeed:-5}};
  expect(getTexasSpritePose(pulled,55)).toMatchObject({ texture:'texas-grabbed', frame:0, scale: texasSheetScale('grabbed') });
  const normal = getTexasSpritePose({...captured, grabbedStartedFrame:undefined},60)!;
  const held = getTexasSpritePose({...captured, grabbedHold:true},60)!;
  expect(held.scale).toBeCloseTo(normal.scale * 1.05, 9);
  expect(getTexasSpritePose({...captured, mode:'knockdown'},55)?.texture).toBe('texas-knockdown');
});

it.each([['low','hurt-low'],['mid','hurt'],['high','hurt-high']] as const)('selects %s damage artwork and restarts it at each hit', (level, texture) => {
  const state = new Simulation(createGameConfig(1024,576),[texas,texas]).snapshot().characters[0];
  const hurt = {...state, mode:'hitstun' as const, hitReaction:{level,startedFrame:40}};
  const initial = getTexasSpritePose(hurt,40);
  expect(initial?.texture).toBe(`texas-${texture}`);
  expect(getTexasSpritePose(hurt,50)?.frame).not.toBe(initial?.frame);
  expect(getTexasSpritePose({...hurt,hitReaction:{level,startedFrame:50}},50)?.frame).toBe(initial?.frame);
});

it('uses a separate low reaction while crouching', () => {
  const state = new Simulation(createGameConfig(1024,576),[texas,texas]).snapshot().characters[0];
  const crouched = {...state,mode:'hitstun' as const,crouching:true,hitReaction:{level:'low' as const,startedFrame:40}};
  expect(getTexasSpritePose(crouched,40)?.texture).toBe('texas-crouch-hurt-low');
  expect(getTexasSpritePose({...crouched,hitReaction:{level:'mid',startedFrame:40}},40)?.texture).toBe('texas-crouch-hurt');
});

it.each([0, 1])('uses approved shots and three distinct stomp phases, mirrored for player %i', player => {
  const sim = new Simulation(createGameConfig(1024,576),[texas,texas],{training:true});
  const state = sim.snapshot().characters[player];
  const shot = { ...state, attack: { moveId:'light-punch',buttons:['1'] as const,elapsedFrames:0,hasHit:false } };
  expect(getTexasSpritePose(shot,0)).toMatchObject({texture:'texas-light-punch',frame:0,flipX:player===1});
  shot.attack.elapsedFrames=8;
  expect(getTexasSpritePose(shot,8)).toMatchObject({texture:'texas-light-punch',frame:2});
  shot.attack.elapsedFrames=11;
  expect(getTexasSpritePose(shot,11)?.frame).toBe(3);
  for (let i=1;i<=3;i++) {
    const stomp = {...state,chain:Array(i).fill('light-kick'),attack:{moveId:'light-kick',buttons:['3'] as const,elapsedFrames:10,hasHit:false}};
    expect(getTexasSpritePose(stomp,10)).toMatchObject({texture:'texas-light-kick',frame:i*2-1,flipX:player===1});
  }
});

it('uses the corrected two-gun anti-air during activity and the rising jump pose', () => {
  const state = new Simulation(createGameConfig(1024,576),[texas,texas]).snapshot().characters[0];
  const attack = {...state,attack:{moveId:'heavy-shot',buttons:['2'] as const,elapsedFrames:23,hasHit:false}};
  expect(getTexasSpritePose(attack,23)).toMatchObject({texture:'texas-dynamite-throw',frame:2});
  attack.attack.elapsedFrames=24;
  expect(getTexasSpritePose(attack,24)?.frame).toBe(3);
  expect(getTexasSpritePose({...state,grounded:false,verticalVelocity:-3,airborneElapsedFrames:12},12)?.frame).toBe(2);
});

it('selects the prepared texture for every authored attack through its active phase', () => {
  const state = new Simulation(createGameConfig(1024,576),[texas,texas]).snapshot().characters[0];
  for (const move of texas.moves) {
    const action = {...state,attack:{moveId:move.id,buttons:move.input.buttons,elapsedFrames:move.startup,hasHit:false}};
    const pose = getTexasSpritePose(action,move.startup);
    const texture = move.id === 'throw-24' ? 'throw-low' : move.category === 'throw' ? 'throw-active' : move.screenVolley ? 'ultimate-body' :
      ['quick-shot','heavy-shot'].includes(move.id) ? 'dynamite-throw' : move.id;
    expect(pose?.texture,move.id).toBe(`texas-${texture}`);
    expect(pose!.frame,move.id).toBeGreaterThanOrEqual(0);
    expect(pose!.frame,move.id).toBeLessThan(6);
  }
});

it('plays crouch and guard entry before holding their defensive pose', () => {
  const state = new Simulation(createGameConfig(1024,576),[texas,texas]).snapshot().characters[0];
  const crouch = {...state,mode:'crouching' as const,crouching:true,stateStartedFrame:10};
  expect(getTexasSpritePose(crouch,10)).toMatchObject({texture:'texas-crouch',frame:0});
  expect(getTexasSpritePose(crouch,12)?.frame).toBe(1);
  expect(getTexasSpritePose(crouch,14)?.frame).toBe(2);
  expect(getTexasSpritePose(crouch,16)).toMatchObject({texture:'texas-crouch',frame:2});
  expect(getTexasSpritePose(crouch,30)?.frame).toBe(3);
  const guard = {...crouch,mode:'blocking' as const};
  expect(getTexasSpritePose(guard,10)).toMatchObject({texture:'texas-crouch-guard',frame:0});
  expect(getTexasSpritePose(guard,14)?.frame).toBe(2);
});

it.each([0, 1])('stays crouched when a crouching attack recovers for player %i', player => {
  const state = new Simulation(createGameConfig(1024, 576), [texas, texas]).snapshot().characters[player];
  const from = {...state, mode: 'recovery' as const, crouching: true};
  const recovered = {...state, mode: 'crouching' as const, crouching: true,
    animationTransition: {startedFrame: 20, from}};
  for (let frame = 20; frame < 26; frame++) {
    expect(getTexasSpritePose(recovered, frame)?.frame).toBeGreaterThanOrEqual(2);
  }
});

it.each([0, 1])('plays distinct forward and backward dashes for player %i', player => {
  const state = new Simulation(createGameConfig(1024,576),[texas,texas]).snapshot().characters[player];
  for (const [direction, texture] of [['forward', 'texas-dash-forward'], ['backward', 'texas-dash-backward']] as const) {
    const dash = {...state, mode:'dashing' as const, movementDirection:direction, stateStartedFrame:20};
    expect(getTexasSpritePose(dash,20)).toMatchObject({texture, frame:0, flipX:player===1});
    expect(getTexasSpritePose(dash,30)?.frame).toBe(3);
    expect(getTexasSpritePose(dash,43)?.frame).toBe(5);
    expect(getTexasSpritePose(dash,40)?.frame).toBe(5);
    expect(getTexasSpritePose({...dash, grounded:false},20)).toMatchObject({texture:texture.replace('texas-dash-', 'texas-air-dash-'), frame:0, flipX:player===1});
  }
});

it.each(['idle','walk','crouch','air'] as const)('uses the authored %s turn in either direction without changing combat facing', kind => {
  const state = new Simulation(createGameConfig(1024,576),[texas,texas]).snapshot().characters[0];
  for (const from of ['left','right'] as const) {
    const facing: 'left' | 'right' = from === 'left' ? 'right' : 'left';
    const turning = {...state, facing, facingTransition:{from,startedFrame:20},
      grounded:kind !== 'air', crouching:kind === 'crouch', mode:kind === 'walk' ? 'moving' as const : 'neutral' as const};
    expect(getTexasSpritePose(turning,20)).toMatchObject({texture:`texas-turn-${kind}`,frame:0,flipX:from === 'left'});
    expect(getTexasSpritePose(turning,32)).toMatchObject({texture:`texas-turn-${kind}`,frame:5,flipX:from === 'left'});
    expect(getTexasSpritePose(turning,35)?.texture).not.toBe(`texas-turn-${kind}`);
    expect(turning.facing).toBe(facing);
  }
});

it.each([0, 1])('animates recovery after the last shot instead of holding the firing pose: player %i', player => {
  const state = new Simulation(createGameConfig(1024,576),[texas,texas]).snapshot().characters[player];
  const combo = {...state,chain:['light-punch','heavy-punch','heavy-punch','heavy-punch'],
    attack:{moveId:'heavy-punch',buttons:['2'] as const,elapsedFrames:24, startupFrames:24,hasHit:false}};
  expect(getTexasSpritePose(combo,24)).toMatchObject({texture:'texas-combo-left-shot',frame:2});
  expect(getTexasSpritePose({...combo,chain:combo.chain.slice(0,3)},24)).toMatchObject({texture:'texas-combo-right-shot',frame:2});
  const recovery = [28,34,42,53].map(elapsed=>{
    combo.attack.elapsedFrames=elapsed;
    return getTexasSpritePose(combo,elapsed)!.frame;
  });
  expect(recovery).toEqual([3,4,5,5]);
});

it.each([0, 1])('materializes arms around shots without making the fighter translucent: player %i', player => {
  const state = new Simulation(createGameConfig(1024,576),[texas,texas]).snapshot().characters[player];
  const shot = {...state, attack:{moveId:'light-punch',buttons:['1'] as const,elapsedFrames:0,hasHit:false}};
  expect(getTexasSpriteLayers(shot,0)).toHaveLength(1);
  for (const [elapsed, effectFrame] of [[2,0],[4,1],[6,2],[11,3],[13,4],[15,5]] as const) {
    shot.attack.elapsedFrames=elapsed;
    const layers=getTexasSpriteLayers(shot,elapsed);
    expect(layers).toHaveLength(2);
    expect(layers[0]).toMatchObject({texture:'texas-magic-horizontal',frame:effectFrame,flipX:player===1});
    expect(layers[1]).toMatchObject({texture:'texas-light-punch',alpha:1});
  }
  shot.attack.elapsedFrames=8;
  expect(getTexasSpriteLayers(shot,8)).toHaveLength(2);
  expect(getTexasSpriteLayers(state,0)).toHaveLength(1);
});

it.each([0, 1])('keeps the correctly oriented spectral arms during both special holds: player %i', player => {
  const state = new Simulation(createGameConfig(1024,576),[texas,texas]).snapshot().characters[player];
  for (const [moveId, button, startup, direction] of [['quick-shot','1',14,'throw'],['heavy-shot','2',23,'throw-up']] as const) {
    for (const [chargeFrames, effectFrame] of [[startup-1,2],[startup+7,2],[startup+15,2]] as const) {
      const held = {...state, attack:{moveId,buttons:[button],elapsedFrames:startup-1,chargeFrames,hasHit:false}};
      const layers = getTexasSpriteLayers(held,chargeFrames);
      expect(layers).toHaveLength(2);
      expect(layers[0]).toMatchObject({texture:`texas-magic-${direction}`,frame:effectFrame,flipX:player===1});
      expect(layers[1]).toMatchObject({texture:'texas-dynamite-throw',frame:1});
    }
  }
});

it.each([0, 1])('anima o laço e os braços do soco forte durante a carga: jogador %i', player => {
  const state = new Simulation(createGameConfig(1024,576),[texas,texas]).snapshot().characters[player];
  for (const [moveId,buttons] of [['throw-13',['1','3']]] as const) {
    const held = {...state,attack:{moveId,buttons,elapsedFrames:18,chargeFrames:24,hasHit:false}};
    expect(getTexasSpritePose(held,24)).toMatchObject({texture:'texas-charge-throw',frame:1,flipX:player===1});
    expect(getTexasSpritePose({...held,attack:{...held.attack,chargeReleased:true}},24)?.texture).toBe('texas-throw');
  }
  const heavy = {...state,attack:{moveId:'heavy-punch',buttons:['2'] as const,elapsedFrames:13,chargeFrames:30,hasHit:false}};
  expect(getTexasSpriteLayers(heavy,30)[0]).toMatchObject({texture:'texas-magic-horizontal',flipX:player===1});
  const combo = {...heavy,chain:['light-punch','heavy-punch']};
  expect(getTexasSpriteLayers(combo,30)).toHaveLength(2);
  expect(getTexasSpriteLayers(combo,30)[0].texture).toBe('texas-magic-horizontal');
});

it.each([0, 1])('usa recuperação própria apenas quando o laço erra: jogador %i', player => {
  const state = new Simulation(createGameConfig(1024,576),[texas,texas]).snapshot().characters[player];
  for (const [moveId,buttons] of [['throw-13',['1','3']]] as const) {
    const attack = {moveId,buttons,elapsedFrames:22,hasHit:false,chargeReleased:true};
    const missed = {...state,attack};
    expect(getTexasSpritePose(missed,22)).toMatchObject({texture:'texas-throw-miss',frame:0,flipX:player===1});
    expect(getTexasSpritePose({...missed,attack:{...attack,elapsedFrames:55}},55)?.frame).toBe(5);
    expect(getTexasSpritePose({...missed,attack:{...attack,hasHit:true,hitOutcome:'hit' as const}},22)?.texture).toBe('texas-throw');
  }
});

it('keeps Texas animation cadence deterministic at different display rates', () => {
  const run = (fps: number) => {
    const sim = new Simulation(createGameConfig(1024,576),[texas,texas],{training:true,initialDistance:80});
    const trace: unknown[] = [];
    for (let i=0;i<fps*3;i++) sim.advance(1000/fps,(_characters, frame)=>{
      const snapshot=sim.snapshot();
      trace.push(snapshot.characters.map(state=>getTexasSpriteLayers(state,snapshot.frame)));
      return [{direction:frame<35?'F':'N',buttons:new Set(frame===45?['1' as const]:[])}, {direction:'N',buttons:new Set()}];
    });
    return trace;
  };
  const reference=run(60);
  for (const fps of [30,120,144]) expect(run(fps)).toEqual(reference);
});

it.each([0,1])('mantém mãos espectrais diagonais durante o disparo antiaéreo do jogador %i', player => {
  const state = new Simulation(createGameConfig(1024,576),[texas,texas]).snapshot().characters[player];
  const move = texas.moves.find(candidate => candidate.id === 'anti-air')!;
  const attack = {...state, crouching:true, attack:{moveId:move.id,buttons:['2'] as const,elapsedFrames:move.startup,hasHit:false}};
  for (let elapsed=0; elapsed<move.startup+move.activeFrames+move.recovery; elapsed++) {
    expect(() => getTexasSpriteLayers({...attack,attack:{...attack.attack,elapsedFrames:elapsed}},elapsed)).not.toThrow();
  }
  expect(getTexasSpriteLayers(attack,move.startup)).toMatchObject([
    {texture:'texas-magic-up',frame:2,flipX:player===1},
    {texture:'texas-anti-air',frame:2,flipX:player===1},
  ]);
});

it.each([0,1])('anima o tiro final agachado com mãos espectrais horizontais para o jogador %i', player => {
  const state = new Simulation(createGameConfig(1024,576),[texas,texas]).snapshot().characters[player];
  const move = texas.moves.find(candidate => candidate.id === 'crouch-combo-shot')!;
  const attack = {...state,crouching:true,attack:{moveId:move.id,buttons:['1'] as const,elapsedFrames:move.startup,hasHit:false}};
  for (let elapsed=0; elapsed<move.startup+move.activeFrames+move.recovery; elapsed++) {
    expect(() => getTexasSpriteLayers({...attack,attack:{...attack.attack,elapsedFrames:elapsed}},elapsed)).not.toThrow();
  }
  expect(getTexasSpriteLayers(attack,move.startup)).toMatchObject([
    {texture:'texas-magic-horizontal',frame:2,offsetY:50,flipX:player===1},
    {texture:'texas-crouch-combo-shot',frame:2,flipX:player===1},
  ]);
});

it.each([0,1])('mostra a queda progressiva enquanto o empurrão desloca a Texas %i',player=>{
  const state=new Simulation(createGameConfig(1024,576),[texas,texas]).snapshot().characters[player];
  const pushed={...state,mode:'knockdown' as const,grounded:true,stateStartedFrame:100,pushbackMotion:{distancePerFrame:5,remainingFrames:12}};
  for(let age=0;age<12;age++) expect(getTexasSpritePose(pushed,100+age)).toMatchObject({texture:'texas-push-fall',frame:Math.floor(age/2),flipX:player===1});
  expect(getTexasSpritePose({...pushed,pushbackMotion:undefined},112)?.texture).toBe('texas-knockdown');
});


it.each([0,1])('usa folhas de tiro duplo, queda e levantamento para jogador %i', player => {
  const state = new Simulation(createGameConfig(1024,576),[texas,texas]).snapshot().characters[player];
  const shooting = {...state, attack: {moveId:'double-shot',buttons:['1','2'] as const,elapsedFrames:14,hasHit:false}};
  expect(getTexasSpritePose(shooting,14)).toMatchObject({texture:'texas-double-shot',frame:3,scale:texasSheetScale('double-shot'),flipX:player===1});
  expect(getTexasSpriteLayers(shooting,14).map(layer=>layer.texture)).toContain('texas-magic-horizontal');
  expect(getTexasSpritePose({...state,mode:'knockdown',remainingStateFrames:20},10)).toMatchObject({texture:'texas-fall-landing',frame:5,scale:texasSheetScale('fall-landing',5)});
  expect(getTexasSpritePose({...state,mode:'knockdown',grounded:false,remainingStateFrames:20,stateStartedFrame:10},10)).toMatchObject({texture:'texas-fall-landing',frame:0,scale:texasSheetScale('fall-landing',0),offsetY:0});
  expect(getTexasSpritePose({...state,mode:'knockdown',grounded:false,remainingStateFrames:20,stateStartedFrame:10},18)).toMatchObject({texture:'texas-fall-landing',frame:2,scale:texasSheetScale('fall-landing',2)});
  expect(getTexasSpritePose({...state,mode:'hitstun',grounded:false,juggle:{gravityScale:1,airHits:0}},10)).toMatchObject({texture:'texas-launch-hit',scale:texasSheetScale('launch-hit')});
  expect(getTexasSpritePose({...state,mode:'hitstun',grounded:false},10)).toMatchObject({texture:'texas-air-hurt',scale:texasSheetScale('air-hurt')});
});
