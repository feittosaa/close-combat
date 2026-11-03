import { expect, it } from 'vitest';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { cowboy } from '../engine/data/fighters/cowboy';
import type { FrameInput } from '../input/types';
import { getCowboyRoundEndPose, getCowboyRoundEndPresentation, hasCowboyExited, getCowboySpriteLayers, getCowboySpritePose, getCowboyUltimateActivationPose } from '../rendering/animations/cowboySprites';
import chargeThrowAtlas from '../assets/sprites/characters/cowboy/high/charge-throw.atlas.json';

it('uses the correct cells for every lasso charge frame', () => {
  expect(chargeThrowAtlas.meta.size).toEqual({ w: 3840, h: 2560 });
  for (let index = 0; index < 6; index++) {
    const frame = chargeThrowAtlas.frames[String(index) as keyof typeof chargeThrowAtlas.frames];
    expect(frame.frame).toEqual({ x: (index % 3) * 1280, y: Math.floor(index / 3) * 1280, w: 1280, h: 1280 });
  }
});

it.each([0,1])('uses the approved standing perfect-block and wall-bounce poses for player %i', player => {
  const state = new Simulation(createGameConfig(1024,576),[cowboy,cowboy]).snapshot().characters[player];
  const block = {...state, mode:'blockstun' as const, perfectBlockStartedFrame:100};
  expect(getCowboySpritePose(block,101)).toMatchObject({texture:'cowboy-perfect-block',frame:1});
  expect(getCowboySpritePose(block,105)).toMatchObject({texture:'cowboy-perfect-block',frame:2});
  expect(getCowboySpritePose({...block,crouching:true},105)?.texture).toBe('cowboy-crouch-guard');
  expect(getCowboySpritePose(block,113)?.texture).toBe('cowboy-guard');
  const bounce = {...state, mode:'hitstun' as const, grounded:false,
    wallBounceEffect:{x:state.x,y:state.y,frame:200,direction:1 as const}, hitReaction:{level:'mid' as const,startedFrame:190}};
  expect(getCowboySpritePose(bounce,200)).toMatchObject({texture:'cowboy-wall-bounce',frame:0});
  expect(getCowboySpritePose(bounce,218)).toMatchObject({texture:'cowboy-wall-bounce',frame:3});
  expect(getCowboySpritePose({...bounce,hitReaction:{level:'high',startedFrame:205}},206)?.texture).toBe('cowboy-hurt-high');
  expect(getCowboySpritePose(bounce,224)?.texture).toBe('cowboy-air-hurt');
});

it.each([0,1])('shows the heavy kick smear briefly before its clear impact pose for player %i', player => {
  const state = new Simulation(createGameConfig(1024,576),[cowboy,cowboy]).snapshot().characters[player];
  const move = cowboy.moves.find(candidate => candidate.id === 'heavy-kick')!;
  const attack = {moveId:move.id,buttons:move.input.buttons,elapsedFrames:move.startup - 1,hasHit:false};
  expect(getCowboySpritePose({...state,attack},0)).toMatchObject({texture:'cowboy-heavy-kick',frame:2,flipX:player===1});
  expect(getCowboySpritePose({...state,attack:{...attack,elapsedFrames:move.startup}},0)?.frame).toBe(3);
  expect(getCowboySpritePose({...state,attack:{...attack,elapsedFrames:move.startup + move.activeFrames}},0)?.frame).toBe(4);
});

it.each([0,1])('renders the round result using the correct orientation for player %i', player => {
  const state = new Simulation(createGameConfig(1024,576),[cowboy,cowboy]).snapshot().characters[player];
  expect(getCowboyRoundEndPose(state,true,0)).toMatchObject({texture:'cowboy-victory',frame:0,flipX:player===1});
  expect(getCowboyRoundEndPose(state,true,79)).toMatchObject({texture:'cowboy-victory',frame:5});
  expect(getCowboyRoundEndPose(state,true,80)).toMatchObject({texture:'cowboy-victory-exit',frame:0});
  const exit = getCowboyRoundEndPose(state,true,140)!;
  expect(exit.texture).toBe('cowboy-victory-exit');
  expect(Math.sign(exit.offsetX)).toBe(player === 0 ? -1 : 1);
  expect(getCowboyRoundEndPose(state,false,0)).toMatchObject({texture:'cowboy-defeat',frame:0});
  expect(getCowboyRoundEndPose({...state,mode:'knockdown'},false,0)).toBeUndefined();
  expect(getCowboyRoundEndPose({...state,grounded:false},true,0)).toBeUndefined();
});

