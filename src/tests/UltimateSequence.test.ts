import { expect, it } from 'vitest';
import { Simulation } from '../engine/simulation/Simulation';
import { shoto } from '../engine/data/fighters/shoto';
import { createGameConfig } from '../engine/data/gameConfig';
import { ULTIMATE_ACTIVATION_FRAMES } from '../engine/combat/ultimateActivation';
import { validateStage } from '../rendering/stages/StageDefinition';
import { stages, defaultStage } from '../rendering/stages/stageCatalog';
import { createStageLayout, getStageArenaBounds, getFightCameraFrame } from '../rendering/stages/stageLayout';
import type { AttackButton, Direction, FrameInput } from '../input/types';
const input=(direction:Direction='N',buttons:readonly AttackButton[]=[]):FrameInput=>({direction,buttons:new Set(buttons)});
const N=input();const config=createGameConfig(1024,576);
const create=(distance=200)=>new Simulation(config,undefined,{training:true,initialDistance:distance});
function step(sim:Simulation,value=N,player=0,target=N){const values=[target,target];values[player]=value;sim.stepFrame(values);}
function wait(sim:Simulation,count:number){for(let i=0;i<count;i++)step(sim);}
function command(sim:Simulation,id:string,player=0,target=N){
  const move=shoto.moves.find(m=>m.id===id)!;const sequence=move.input.sequence??[];
  sequence.slice(0,-1).forEach(direction=>step(sim,input(direction),player));
  step(sim,input(sequence[sequence.length-1]??'N',move.input.buttons),player,target);
}
function contact(sim:Simulation,stage:'confirm'|'explosion',player=0,target=N){
  for(let i=0;i<240;i++){
    const event=sim.snapshot().hitEvents.find(e=>e.stage===stage&&e.attackerId===`player-${player+1}`);
    if(event)return event;step(sim,N,player,target);
  }
  throw new Error(`Missing ${stage} contact`);
}

it('freezes the round clock and entire world for exactly six activation ticks, for any ultimate',()=>{
  const fighter={...shoto,id:'activation-fixture',rage:{...shoto.rage!,onHit:100}};
  const sim=new Simulation(config,[fighter,fighter],{initialDistance:56});
  command(sim,'light-punch');wait(sim,90);
  expect(sim.snapshot().characters[0].rage).toBe(100);
  const motion=shoto.moves.find(m=>m.id==='wine-ultimate')!.input.sequence!;
  motion.slice(0,-1).forEach(d=>step(sim,input(d)));
  const before=sim.snapshot();step(sim,input('F',['1','2']),0,input('UF',['4']));
  const started=sim.snapshot();expect(started.ultimateActivation?.elapsedFrames).toBe(0);
  expect(started.characters[1]).toEqual(before.characters[1]);
  expect(started.roundFramesRemaining).toBe(before.roundFramesRemaining);
  for(let tick=1;tick<ULTIMATE_ACTIVATION_FRAMES;tick++){
    step(sim,input('UF',['1']),0,input('UB',['4']));const frozen=sim.snapshot();
    expect(frozen.characters).toEqual(started.characters);
    expect(frozen.projectiles).toEqual(started.projectiles);
    expect(frozen.frame).toBe(started.frame);
    expect(frozen.roundFramesRemaining).toBe(before.roundFramesRemaining);
    expect(frozen.ultimateActivation?.elapsedFrames).toBe(tick);
  }
  step(sim);expect(sim.snapshot().ultimateActivation).toBeUndefined();
  expect(sim.snapshot().frame).toBe(started.frame+1);
  expect(sim.snapshot().roundFramesRemaining).toBe(before.roundFramesRemaining-1);
});

it('freezes already flying projectiles, and simultaneous ultimates share one activation interval',()=>{
  const sim=create(350);sim.fillTrainingRage();command(sim,'wine-bottle',1);wait(sim,20);
  expect(sim.snapshot().projectiles).toHaveLength(1);
  command(sim,'wine-ultimate');const started=sim.snapshot();
  for(let i=0;i<5;i++){step(sim);expect(sim.snapshot().projectiles).toEqual(started.projectiles);}
  const both=create();both.fillTrainingRage();
  for(const direction of ['B','DB','D','DF','F'] as Direction[]){
    const value=input(direction,direction==='F'?['1','2']:[]);both.stepFrame([value,value]);
  }
  expect(both.snapshot().ultimateActivation?.ownerIds).toEqual(['player-1','player-2']);
  wait(both,5);expect(both.snapshot().ultimateActivation?.elapsedFrames).toBe(5);
  step(both);expect(both.snapshot().ultimateActivation).toBeUndefined();
});

