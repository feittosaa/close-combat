import { expect, it } from 'vitest';
import { characters } from '../engine/data/characters';
import { routeInputs, type RouteStep } from '../training/comboRoute';
import { TUTORIAL_DISTANCE, tutorialGameConfig } from '../training/tutorialLessons';
import { Simulation } from '../engine/simulation/Simulation';
import { shoto } from '../engine/data/fighters/shoto';
import { createGameConfig } from '../engine/data/gameConfig';
import { ULTIMATE_ACTIVATION_FRAMES } from '../engine/combat/ultimateActivation';
import { validateStage } from '../rendering/stages/StageDefinition';
import { stages, defaultStage } from '../rendering/stages/stageCatalog';
import { createStageLayout, getStageArenaBounds } from '../rendering/stages/stageLayout';
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
it.each([0, 1])('plays the complete ultimate activation when ultimate follows two confirmed punches: player %i', player => {
  const sim=create(96); sim.fillTrainingRage();
  for (let punch=0; punch<2; punch++) {
    step(sim,input('N',['1']),player);
    let hit=false;
    for (let tick=0; tick<80; tick++) {
      const event=sim.snapshot().hitEvents.find(e=>e.attackerId===`player-${player+1}` && e.moveId==='light-punch');
      if (event) { expect(event.outcome).toBe('hit'); hit=true; break; }
      step(sim,N,player);
    }
    expect(hit).toBe(true);
  }
  command(sim,'crow-ultimate',player);
  for (let tick=0; tick<30 && !sim.snapshot().ultimateActivation; tick++) step(sim,N,player);
  const started=sim.snapshot();
  expect(started.ultimateActivation).toMatchObject({ownerIds:[`player-${player+1}`],elapsedFrames:0});
  expect(started.characters[player].attack?.moveId).toBe('crow-ultimate');
  expect(started.projectiles).toHaveLength(0);
  for (let tick=1; tick<ULTIMATE_ACTIVATION_FRAMES; tick++) {
    step(sim,N,player);
    const frozen=sim.snapshot();
    expect(frozen.ultimateActivation?.elapsedFrames).toBe(tick);
    expect(frozen.characters).toEqual(started.characters);
    expect(frozen.projectiles).toHaveLength(0);
  }
  step(sim,N,player);
  expect(sim.snapshot().ultimateActivation).toBeUndefined();
  const resumed=sim.snapshot();
  expect(resumed.projectiles.some(projectile => projectile.visual === 'crow')).toBe(true);
});

it('starts the cinematic when a buffered ultimate becomes available as a missed attack ends', () => {
  const sim=create(400); sim.fillTrainingRage();
  const jab=shoto.moves.find(move=>move.id==='light-punch')!;
  command(sim,'light-punch');
  wait(sim,jab.startup+jab.activeFrames+jab.recovery-6);
  command(sim,'crow-ultimate');
  for (let tick=0; tick<10 && !sim.snapshot().ultimateActivation; tick++) {
    expect(sim.snapshot().projectiles).toHaveLength(0);
    step(sim);
  }
  expect(sim.snapshot().ultimateActivation).toMatchObject({ownerIds:['player-1'],elapsedFrames:0});
  expect(sim.snapshot().characters[0].attack?.moveId).toBe('crow-ultimate');
});

it('freezes the round clock and entire world for 150 ticks of activation, for any ultimate',()=>{
  expect(ULTIMATE_ACTIVATION_FRAMES).toBe(150);
  const fighter={...shoto,id:'activation-fixture',rage:{...shoto.rage!,onHit:300}};
  const sim=new Simulation(config,[fighter,fighter],{initialDistance:56});
  command(sim,'light-punch');wait(sim,90);
  expect(sim.snapshot().characters[0].rage).toBe(300);
  const motion=shoto.moves.find(m=>m.id==='crow-ultimate')!.input.sequence!;
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
  expect(sim.snapshot().roundFramesRemaining).toBe(before.roundFramesRemaining);
  let resumed = false;
  for (let tick = 0; tick < 500; tick++) {
    const active = sim.snapshot();
    const ultimateActive = active.characters.some(character => character.attack?.moveId === 'crow-ultimate') ||
      active.projectiles.some(projectile => projectile.attack.moveId === 'crow-ultimate');
    step(sim);
    if (ultimateActive) expect(sim.snapshot().roundFramesRemaining).toBe(before.roundFramesRemaining);
    if (sim.snapshot().roundFramesRemaining < before.roundFramesRemaining) { resumed = true; break; }
  }
  expect(resumed).toBe(true);
});