it.each([0,1])('waits for player %i to leave the camera after victory', player => {
  const state = new Simulation(createGameConfig(1024,576),[cowboy,cowboy]).snapshot().characters[player];
  const view = {left: 0, right: 1024};
  expect(hasCowboyExited(state, 140, state.y, .55, view)).toBe(false);
  expect(hasCowboyExited(state, 1000, state.y, .55, view)).toBe(true);
  expect(hasCowboyExited({...state, grounded:false, y:state.y - 60, verticalVelocity:-2}, 0, state.y, .55, view)).toBe(false);
});

it.each([0,1])('lands visually before the round result for airborne player %i', player => {
  const state = new Simulation(createGameConfig(1024,576),[cowboy,cowboy]).snapshot().characters[player];
  const airborne = {...state, y: state.y - 60, grounded: false, verticalVelocity: -2};
  const falling = getCowboyRoundEndPresentation(airborne, 10, state.y, .55);
  expect(falling.state.grounded).toBe(false);
  expect(getCowboyRoundEndPose(falling.state,true,falling.elapsed)).toBeUndefined();
  const landed = getCowboyRoundEndPresentation(airborne, 40, state.y, .55);
  expect(landed.state).toMatchObject({y: state.y, grounded:true, verticalVelocity:0});
  expect(getCowboyRoundEndPose(landed.state,true,landed.elapsed)?.texture).toBe('cowboy-victory');
  expect(airborne.grounded).toBe(false);
  expect(airborne.y).toBe(state.y - 60);
});

it('keeps the round-end animation clock stable through the result and clears it on reset', () => {
  const config = createGameConfig(1024,576);
  const sim = new Simulation({...config,match:{...config.match,roundDurationFrames:1,roundEndPauseFrames:2}},[cowboy,cowboy]);
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
  const state = new Simulation(createGameConfig(1024,576),[cowboy,cowboy]).snapshot().characters[player];
  const idle = {...state, idleStartedFrame:20};
  expect(getCowboySpritePose(idle,619)?.texture).toBe('cowboy-idle');
  expect(getCowboySpritePose(idle,620)).toMatchObject({texture:'cowboy-idle-special',frame:0,flipX:player===1});
  expect(getCowboySpritePose(idle,629)?.frame).toBe(1);
  expect(getCowboySpritePose(idle,678)?.texture).toBe('cowboy-idle');
  expect(getCowboySpritePose(idle,1219)?.texture).toBe('cowboy-idle');
  expect(getCowboySpritePose(idle,1220)).toMatchObject({texture:'cowboy-idle-special',frame:0});
  expect(getCowboySpritePose(idle,1820)?.texture).toBe('cowboy-idle-special');
  expect(getCowboySpritePose({...idle,tauntStartedFrame:620},620)?.texture).toBe('cowboy-enter-taunt');
});

it('restarts the ten-second idle timer after a taunt', () => {
  const sim = new Simulation(createGameConfig(1024,576),[cowboy,cowboy],{training:true});
  const step = (taunt = false) => sim.advance(1000/60, () => [
    {direction:'N',buttons:new Set(),taunt}, {direction:'N',buttons:new Set()},
  ]);
  for (let i=0; i<610; i++) step();
  expect(getCowboySpritePose(sim.snapshot().characters[0],sim.snapshot().frame)?.texture).toBe('cowboy-idle-special');
  step(true);
  for (let i=0; i<132; i++) step();
  let snapshot = sim.snapshot();
  expect(getCowboySpritePose(snapshot.characters[0],snapshot.frame)?.texture).toBe('cowboy-idle');
  for (let i=0; i<598; i++) step();
  snapshot = sim.snapshot();
  expect(getCowboySpritePose(snapshot.characters[0],snapshot.frame)?.texture).toBe('cowboy-idle');
  for (let i=0; i<3; i++) step();
  snapshot = sim.snapshot();
  expect(getCowboySpritePose(snapshot.characters[0],snapshot.frame)?.texture).toBe('cowboy-idle-special');
});

