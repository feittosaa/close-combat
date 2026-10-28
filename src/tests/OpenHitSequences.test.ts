import { expect, it } from 'vitest';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { shoto } from '../engine/data/fighters/shoto';
import { CONTACT_HITSTOP_FRAMES } from '../engine/combat/hitstop';
import type { AttackButton, Direction, FrameInput } from '../input/types';

const config = createGameConfig(1024,576);
const input = (buttons: AttackButton[] = [], direction: Direction = 'N'): FrameInput => ({direction,buttons:new Set(buttons)});
const N = input();
const create = (distance=56) => new Simulation(config,undefined,{training:true,initialDistance:distance});
function step(sim: Simulation, player=0, value=N, target=N) {
  const inputs=[target,target];inputs[player]=value;sim.stepFrame(inputs);
}
function wait(sim: Simulation, ticks:number) { for(let i=0;i<ticks;i++)step(sim); }
function hit(sim: Simulation, player:number, buttons:AttackButton[], continuous=false) {
  step(sim,player,input(buttons),continuous?input([],'B'):N);
  for(let tick=0;tick<100;tick++) {
    const snapshot=sim.snapshot();
    const event=snapshot.hitEvents.find(e=>e.attackerId===`player-${player+1}`);
    if(event){expect(event.outcome).toBe('hit');return event;}
    if(continuous)expect(snapshot.characters[1-player].mode).toBe('hitstun');
    step(sim,player,N,continuous?input([],'B'):N);
  }
  throw new Error('Missing connected hit');
}

it.each([0,1])('connects 1,1,1 → 3 → 2,2,2 as an open sequence without adding a recipe: player %i', player=>{
  const sim=create();
  const buttons:AttackButton[]=['1','1','1','3','2','2','2'];
  buttons.forEach((button,index)=>hit(sim,player,[button],index>0));
  expect(sim.snapshot().recentContacts.map(c=>c.event.moveId)).toEqual([
    'light-punch','light-punch','light-punch','light-kick','heavy-punch','heavy-punch','heavy-punch',
  ]);
  expect(sim.snapshot().characters[1-player].health).toBe(810);
  expect(shoto.combos?.map(recipe=>recipe.notation)).toEqual(['1,1,1','2,2,2','1,1,2','1,1,1+2']);
  for(let tick=0;tick<100;tick++) {
    const snapshot=sim.snapshot();
    if(!snapshot.characters[player].attack){
      expect(snapshot.characters.map(c=>c.mode)).toEqual(['neutral','neutral']);
      expect(snapshot.characters.every(c=>!c.hitSequence)).toBe(true);
      return;
    }
    expect(snapshot.characters[1-player].mode).toBe('hitstun');
    step(sim);
  }
  throw new Error('Sequence never returned to neutral');
});

it.each(['2','4'] as const)('blocks both weak buttons after strong %s, drops the rejected input and permits a fresh sequence after recovery', strong=>{
  for(const weak of ['1','3'] as const){
    const sim=create();const event=hit(sim,0,[strong]);
    const id=sim.snapshot().characters[0].attack!.moveId;
    wait(sim,CONTACT_HITSTOP_FRAMES+event.attackerRecoveryFrames-2);
    step(sim,0,input([weak]));
    expect(sim.snapshot().characters[0].attack?.moveId).toBe(id);
    wait(sim,3);
    expect(sim.snapshot().characters.every(c=>c.mode==='neutral'&&!c.attack)).toBe(true);
    hit(sim,0,[weak]);
  }
});

it('keeps the strength floor across a launcher even after the attacker recovers',()=>{
  const sim=create();for(const button of ['1','1','2'] as const)hit(sim,0,[button]);
  expect(sim.snapshot().characters[1].juggle).toBeDefined();
  while(sim.snapshot().characters[0].attack)step(sim);
  expect(sim.snapshot().characters[1].mode).toBe('hitstun');
  step(sim,0,input(['1']));expect(sim.snapshot().characters[0].attack).toBeUndefined();
  while(sim.snapshot().characters[1].mode!=='neutral')step(sim);
  step(sim,0,input(['1']));expect(sim.snapshot().characters[0].attack?.moveId).toBe('light-punch');
});