it.each([0,1])('bottle confirms, lighter explodes once for 280 and physically knocks player %i down',player=>{
  const sim=create();sim.fillTrainingRage();command(sim,'wine-ultimate',player);
  expect(contact(sim,'confirm',player)).toMatchObject({damage:0,outcome:'hit',defenderStunFrames:120});
  expect(sim.snapshot().characters[1-player].health).toBe(1000);
  // Six combat frames of throw preparation, independently of the five hitstop ticks.
  wait(sim,10);expect(sim.snapshot().projectiles.some(p=>p.phase==='lighter')).toBe(false);
  const explosion=contact(sim,'explosion',player);expect(explosion.damage).toBe(280);expect(explosion.defenderStunFrames).toBe(44);
  const target=sim.snapshot().characters[1-player];
  expect(target).toMatchObject({health:720,mode:'knockdown',grounded:false});
  expect(target.verticalVelocity).toBe(-5);expect(target.knockdown).toBeDefined();
  expect(sim.snapshot().explosions).toHaveLength(1);
  const x=target.x;wait(sim,30);const down=sim.snapshot().characters[1-player];
  expect(Math.abs(down.x-x)).toBeGreaterThan(40);expect(down.grounded).toBe(true);expect(down.mode).toBe('knockdown');
  wait(sim,30);expect(sim.snapshot().characters[1-player].mode).toBe('neutral');
  expect(sim.snapshot().characters[1-player].health).toBe(720);
  expect(sim.snapshot().explosions).toHaveLength(0);
});

it('guarding or missing the bottle never creates the lighter or deals explosion damage',()=>{
  const blocked=create();blocked.fillTrainingRage();command(blocked,'wine-ultimate');
  expect(contact(blocked,'confirm',0,input('B'))).toMatchObject({outcome:'block',damage:0});
  wait(blocked,160);expect(blocked.snapshot().recentContacts.some(c=>c.event.stage==='explosion')).toBe(false);
  expect(blocked.snapshot().characters[1].health).toBe(1000);
  const outOfLine={...shoto,collision:{...shoto.collision,hurtboxes:{...shoto.collision.hurtboxes,
    standing:{...shoto.collision.hurtboxes.standing,offsetY:-1000}}}};
  const miss=new Simulation(config,[shoto,outOfLine],{training:true,initialDistance:350});
  miss.fillTrainingRage();command(miss,'wine-ultimate');wait(miss,170);
  expect(miss.snapshot().recentContacts).toHaveLength(0);
  expect(miss.snapshot().projectiles).toHaveLength(0);
  expect(miss.snapshot().characters[1].health).toBe(1000);
});

it('reset clears activation, confirmations, lighter, knockdown and explosion state',()=>{
  const sim=create();sim.fillTrainingRage();command(sim,'wine-ultimate');sim.resetMatch();
  expect(sim.snapshot().ultimateActivation).toBeUndefined();
  sim.fillTrainingRage();command(sim,'wine-ultimate');contact(sim,'confirm');sim.resetMatch();wait(sim,160);
  expect(sim.snapshot().projectiles).toHaveLength(0);expect(sim.snapshot().recentContacts).toHaveLength(0);
  sim.fillTrainingRage();command(sim,'wine-ultimate');contact(sim,'explosion');sim.resetMatch();
  expect(sim.snapshot().explosions).toHaveLength(0);expect(sim.snapshot().characters.every(c=>!c.knockdown&&c.mode==='neutral')).toBe(true);
});

it('keeps the KO launch alive until the defender reaches the floor',()=>{
  const fighter={...shoto,maxHealth:280,rage:{...shoto.rage!,onHit:100}};
  const sim=new Simulation(config,[fighter,fighter],{initialDistance:56});
  command(sim,'light-punch');wait(sim,80);command(sim,'wine-ultimate');contact(sim,'explosion');wait(sim,6);
  expect(sim.snapshot().phase).toBe('fight');
  wait(sim,30);expect(sim.snapshot().phase).toBe('round-over');expect(sim.snapshot().characters[1].grounded).toBe(true);
});

it('gives the glass a shallow arc and bottle a visibly higher arc, using the same collision coordinates',()=>{
  const heights:number[]=[];
  for(const id of ['wine-glass','wine-bottle']){
    const sim=create(400);command(sim,id);const move=shoto.moves.find(m=>m.id===id)!;
    wait(sim,move.startup);const first=sim.snapshot().projectiles[0];
    expect(first).toBeDefined();const y=first.y;
    wait(sim,10);const later=sim.snapshot().projectiles[0];
    expect(later.y).toBeLessThan(y);heights.push(y-later.y);
    const box=sim.snapshot().activeHitboxes.find(b=>b.attackId===id)!;
    expect(box.y).toBeCloseTo(later.y+move.hitbox.yOffset);
    wait(sim,Math.ceil(-move.projectile!.verticalSpeed!/move.projectile!.gravity!)+2-11);expect(sim.snapshot().projectiles[0].verticalVelocity).toBeGreaterThan(0);
  }
  expect(heights[1]).toBeGreaterThan(heights[0]*3);
});

