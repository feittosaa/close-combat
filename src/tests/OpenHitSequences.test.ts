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

it.each([0,1])('keeps confirmed attacks available after the target reaches zero health, player %i', player => {
  const fragile = {...shoto, maxHealth:20};
  const fighters = player === 0 ? [shoto, fragile] as const : [fragile, shoto] as const;
  const sim = new Simulation(config, fighters, {initialDistance:56});
  for (const button of ['1','1','1'] as const) hit(sim, player, [button]);
  expect(sim.snapshot().characters[1-player].health).toBe(0);
  expect(sim.snapshot().phase).toBe('fight');
  expect(sim.snapshot().comboHistory.slice(-1)[0]?.hits).toBe(3);
  for (let tick=0; tick<100 && sim.snapshot().phase==='fight'; tick++) step(sim);
  expect(sim.snapshot().roundWinnerId).toBe(`player-${player+1}`);
});

it.each([0,1])('allows an ultimate after the hit that reduced health to zero, player %i', player => {
  const attacker = {...shoto, rage:{...shoto.rage!, maximum:0}, moves:shoto.moves.map(move => move.category === 'ultimate' ? {...move, rageCost:0} : move)};
  const fragile = {...shoto, maxHealth:20};
  const fighters = player === 0 ? [attacker, fragile] as const : [fragile, attacker] as const;
  const sim = new Simulation(config, fighters, {initialDistance:56});
  hit(sim, player, ['1']);
  step(sim, player, {...N, ultimate:true});
  let activated = false;
  for (let tick=0; tick<300; tick++) {
    if (sim.snapshot().ultimateActivation) activated = true;
    if (activated && !sim.snapshot().ultimateActivation) break;
    expect(sim.snapshot().phase).toBe('fight');
    step(sim);
  }
  expect(activated).toBe(true);
});

it.each([['1', 20], ['2', 30]] as const)('returns both fighters to neutral together after a confirmed %s string', (button, recovery) => {
  const sim = create(96);
  for (let i = 0; i < 3; i++) hit(sim, 0, [button], i > 0);
  const contact = sim.snapshot();
  expect(contact.characters[0].attack?.recoveryFrames).toBe(recovery);
  expect(contact.hitEvents[0].attackerRecoveryFrames).toBe(contact.hitEvents[0].defenderStunFrames);
  for (let i = 0; i < 100 && sim.snapshot().characters[0].attack; i++) {
    expect(sim.snapshot().characters[1].mode).toBe('hitstun');
    step(sim);
  }
  expect(sim.snapshot().characters.map(character => character.mode)).toEqual(['neutral', 'neutral']);
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

it.each([0,1])('resets the strength floor and recipe after a confirmed launcher: player %i',player=>{
  const sim=create();for(const button of ['1','1','2'] as const)hit(sim,player,[button]);
  const launched=sim.snapshot();
  expect(launched.characters[1-player].juggle).toBeDefined();
  expect(launched.characters[player].hitSequence).toMatchObject({heavy:false});
  expect(launched.characters[player].chain).toBeUndefined();
  while(sim.snapshot().characters[player].attack)step(sim);
  expect(sim.snapshot().characters[1-player].mode).toBe('hitstun');
  step(sim,player,input(['1']));
  expect(sim.snapshot().characters[player].attack?.moveId).toBe('light-punch');
  expect(sim.snapshot().characters[player].chain).toEqual(['light-punch']);
});

it('keeps repetition capped at each authored string',()=>{
  for(const button of ['1','2','3','4'] as const){
    const sim=create();const count=button==='1'||button==='2'?3:button==='3'?2:1;
    for(let i=0;i<count;i++)hit(sim,0,[button]);
    const elapsed=sim.snapshot().characters[0].attack!.elapsedFrames;
    step(sim,0,input([button]));wait(sim,CONTACT_HITSTOP_FRAMES+1);
    expect(sim.snapshot().recentContacts).toHaveLength(count);
    expect(sim.snapshot().characters[0].attack?.elapsedFrames).toBeGreaterThan(elapsed);
  }
});

it('opens a continuation on block without synchronizing recovery, but not on whiff',()=>{
  for(const blocked of [true,false]){
    const sim=create(blocked?56:300);const guard=blocked?input([],'B'):N;
    step(sim,0,input(['1']),guard);
    for(let i=0;i<8;i++)step(sim,0,N,guard);
    const contact=sim.snapshot().hitEvents[0];
    if(blocked){expect(contact.outcome).toBe('block');expect(contact.frameAdvantage).toBeLessThan(0);}
    step(sim,0,input(['4']),guard);wait(sim,CONTACT_HITSTOP_FRAMES+1);
    expect(sim.snapshot().characters[0].attack?.moveId).toBe(blocked ? 'heavy-kick' : 'light-punch');
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
  for(let tick=0;tick<8;tick++)step(sim,0,input([],'B'));
  expect(sim.snapshot().hitEvents).toEqual([expect.objectContaining({attackerId:'player-2',outcome:'block',damage:0})]);
  expect(sim.snapshot().characters[0].health).toBe(1000);
});

it.each([0,1])('ends a confirmed heavy punch combo before any further attack: player %i', player => {
  for (const followup of ['1','2','3','4'] as const) {
    const sim=create();
    for (const button of ['2','2','2'] as const) hit(sim,player,[button]);
    step(sim,player,input([followup]));
    wait(sim,CONTACT_HITSTOP_FRAMES+2);
    expect(sim.snapshot().characters[player].attack?.moveId).toBe('heavy-punch');
    expect(sim.snapshot().recentContacts).toHaveLength(3);
    while(sim.snapshot().characters[player].attack)step(sim);
    expect(sim.snapshot().characters.every(c=>c.mode==='neutral')).toBe(true);
    step(sim,player,input([followup]));
    expect(sim.snapshot().characters[player].attack).toBeDefined();
  }
});

it.each([0,1])('locks the strong strike choice until neutral, for player %i', player=>{
  for(const [first,forbidden] of [['2',['1','3','4']],['4',['1','3','2']]] as const) {
    for(const button of forbidden) {
      const sim=create();hit(sim,player,[first]);
      step(sim,player,input([button]));wait(sim,CONTACT_HITSTOP_FRAMES+2);
      expect(sim.snapshot().characters[player].attack?.moveId).toBe(first==='2'?'heavy-punch':'heavy-kick');
      expect(sim.snapshot().recentContacts).toHaveLength(1);
      for(let i=0;i<100 && sim.snapshot().characters[player].attack;i++)step(sim);
      expect(sim.snapshot().characters.every(c=>c.mode==='neutral')).toBe(true);
      step(sim,player,input([button]));
      expect(sim.snapshot().characters[player].attack?.buttons).toEqual([button]);
    }
  }
});

it.each([0,1])('allows weak hits into either strong choice and keeps the existing strong punch recipe, player %i',player=>{
  for(const strong of ['2','4'] as const){
    const sim=create();hit(sim,player,['1']);hit(sim,player,[strong],true);
    expect(sim.snapshot().characters[player].hitSequence).toMatchObject({heavy:true,heavyButton:strong});
  }
  const sim=create();for(let i=0;i<3;i++)hit(sim,player,['2'],i>0);
  expect(sim.snapshot().recentContacts).toHaveLength(3);
});
