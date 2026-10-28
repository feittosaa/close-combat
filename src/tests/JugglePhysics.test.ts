import { CONTACT_HITSTOP_FRAMES } from '../engine/combat/hitstop';
import { expect, it } from 'vitest';
import { AttackResolver } from '../engine/combat/AttackResolver';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { shoto } from '../engine/data/fighters/shoto';
import type { CharacterDefinition } from '../engine/data/characters';
import type { AttackButton, Direction, FrameInput } from '../input/types';

const config = createGameConfig(1024,576);
const input = (direction: Direction = 'N', buttons: readonly AttackButton[] = []): FrameInput => ({direction,buttons:new Set(buttons)});
function step(sim: Simulation, player=0, value=input(), target=input()) {
  const inputs=[target,target];inputs[player]=value;sim.stepFrame(inputs);
}
function contact(sim: Simulation, player=0) {
  for(let tick=0;tick<150;tick++) {
    if(sim.snapshot().hitEvents.some(e=>e.attackerId===`player-${player+1}`))return;
    step(sim);
  }
  throw new Error('No contact');
}
function launch(player=0, fighter: CharacterDefinition=shoto) {
  const sim=new Simulation(config,[fighter,fighter],{training:true,initialDistance:56});
  for(const button of ['1','1','2'] as const){step(sim,player,input('N',[button]));contact(sim,player);}
  return sim;
}

it.each([0,1])('keeps every air basic on the same jump trajectory in both directions: player %i',player=>{
  for(const direction of ['UF','UB'] as const)for(const button of ['1','2','3','4'] as const) {
    const attack=new Simulation(config,undefined,{training:true,initialDistance:300});
    const jump=new Simulation(config,undefined,{training:true,initialDistance:300});
    for(let tick=0;tick<38;tick++) {
      step(attack,player,input(direction,tick===3?[button]:[]));
      step(jump,player,input(direction));
      const a=attack.snapshot().characters[player],b=jump.snapshot().characters[player];
      expect({x:a.x,y:a.y,velocity:a.verticalVelocity,grounded:a.grounded}).toEqual({x:b.x,y:b.y,velocity:b.verticalVelocity,grounded:b.grounded});
      expect(a.wakeupInvulnerabilityFrames).toBeUndefined();
      if(tick===3)expect(a.attack?.moveId).toContain('air-');
    }
  }
});

it.each([0,1])('uses lighter launcher gravity, keeps the target stunned and resets it at landing: player %i',player=>{
  const sim=launch(player),start=sim.snapshot().characters[1-player];
  expect(start.juggle).toEqual({gravityScale:0.7,airHits:0});
  const announcedStun=sim.snapshot().hitEvents[0].defenderStunFrames;
  let flightTicks=0;
  while(!sim.snapshot().characters[1-player].grounded && flightTicks<100) {
    const before=sim.snapshot();step(sim);const after=sim.snapshot();
    const target=after.characters[1-player];
    if(after.frame>before.frame){
      flightTicks++;
      if(!target.grounded){expect(target.mode).toBe('hitstun');expect(target.verticalVelocity-before.characters[1-player].verticalVelocity).toBeCloseTo(config.movement.gravity*0.7);}
    }
  }
  expect(flightTicks).toBeGreaterThan(Math.ceil(20/config.movement.gravity));
  expect(announcedStun).toBe(flightTicks+shoto.juggle!.getupFrames);
  const landed=sim.snapshot().characters[1-player];
  expect(landed).toMatchObject({mode:'knockdown',grounded:true,remainingStateFrames:24,wakeupInvulnerabilityFrames:32});
  expect(landed.juggle).toBeUndefined();
  for(let i=0;i<24;i++)step(sim);
  expect(sim.snapshot().characters[1-player]).toMatchObject({mode:'neutral',wakeupInvulnerabilityFrames:8});
  for(let i=0;i<8;i++)step(sim);
  expect(sim.snapshot().characters[1-player].wakeupInvulnerabilityFrames).toBeUndefined();
  sim.resetMatch();expect(sim.snapshot().characters.every(c=>!c.juggle && !c.knockdown && !c.wakeupInvulnerabilityFrames)).toBe(true);
});

// Isolate reaction physics with legal single-button attacks and guaranteed geometric range.
const juggleFixture: CharacterDefinition={...shoto,id:'juggle-fixture',combos:shoto.combos,juggle:{...shoto.juggle!,maximumGravityScale:1},
  moves:shoto.moves.map(m=>m.id==='heavy-punch'?{...m,activeFrames:3,recovery:18,hitbox:{...m.hitbox,yOffset:-400,height:400},pushback:{hit:0,block:0}}:
    ['light-punch','heavy-kick'].includes(m.id)?{...m,startup:4,activeFrames:1,recovery:1,hitbox:{...m.hitbox,yOffset:-400,height:400},pushback:{hit:0,block:0}}:m)};