it('requires ultrawide backgrounds, removes every bar prop and compensates the background magnification',()=>{
  for(const stage of stages){
    expect(stage.referenceSize.width/stage.referenceSize.height).toBeGreaterThanOrEqual(21/9);
    const layout=createStageLayout(stage,1024,576,488);
    // At output resolution, backgrounds expand at most 1.6x instead of the old ~2x close crop.
    expect(layout.scale*1.6*1920/1024).toBeLessThan(1.6);
    expect(()=>validateStage({...stage,referenceSize:{width:1920,height:1080}})).toThrow();
  }
  expect(defaultStage.layers.map(l=>l.id)).toEqual(['bar']);
});


it('reaches both actual panorama walls when the opponent follows, without dragging a stationary fighter',()=>{
  for(const stage of stages){
    const layout=createStageLayout(stage,1024,576,488);
    const arena={...config.arena,...getStageArenaBounds(layout)};
    const sim=new Simulation({...config,arena},undefined,{training:true,initialDistance:96});
    const opponentX=sim.snapshot().characters[1].x;
    for(let i=0;i<600;i++)step(sim,input('B'));
    expect(sim.snapshot().characters[1].x).toBe(opponentX);
    expect(sim.snapshot().characters[0].x).toBeGreaterThan(24);
    for(let i=0;i<600;i++)step(sim,input('B'),0,input('F'));
    expect(sim.snapshot().characters[0].x-shoto.collision.bodyWidth/2).toBeCloseTo(0);
    for(let i=0;i<1200;i++)step(sim,input('F'),0,input('B'));
    expect(sim.snapshot().characters[1].x+shoto.collision.bodyWidth/2).toBeCloseTo(layout.worldWidth);
  }
});

it.each([0,1])('captures an airborne defender upright, waits for landing and explodes after the lighter: player %i',player=>{
  const sim=create(200);sim.fillTrainingRage();
  step(sim,input('U'),1-player);
  command(sim,'wine-ultimate',player);
  contact(sim,'confirm',player);
  const confirmed=sim.snapshot().characters[1-player];
  expect(confirmed.grounded).toBe(false);
  expect(confirmed.ultimateCapture).toEqual({ownerId:`player-${player+1}`});
  expect(confirmed.verticalVelocity).toBeGreaterThanOrEqual(0);
  const x=confirmed.x;let landed=false,launched=false,previousY=confirmed.y;
  for(let tick=0;tick<180;tick++){
    step(sim,N,player,input('UB',['4']));
    const snapshot=sim.snapshot();const target=snapshot.characters[1-player];
    if(snapshot.hitEvents.some(e=>e.stage==='explosion')){
      expect(landed).toBe(true);expect(launched).toBe(true);
      expect(target.ultimateCapture).toBeUndefined();expect(target.mode).toBe('knockdown');
      expect(target.health).toBe(720);return;
    }
    expect(target.mode).toBe('hitstun');expect(target.attack).toBeUndefined();expect(target.crouching).toBe(false);
    expect(target.x).toBe(x);expect(target.y).toBeGreaterThanOrEqual(previousY);previousY=target.y;
    if(target.grounded)landed=true;
    if(snapshot.projectiles.some(p=>p.phase==='lighter')){
      expect(target.grounded).toBe(true);launched=true;
      expect(snapshot.characters[player].ultimateThrowStartedFrame).toBeDefined();
    }
  }
  throw new Error('Air confirmation never reached its explosion');
});

it.each([0,1])('throws the ultimate bottle across maximum separation in under half a second: player %i',player=>{
  const sim=create(config.arena.maxSeparation!);sim.fillTrainingRage();command(sim,'wine-ultimate',player);
  wait(sim,ULTIMATE_ACTIVATION_FRAMES);
  const launched=sim.snapshot();expect(Math.abs(launched.projectiles[0].velocity)).toBe(18);
  const started=launched.frame;contact(sim,'confirm',player);
  expect(sim.snapshot().frame-started).toBeLessThanOrEqual(30);
  expect(contact(sim,'explosion',player).damage).toBe(280);
});

it('keeps the complete knocked-down body inside the fixed viewport at maximum separation',()=>{
  for(const player of [0,1]){
    const layout=createStageLayout(defaultStage,1024,576,488);
    const sim=new Simulation({...config,arena:{...config.arena,...getStageArenaBounds(layout)}},undefined,{training:true,initialDistance:512});
    sim.fillTrainingRage();command(sim,'wine-ultimate',player);contact(sim,'explosion',player);
    for(let tick=0;tick<65;tick++){
      const states=sim.snapshot().characters;
      const camera=getFightCameraFrame(layout,states.map(c=>c.x),states.map(c=>c.y));
      const projected=(x:number)=>512+(x-camera.scrollX-512)*camera.zoom;
      for(const state of states){
        const radius=state.mode==='knockdown'?state.collision.hurtboxes.knockdown.width/2+6:38;
        expect(projected(state.x-radius)).toBeGreaterThanOrEqual(0);
        expect(projected(state.x+radius)).toBeLessThanOrEqual(1024);
      }
      step(sim);
    }
  }
});