it('keeps punch repetition capped at the authored string and gives kicks no repetition route',()=>{
  for(const button of ['1','2','3','4'] as const){
    const sim=create();const count=button==='1'||button==='2'?3:1;
    for(let i=0;i<count;i++)hit(sim,0,[button]);
    const elapsed=sim.snapshot().characters[0].attack!.elapsedFrames;
    step(sim,0,input([button]));wait(sim,CONTACT_HITSTOP_FRAMES+1);
    expect(sim.snapshot().recentContacts).toHaveLength(count);
    expect(sim.snapshot().characters[0].attack?.elapsedFrames).toBeGreaterThan(elapsed);
  }
});

it('does not open new routes or synchronize recovery on block or whiff',()=>{
  for(const blocked of [true,false]){
    const sim=create(blocked?56:300);const guard=blocked?input([],'B'):N;
    step(sim,0,input(['1']),guard);
    for(let i=0;i<10;i++)step(sim,0,N,guard);
    const contact=sim.snapshot().hitEvents[0];
    if(blocked){expect(contact.outcome).toBe('block');expect(contact.frameAdvantage).toBeLessThan(0);}
    step(sim,0,input(['4']),guard);wait(sim,CONTACT_HITSTOP_FRAMES+1);
    expect(sim.snapshot().characters[0].attack?.moveId).toBe('light-punch');
    expect(sim.snapshot().characters[0].hitSequence).toBeUndefined();
  }
});

it('reset clears connected pressure and lets a weak attack start after a strong hit',()=>{
  const sim=create();hit(sim,0,['2']);sim.resetMatch();
  expect(sim.snapshot().characters.every(c=>!c.hitSequence&&!c.chain)).toBe(true);
  step(sim,0,input(['1']));expect(sim.snapshot().characters[0].attack?.moveId).toBe('light-punch');
});

it('releases a grounded defender when landing ends the attacker’s air basic early',()=>{
  const fighter={...shoto,moves:shoto.moves.map(move=>move.id==='air-heavy-punch'?{
    ...move,startup:1,activeFrames:1,recovery:80,hitbox:{...move.hitbox,yOffset:-200,height:400},
  }:move)};
  const sim=new Simulation(config,[fighter,fighter],{training:true,initialDistance:56});
  step(sim,0,input([],'U'));hit(sim,0,['2']);
  while(!sim.snapshot().characters[0].grounded){
    expect(sim.snapshot().characters[1].mode).toBe('hitstun');step(sim);
  }
  expect(sim.snapshot().characters.map(c=>c.mode)).toEqual(['neutral','neutral']);
  expect(sim.snapshot().characters.every(c=>!c.attack&&!c.hitSequence)).toBe(true);
});

it('preserves protected getup until a successful juggle follow-up has recovered',()=>{
  const fighter={...shoto,moves:shoto.moves.map(move=>move.id==='heavy-kick'?{
    ...move,startup:1,activeFrames:1,recovery:80,hitbox:{...move.hitbox,yOffset:-400,height:400},
  }:move)};
  const sim=new Simulation(config,[fighter,fighter],{training:true,initialDistance:56});
  for(const button of ['1','1','2','4'] as const)hit(sim,0,[button]);
  let landed=false;
  for(let tick=0;sim.snapshot().characters[0].attack&&tick<200;tick++){
    const target=sim.snapshot().characters[1];
    if(target.grounded){landed=true;expect(target.mode).toBe('knockdown');expect(target.wakeupInvulnerabilityFrames).toBeGreaterThan(0);}
    step(sim);
  }
  expect(landed).toBe(true);
  expect(sim.snapshot().characters[0].attack).toBeUndefined();
});


it('lets the defender attack and the attacker guard on their shared recovery tick',()=>{
  const sim=create();const event=hit(sim,0,['2']);
  wait(sim,CONTACT_HITSTOP_FRAMES+event.attackerRecoveryFrames-1);
  expect(sim.snapshot().characters[1].remainingStateFrames).toBe(1);
  step(sim,0,input([],'B'),input(['1']));
  expect(sim.snapshot().characters[0].mode).toBe('blocking');
  expect(sim.snapshot().characters[1].attack?.moveId).toBe('light-punch');
  for(let tick=0;tick<10;tick++)step(sim,0,input([],'B'));
  expect(sim.snapshot().hitEvents).toEqual([expect.objectContaining({attackerId:'player-2',outcome:'block',damage:0})]);
  expect(sim.snapshot().characters[0].health).toBe(1000);
});