it('increases gravity once per real air hit, caps it, and never resets upward momentum on ordinary hits',()=>{
  const sim=launch(0,juggleFixture);
  // Start new independent jabs after the grounded string has completed its recovery.
  for(let i=0;i<26;i++)step(sim);
  let hits=0;
  for(let tick=0;tick<240 && !sim.snapshot().characters[1].grounded;tick++) {
    const before=sim.snapshot();step(sim,0,input('N',tick%2===0?['4']:[]));const after=sim.snapshot();
    if(after.hitEvents.some(e=>e.attackerId==='player-1')) {
      hits++;
      expect(after.characters[1].juggle?.airHits).toBe(hits);
      expect(after.characters[1].juggle?.gravityScale).toBeCloseTo(Math.min(juggleFixture.juggle!.maximumGravityScale,0.7+hits*0.15));
      expect(after.characters[1].verticalVelocity).toBeCloseTo(before.characters[1].verticalVelocity+(before.characters[1].juggle!.suspensionFrames?0:config.movement.gravity*before.characters[1].juggle!.gravityScale));
    }
  }
  expect(hits).toBeGreaterThanOrEqual(2);
});

it('protects getup and the exact wakeup interval from strikes, throws and projectiles, then accepts contacts',()=>{
  const sim=launch();
  while(!sim.snapshot().characters[1].grounded)step(sim);
  const resolver=new AttackResolver((_,id)=>shoto.moves.find(m=>m.id===id));
  for(let tick=0;tick<33;tick++) {
    const snapshot=sim.snapshot();
    for(const id of ['light-punch','throw-13','wine-glass']) {
      const [attacker,target]=structuredClone(snapshot.characters);
      const move=shoto.moves.find(m=>m.id===id)!;
      attacker.x=target.x-(id==='throw-13'?30:56);attacker.y=target.y;attacker.facing='right';attacker.mode='active';
      attacker.attack={moveId:id,buttons:move.input.buttons,elapsedFrames:move.startup,hasHit:false};
      const projectiles=id==='wine-glass'?[{id:0,ownerId:attacker.characterId,fighterId:attacker.fighterId,
        x:target.x,y:target.y,facing:'right' as const,velocity:0,remainingFrames:10,visual:'glass' as const,attack:attacker.attack}]:[];
      const events=resolver.resolve([attacker,target],[input(),input()],projectiles);
      expect(events.length,`${id} at wakeup tick ${tick}`).toBe(tick<32?0:1);
    }
    step(sim);
  }
});

it('freezes juggle state during contact pauses and clears flight/protection on reset',()=>{
  const sim=launch();const impact=sim.snapshot();
  for(let tick=0;tick<CONTACT_HITSTOP_FRAMES;tick++){step(sim);expect(sim.snapshot().characters).toEqual(impact.characters);}
  sim.resetMatch();expect(sim.snapshot().characters.every(c=>!c.juggle && !c.wakeupInvulnerabilityFrames && c.mode==='neutral')).toBe(true);
  const landing=launch();while(!landing.snapshot().characters[1].grounded)step(landing);
  landing.resetMatch();expect(landing.snapshot().characters.every(c=>!c.juggle && !c.wakeupInvulnerabilityFrames && !c.knockdown)).toBe(true);
});

it('keeps a launcher KO in flight until the target reaches the floor',()=>{
  const fighter={...shoto,maxHealth:75};
  const sim=new Simulation(config,[fighter,fighter],{initialDistance:56});
  for(const button of ['1','1','2'] as const){step(sim,0,input('N',[button]));contact(sim);}
  expect(sim.snapshot().characters[1].health).toBe(0);
  while(!sim.snapshot().characters[1].grounded) {expect(sim.snapshot().phase).toBe('fight');step(sim);}
  expect(sim.snapshot().phase).toBe('round-over');
});

it('suspends a juggled target for six combat ticks after hitstop, then resumes its preserved velocity with heavier gravity',()=>{
  const sim=launch(0,juggleFixture);
  for(let i=0;i<31;i++)step(sim);
  step(sim,0,input('N',['4']));contact(sim);
  const impact=sim.snapshot();const target=impact.characters[1];
  expect(target.juggle).toMatchObject({airHits:1,gravityScale:0.85,suspensionFrames:6});
  for(let tick=0;tick<CONTACT_HITSTOP_FRAMES;tick++) {
    step(sim);expect(sim.snapshot().characters).toEqual(impact.characters);
  }
  for(let tick=1;tick<=6;tick++) {
    step(sim);const suspended=sim.snapshot().characters[1];
    expect([suspended.x,suspended.y,suspended.verticalVelocity]).toEqual([target.x,target.y,target.verticalVelocity]);
    expect(suspended.juggle?.suspensionFrames).toBe(6-tick);
    expect(sim.snapshot().frame).toBe(impact.frame+tick);
  }
  step(sim);const resumed=sim.snapshot().characters[1];
  expect(resumed.y).toBeCloseTo(target.y+target.verticalVelocity);
  expect(resumed.verticalVelocity).toBeCloseTo(target.verticalVelocity+config.movement.gravity*0.85);
});