it('freezes already flying projectiles, and simultaneous ultimates share one activation interval',()=>{
  const sim=create(350);sim.fillTrainingRage();command(sim,'tomato-heavy',1);wait(sim,30);
  expect(sim.snapshot().projectiles).toHaveLength(1);
  command(sim,'crow-ultimate');const started=sim.snapshot();
  for(let i=0;i<ULTIMATE_ACTIVATION_FRAMES-1;i++){step(sim);expect(sim.snapshot().projectiles).toEqual(started.projectiles);}
  const both=create();both.fillTrainingRage();
  for(const [index,direction] of (['B','F','B','F'] as Direction[]).entries()){
    const value=input(direction,index === 3 ? ['1','2'] : []);both.stepFrame([value,value]);
  }
  expect(both.snapshot().ultimateActivation?.ownerIds).toEqual(['player-1','player-2']);
  wait(both,ULTIMATE_ACTIVATION_FRAMES-1);expect(both.snapshot().ultimateActivation?.elapsedFrames).toBe(ULTIMATE_ACTIVATION_FRAMES-1);
  step(both);expect(both.snapshot().ultimateActivation).toBeUndefined();
});

it('gives the light tomato a shallow arc and heavy tomato a visibly higher arc, using the same collision coordinates',()=>{
  const heights:number[]=[];
  for(const id of ['tomato-light','tomato-heavy']){
    const sim=create(400);command(sim,id);const move=shoto.moves.find(m=>m.id===id)!;
    wait(sim,move.startup);const first=sim.snapshot().projectiles[0];
    expect(first).toBeDefined();const y=first.y;
    wait(sim,10);const later=sim.snapshot().projectiles[0];
    expect(later.y).toBeLessThan(y);heights.push(y-later.y);
    const box=sim.snapshot().activeHitboxes.find(b=>b.attackId===id)!;
    expect(box.y).toBeCloseTo(later.y+move.hitbox.yOffset);
    wait(sim,Math.ceil(-move.projectile!.verticalSpeed!/move.projectile!.gravity!)+2-11);expect(sim.snapshot().projectiles[0].verticalVelocity).toBeGreaterThan(0);
  }
  expect(heights[1]).toBeGreaterThan(heights[0]);
});