it.each(['F','D','U'] as const)('restarts special idle after movement %s', direction => {
  const sim = new Simulation(createGameConfig(1024,576),[cowboy,cowboy],{training:true,initialDistance:300});
  const neutral: FrameInput = {direction:'N',buttons:new Set()};
  for (let tick = 0; tick < 610; tick++) sim.stepFrame([neutral,neutral]);
  let snapshot = sim.snapshot();
  expect(getCowboySpritePose(snapshot.characters[0],snapshot.frame)?.texture).toBe('cowboy-idle-special');
  sim.stepFrame([{direction,buttons:new Set()},neutral]);
  snapshot = sim.snapshot();
  expect(getCowboySpritePose(snapshot.characters[0],snapshot.frame)?.texture).not.toBe('cowboy-idle-special');
  for (let tick = 0; tick < 90 && (!snapshot.characters[0].grounded || snapshot.characters[0].mode !== 'neutral' || snapshot.characters[0].crouching); tick++) {
    sim.stepFrame([neutral,neutral]);
    snapshot = sim.snapshot();
  }
  expect(snapshot.characters[0].idleStartedFrame).toBeDefined();
  while (snapshot.frame - snapshot.characters[0].idleStartedFrame! < 599) {
    sim.stepFrame([neutral,neutral]);
    snapshot = sim.snapshot();
  }
  expect(getCowboySpritePose(snapshot.characters[0],snapshot.frame)?.texture).toBe('cowboy-idle');
  sim.stepFrame([neutral,neutral]);
  snapshot = sim.snapshot();
  expect(getCowboySpritePose(snapshot.characters[0],snapshot.frame)?.texture).toBe('cowboy-idle-special');
});

it('completa a provocação antes de retornar gradualmente ao repouso', () => {
  const state = new Simulation(createGameConfig(1024,576),[cowboy,cowboy]).snapshot().characters[0];
  const taunt={...state,tauntStartedFrame:0};
  for (const [offset,texture] of [[0,'cowboy-enter-taunt'],[44,'cowboy-taunt'],[88,'cowboy-exit-taunt']] as const) {
    for (let tick=0; tick<44; tick++) expect(getCowboySpritePose(taunt,offset + tick)).toMatchObject({texture,frame:Math.floor(tick * 6 / 44)});
  }
  expect(getCowboySpritePose({...state,tauntStartedFrame:undefined},132)?.texture).toBe('cowboy-idle');
});

it.each([0,1])('sincroniza seis poses próprias com os seis disparos da ultimate do jogador %i',player => {
  const state = new Simulation(createGameConfig(1024,576),[cowboy,cowboy]).snapshot().characters[player];
  expect(getCowboyUltimateActivationPose(state,149)).toMatchObject({texture:'cowboy-exit-taunt',frame:5});
  for(let shot=0;shot<6;shot++) {
    const attacking={...state,attack:{moveId:'bulls-eye',buttons:[] as const,elapsedFrames:1+shot*18,hasHit:false}};
    expect(getCowboySpritePose(attacking,shot*18)).toMatchObject({texture:'cowboy-ultimate-body',frame:[0,1,2,3,4,5][shot],flipX:player===1});
    if (shot === 1 || shot === 3) expect(getCowboySpritePose({...attacking,attack:{...attacking.attack,elapsedFrames:attacking.attack.elapsedFrames+2}},shot*18+2)?.frame).toBe(shot+1);
  }
});