it('valida proporções e camadas do cenário',()=>{
  for(const stage of stages){
    expect(stage.referenceSize.width/stage.referenceSize.height).toBeGreaterThanOrEqual(16/9);
    expect(()=>validateStage({...stage,referenceSize:{width:100,height:100}})).toThrow();
  }
  expect(defaultStage.layers.map(l=>l.id)).toEqual(['sala', 'bandeira-esquerda', 'bandeira-direita']);
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

/** An ultimate ends its combo: another one starts only after the opponent has recovered. */
function untilRecovered(sim:Simulation,player:number){for(let i=0;i<600 && ['hitstun','knockdown'].includes(sim.snapshot().characters[1-player].mode);i++)step(sim,N,player);}
it.each([0,1])('allows repeated ultimates with sufficient rage: player %i', player => {
  const sim=create(56); sim.fillTrainingRage();
  command(sim,'crow-ultimate',player);
  expect(sim.snapshot().characters[player].rage).toBe(600);
  wait(sim,350); untilRecovered(sim,player);
  command(sim,'crow-ultimate',player);
  expect(sim.snapshot().characters[player].rage).toBe(300);
  expect(sim.snapshot().ultimateActivation?.ownerIds).toContain(`player-${player+1}`);
});

it.each([0,1])('permits ultimates again in a real match after earning rage in a later round: player %i', player => {
  const fighter={...shoto,maxHealth:280,rage:{...shoto.rage!,onHit:300}};
  const sim=new Simulation(config,[fighter,fighter],{initialDistance:56});
  command(sim,'light-punch',player);wait(sim,80);
  command(sim,'crow-ultimate',player);
  expect(sim.snapshot().characters[player].rage).toBe(0);
  for(let i=0;i<900 && sim.snapshot().round===1;i++)step(sim);
  expect(sim.snapshot()).toMatchObject({round:2,phase:'fight'});
  command(sim,'light-punch',player);wait(sim,80);
  expect(sim.snapshot().characters[player].rage).toBe(300);
  command(sim,'crow-ultimate',player);
  expect(sim.snapshot().ultimateActivation?.ownerIds).toContain(`player-${player+1}`);
  expect(sim.snapshot().characters[player].rage).toBe(0);
});

it.each([0,1])('refills rage and permits repeated ultimates in training: player %i', player => {
  const sim=create(56);sim.fillTrainingRage();command(sim,'crow-ultimate',player);
  expect(sim.snapshot().characters[player]).toMatchObject({rage:600});
  wait(sim,350);untilRecovered(sim,player);sim.fillTrainingRage();
  expect(sim.snapshot().characters[player].rage).toBe(900);
  command(sim,'crow-ultimate',player);
  expect(sim.snapshot().ultimateActivation?.ownerIds).toContain(`player-${player+1}`);
});

it('preserves each fighter’s accumulated rage between rounds and clears it on match reset', () => {
  const shortRound={...config,match:{...config.match,roundDurationFrames:90}};
  const sim=new Simulation(shortRound,undefined,{initialDistance:56});
  command(sim,'light-punch');
  for(let i=0;i<200 && sim.snapshot().phase==='fight';i++)step(sim);
  const before=sim.snapshot();
  expect(before.phase).toBe('round-over');
  expect(before.characters.map(c=>c.rage)).toEqual([10,15]);
  for(let i=0;i<300 && sim.snapshot().round===1;i++)step(sim);
  expect(sim.snapshot().round).toBe(2);
  expect(sim.snapshot().characters.map(c=>c.rage)).toEqual([10,15]);
  sim.resetMatch();
  expect(sim.snapshot().characters.map(c=>c.rage)).toEqual([0,0]);
});

it.each([0,1])('uses the shortcut with full cinematic and the same resource rules: player %i', player => {
  const sim=create(100);
  step(sim,{...N,ultimate:true},player);
  expect(sim.snapshot().ultimateActivation).toBeUndefined();
  step(sim,N,player);sim.fillTrainingRage();
  step(sim,{...N,ultimate:true},player);
  expect(sim.snapshot().ultimateActivation).toMatchObject({ownerIds:[`player-${player+1}`],elapsedFrames:0});
  expect(sim.snapshot().characters[player].rage).toBe(600);
  expect(sim.snapshot().projectiles).toHaveLength(0);
});


it.each([0,1])('starts the shortcut cinematic after two punches in a combo: player %i',player=>{
  const sim=create(56);sim.fillTrainingRage();
  for(let punch=0;punch<2;punch++){
    step(sim,input('N',['1']),player);
    for(let tick=0;tick<80;tick++){
      if(sim.snapshot().hitEvents.some(e=>e.attackerId===`player-${player+1}` && e.moveId==='light-punch'))break;
      step(sim,N,player);
    }
  }
  step(sim,{...N,ultimate:true},player);
  for(let tick=0;tick<30 && !sim.snapshot().ultimateActivation;tick++)step(sim,N,player);
  expect(sim.snapshot().ultimateActivation).toMatchObject({ownerIds:[`player-${player+1}`],elapsedFrames:0});
  expect(sim.snapshot().projectiles).toHaveLength(0);
});

it.each([0, 1])('sends twelve crows in varied and simultaneous groups from the user side: player %i', player => {
  const sim = create(400);
  sim.fillTrainingRage(); command(sim, 'crow-ultimate', player);
  wait(sim, ULTIMATE_ACTIVATION_FRAMES);
  const shots = new Map<number, {x: number; y: number; velocity: number; tick: number}>();
  for (let tick = 0; tick < 150; tick++) {
    for (const projectile of sim.snapshot().projectiles) {
      if (projectile.visual === 'crow' && projectile.volleyStep !== undefined && !shots.has(projectile.volleyStep)) {
        shots.set(projectile.volleyStep, { x: projectile.x, y: projectile.y, velocity: projectile.velocity, tick });
      }
    }
    step(sim, N, player);
  }
  expect([...shots.keys()]).toEqual(Array.from({ length: 12 }, (_, i) => i));
  expect(new Set([...shots.values()].map(shot => shot.y)).size).toBeGreaterThan(6);
  expect(new Set([...shots.values()].map(shot => shot.tick)).size).toBeLessThan(shots.size);
  const pattern = shoto.moves.find(move => move.id === 'crow-ultimate')!.screenVolley!.pattern!;
  expect(new Set(pattern.map(shot => shot.frame)).size).toBeLessThan(pattern.length);
  const owner = sim.snapshot().characters[player];
  for (const shot of shots.values()) {
    expect(Math.sign(shot.velocity)).toBe(player === 0 ? 1 : -1);
    const origin = shot.x - shot.velocity;
    expect(player === 0 ? origin <= owner.x : origin >= owner.x).toBe(true);
  }
  sim.resetMatch();
  expect(sim.snapshot().projectiles).toHaveLength(0);
  expect(sim.snapshot().ultimateActivation).toBeUndefined();
});

it.each([['shoto', 'd,df,f,d,df,f,1', ['d,df,f,d,df,f,1', 'b,f,b,f,1+2', '1', 'd,df,f,1']], ['cowboy', 'b,db,d,df,f,1+2', ['b,db,d,df,f,1+2', '1', 'd,df,f,2']]] as const)(
  'a ultimate de %s é sempre o último golpe do combo', (id, ultimate, followUps) => {
    const fighter = characters.find(entry => entry.id === id)!;
    const firstCombo = (steps: RouteStep[]) => {
      const sim = new Simulation(tutorialGameConfig(), [fighter, fighter], { training: true, initialDistance: TUTORIAL_DISTANCE });
      sim.fillTrainingRage();
      for (const input of routeInputs(steps, 300)) sim.stepFrame([input, { direction: 'N', buttons: new Set() }]);
      return sim.snapshot().comboHistory.find(combo => combo.attackerId === 'player-1')!;
    };
    const alone = firstCombo([{ wait: 8, command: ultimate }]);
    expect(alone.usedUltimate).toBe(true);
    // Whatever follows may only start a new combo once the opponent has recovered.
    // Presses start once the activation is over and the ultimate is under way, up to its last hits.
    for (const command of followUps) for (let wait = 170; wait <= 400; wait += 5) {
      expect(firstCombo([{ wait: 8, command: ultimate }, { wait, command }]).hits, `${command} após ${wait}`).toBe(alone.hits);
    }
  });