it.each([0,1])('desacelera a entrada e mantém o giro em movimento na ativação: jogador %i', player => {
  const state = new Simulation(createGameConfig(1024,576),[cowboy,cowboy]).snapshot().characters[player];
  expect(getCowboyUltimateActivationPose(state,0)).toMatchObject({texture:'cowboy-enter-taunt',frame:0});
  expect(getCowboyUltimateActivationPose(state,41)).toMatchObject({texture:'cowboy-enter-taunt',frame:5});
  let tick = 42;
  for (const [frame,duration] of [[0,12],[1,8],[2,8],[3,8],[1,8],[2,8],[3,8],[4,10],[5,20]] as const) {
    for (let offset=0; offset<duration; offset++) {
      expect(getCowboyUltimateActivationPose(state,tick++)).toMatchObject({texture:'cowboy-taunt',frame,flipX:player===1});
    }
  }
  expect(tick).toBe(132);
  expect(getCowboyUltimateActivationPose(state,132)).toMatchObject({texture:'cowboy-exit-taunt',frame:0});
  expect(getCowboyUltimateActivationPose(state,149)).toMatchObject({texture:'cowboy-exit-taunt',frame:5});
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

it('holds the initial grab pose throughout the escape window, then falls', () => {
  const state = new Simulation(createGameConfig(1024,576),[cowboy,cowboy]).snapshot().characters[0];
  const captured = {...state, mode:'hitstun' as const, grabbedStartedFrame:40};
  for (let frame = 40; frame < 55; frame++) {
    expect(getCowboySpritePose({...captured, grabbedHold:true}, frame)).toMatchObject({ texture:'cowboy-grabbed', frame: 0, scale: 1 });
  }
  const pulled = {...captured, mode:'knockdown' as const, throwPull:{distancePerFrame:1,remainingFrames:5,launchDistance:100,launchFrames:20,liftSpeed:-5}};
  expect(getCowboySpritePose(pulled,55)).toMatchObject({ texture:'cowboy-grabbed', frame:0, scale:1 });
  const normal = getCowboySpritePose({...captured, grabbedStartedFrame:undefined},60)!;
  const held = getCowboySpritePose({...captured, grabbedHold:true},60)!;
  expect(held.scale).toBeCloseTo(normal.scale * 1.05);
  expect(getCowboySpritePose({...captured, mode:'knockdown'},55)?.texture).toBe('cowboy-knockdown');
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
  expect(getCowboySpritePose(attack,23)).toMatchObject({texture:'cowboy-dynamite-throw',frame:2});
  attack.attack.elapsedFrames=24;
  expect(getCowboySpritePose(attack,24)?.frame).toBe(3);
  expect(getCowboySpritePose({...state,grounded:false,verticalVelocity:-3,airborneElapsedFrames:12},12)?.frame).toBe(2);
});

it('selects the prepared texture for every authored attack through its active phase', () => {
  const state = new Simulation(createGameConfig(1024,576),[cowboy,cowboy]).snapshot().characters[0];
  for (const move of cowboy.moves) {
    const action = {...state,attack:{moveId:move.id,buttons:move.input.buttons,elapsedFrames:move.startup,hasHit:false}};
    const pose = getCowboySpritePose(action,move.startup);
    const texture = move.id === 'throw-24' ? 'throw-low' : move.category === 'throw' ? 'throw-active' : move.screenVolley ? 'ultimate-body' :
      ['quick-shot','heavy-shot'].includes(move.id) ? 'dynamite-throw' : move.id;
    expect(pose?.texture,move.id).toBe(`cowboy-${texture}`);
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
    expect(getCowboySpritePose(turning,32)).toMatchObject({texture:`cowboy-turn-${kind}`,frame:5,flipX:from === 'left'});
    expect(getCowboySpritePose(turning,35)?.texture).not.toBe(`cowboy-turn-${kind}`);
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

it.each([0, 1])('keeps the correctly oriented spectral arms during both special holds: player %i', player => {
  const state = new Simulation(createGameConfig(1024,576),[cowboy,cowboy]).snapshot().characters[player];
  for (const [moveId, button, startup, direction] of [['quick-shot','1',14,'throw'],['heavy-shot','2',23,'throw-up']] as const) {
    for (const [chargeFrames, effectFrame] of [[startup-1,2],[startup+7,2],[startup+15,2]] as const) {
      const held = {...state, attack:{moveId,buttons:[button],elapsedFrames:startup-1,chargeFrames,hasHit:false}};
      const layers = getCowboySpriteLayers(held,chargeFrames);
      expect(layers).toHaveLength(2);
      expect(layers[0]).toMatchObject({texture:`cowboy-magic-${direction}`,frame:effectFrame,flipX:player===1});
      expect(layers[1]).toMatchObject({texture:'cowboy-dynamite-throw',frame:1});
    }
  }
});

it.each([0, 1])('anima o laço e os braços do soco forte durante a carga: jogador %i', player => {
  const state = new Simulation(createGameConfig(1024,576),[cowboy,cowboy]).snapshot().characters[player];
  for (const [moveId,buttons] of [['throw-13',['1','3']]] as const) {
    const held = {...state,attack:{moveId,buttons,elapsedFrames:18,chargeFrames:24,hasHit:false}};
    expect(getCowboySpritePose(held,24)).toMatchObject({texture:'cowboy-charge-throw',frame:1,flipX:player===1});
    expect(getCowboySpritePose({...held,attack:{...held.attack,chargeReleased:true}},24)?.texture).toBe('cowboy-throw');
  }
  const heavy = {...state,attack:{moveId:'heavy-punch',buttons:['2'] as const,elapsedFrames:13,chargeFrames:30,hasHit:false}};
  expect(getCowboySpriteLayers(heavy,30)[0]).toMatchObject({texture:'cowboy-magic-horizontal',flipX:player===1});
  const combo = {...heavy,chain:['light-punch','heavy-punch']};
  expect(getCowboySpriteLayers(combo,30)).toHaveLength(2);
  expect(getCowboySpriteLayers(combo,30)[0].texture).toBe('cowboy-magic-horizontal');
});

it.each([0, 1])('usa recuperação própria apenas quando o laço erra: jogador %i', player => {
  const state = new Simulation(createGameConfig(1024,576),[cowboy,cowboy]).snapshot().characters[player];
  for (const [moveId,buttons] of [['throw-13',['1','3']]] as const) {
    const attack = {moveId,buttons,elapsedFrames:22,hasHit:false,chargeReleased:true};
    const missed = {...state,attack};
    expect(getCowboySpritePose(missed,22)).toMatchObject({texture:'cowboy-throw-miss',frame:0,flipX:player===1});
    expect(getCowboySpritePose({...missed,attack:{...attack,elapsedFrames:55}},55)?.frame).toBe(5);
    expect(getCowboySpritePose({...missed,attack:{...attack,hasHit:true,hitOutcome:'hit' as const}},22)?.texture).toBe('cowboy-throw');
  }
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

it.each([0,1])('mantém mãos espectrais diagonais durante o disparo antiaéreo do jogador %i', player => {
  const state = new Simulation(createGameConfig(1024,576),[cowboy,cowboy]).snapshot().characters[player];
  const move = cowboy.moves.find(candidate => candidate.id === 'anti-air')!;
  const attack = {...state, crouching:true, attack:{moveId:move.id,buttons:['2'] as const,elapsedFrames:move.startup,hasHit:false}};
  for (let elapsed=0; elapsed<move.startup+move.activeFrames+move.recovery; elapsed++) {
    expect(() => getCowboySpriteLayers({...attack,attack:{...attack.attack,elapsedFrames:elapsed}},elapsed)).not.toThrow();
  }
  expect(getCowboySpriteLayers(attack,move.startup)).toMatchObject([
    {texture:'cowboy-magic-up',frame:2,flipX:player===1},
    {texture:'cowboy-anti-air',frame:2,flipX:player===1},
  ]);
});

it.each([0,1])('anima o tiro final agachado com mãos espectrais horizontais para o jogador %i', player => {
  const state = new Simulation(createGameConfig(1024,576),[cowboy,cowboy]).snapshot().characters[player];
  const move = cowboy.moves.find(candidate => candidate.id === 'crouch-combo-shot')!;
  const attack = {...state,crouching:true,attack:{moveId:move.id,buttons:['1'] as const,elapsedFrames:move.startup,hasHit:false}};
  for (let elapsed=0; elapsed<move.startup+move.activeFrames+move.recovery; elapsed++) {
    expect(() => getCowboySpriteLayers({...attack,attack:{...attack.attack,elapsedFrames:elapsed}},elapsed)).not.toThrow();
  }
  expect(getCowboySpriteLayers(attack,move.startup)).toMatchObject([
    {texture:'cowboy-magic-horizontal',frame:2,offsetY:50,flipX:player===1},
    {texture:'cowboy-crouch-combo-shot',frame:2,flipX:player===1},
  ]);
});

it.each([0,1])('mostra a queda progressiva enquanto o empurrão desloca a Cowboy %i',player=>{
  const state=new Simulation(createGameConfig(1024,576),[cowboy,cowboy]).snapshot().characters[player];
  const pushed={...state,mode:'knockdown' as const,grounded:true,stateStartedFrame:100,pushbackMotion:{distancePerFrame:5,remainingFrames:12}};
  for(let age=0;age<12;age++) expect(getCowboySpritePose(pushed,100+age)).toMatchObject({texture:'cowboy-push-fall',frame:Math.floor(age/2),flipX:player===1});
  expect(getCowboySpritePose({...pushed,pushbackMotion:undefined},112)?.texture).toBe('cowboy-knockdown');
});
