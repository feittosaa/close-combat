import { expect, it } from 'vitest';
import { createGameConfig } from '../engine/data/gameConfig';
import { grappler } from '../engine/data/fighters/grappler';
import { texas } from '../engine/data/fighters/texas';
import { getShotoSpritePose } from '../rendering/animations/shotoSprites';
import { getTexasSpritePose } from '../rendering/animations/texasSprites';
import { getGrapplerPose } from '../rendering/animations/grapplerSprites';
import { GRAPPLER_ULTIMATE_GROUND_RECOVERY_FRAMES } from '../engine/combat/ultimateActivation';
import { shoto } from '../engine/data/fighters/shoto';
import { RAGE_LEVEL } from '../engine/combat/rage';
import { Simulation, type ComboRecord } from '../engine/simulation/Simulation';
import type { CharacterState } from '../engine/characters/CharacterState';
import type { FrameInput } from '../input/types';

const neutral: FrameInput = {direction:'N',buttons:new Set()};
const command = (sim:Simulation, guard: FrameInput = neutral) => {
  for (const direction of ['D','DB','B','DB','D','DF'] as const) sim.stepFrame([{direction,buttons:new Set()},guard]);
  sim.stepFrame([{direction:'F',buttons:new Set(['1','2'])},guard]);
};

it('executa o comando da nova ultimate e consome a mesma barra de rage', () => {
  const sim = new Simulation(createGameConfig(1024,576), [grappler,shoto], {training:true,initialDistance:400});
  command(sim);
  for(let i=0;i<8;i++) sim.stepFrame([neutral,neutral]);
  expect(sim.snapshot().characters[0].attack?.moveId).not.toBe('ultimate-soco');
  sim.resetMatch(); sim.fillTrainingRage();
  const before=sim.snapshot().characters[0].rage;
  command(sim);
  for(let i=0;i<12 && !sim.snapshot().ultimateActivation;i++) sim.stepFrame([neutral,neutral]);
  expect(sim.snapshot().characters[0].attack?.moveId).toBe('ultimate-soco');
  expect(sim.snapshot().characters[0].rage).toBe(before-RAGE_LEVEL);
});

it.each(['right','left'] as const)('avança 60%% da arena livre para %s', facing => {
  const base=createGameConfig(1024,576);
  const config={...base,arena:{...base.arena,left:0,right:2000,maxSeparation:undefined}};
  const sim=new Simulation(config,[grappler,shoto],{training:true,initialDistance:100});
  const chars=(sim as unknown as {characters:CharacterState[]}).characters;
  chars[0].x=facing==='right'?250:1750; chars[1].x=facing==='right'?1900:100; chars[0].facing=facing;
  sim.fillTrainingRage(); command(sim);
  for(let i=0;i<120 && !sim.snapshot().characters[0].attack;i++)sim.stepFrame([neutral,neutral]);
  expect(sim.snapshot().characters[0].attack?.moveId).toBe('ultimate-soco');
  const start=sim.snapshot().characters[0].x;
  for(let i=0;i<200 && sim.snapshot().characters[0].attack;i++)sim.stepFrame([neutral,neutral]);
  expect(Math.abs(sim.snapshot().characters[0].x-start)).toBeCloseTo(1200,4);
});

it.each([[0,360],[1,300],[3,180],[5,180]] as const)('aplica dano %i golpes anteriores → %i', (hits, expected) => {
  const sim=new Simulation(createGameConfig(1024,576),[grappler,shoto],{training:true,initialDistance:65});
  sim.fillTrainingRage(); command(sim);
  for(let i=0;i<150 && (!sim.snapshot().characters[0].attack || sim.snapshot().ultimateActivation);i++)sim.stepFrame([neutral,neutral]);
  const internal=sim as unknown as {characters:CharacterState[];comboHistory:ComboRecord[]};
  if(hits) {
    internal.characters[1].mode='hitstun'; internal.characters[1].remainingStateFrames=200;
    internal.comboHistory=[{attackerId:'player-1',targetId:'player-2',hits,damage:0,active:true,lastFrame:sim.snapshot().frame}];
  }
  for(let i=0;i<80 && !sim.snapshot().hitEvents.some(event=>event.moveId==='ultimate-soco');i++)sim.stepFrame([neutral,neutral]);
  expect(sim.snapshot().hitEvents.find(event=>event.moveId==='ultimate-soco')).toMatchObject({outcome:'hit',damage:expected});
});

it('pode ser defendida em pé ou agachado como golpe médio', () => {
  for(const direction of ['B','DB'] as const) {
    const sim=new Simulation(createGameConfig(1024,576),[grappler,shoto],{training:true,initialDistance:65});
    sim.fillTrainingRage(); const guard:FrameInput={direction,buttons:new Set()}; command(sim,guard);
    for(let i=0;i<220 && !sim.snapshot().hitEvents.some(event=>event.moveId==='ultimate-soco');i++)sim.stepFrame([neutral,guard]);
    expect(sim.snapshot().hitEvents.find(event=>event.moveId==='ultimate-soco')?.outcome).toBe('block');
  }
});

it('executa o novo comando da primeira ultimate e preserva o atalho', () => {
  for (const shortcut of [false, true]) {
    const sim = new Simulation(createGameConfig(1024,576), [grappler,shoto], {training:true,initialDistance:100});
    sim.fillTrainingRage();
    if (shortcut) sim.stepFrame([{direction:'N',buttons:new Set(),ultimate:true}, neutral]);
    else {
      for (const direction of ['D','DF','F','D','DF'] as const) sim.stepFrame([{direction,buttons:new Set()},neutral]);
      sim.stepFrame([{direction:'F',buttons:new Set(['2'])},neutral]);
    }
    for (let i=0;i<12 && !sim.snapshot().ultimateActivation;i++) sim.stepFrame([neutral,neutral]);
    expect(sim.snapshot().characters[0].attack?.moveId).toBe('ultimate-grab');
  }
});

it('lança o adversário no acerto e deixa-o caído ao aterrissar', () => {
  const sim = new Simulation(createGameConfig(1024,576), [grappler,shoto], {training:true,initialDistance:90});
  sim.fillTrainingRage(); command(sim);
  for (let i=0;i<220 && !sim.snapshot().hitEvents.some(e=>e.moveId==='ultimate-soco');i++) sim.stepFrame([neutral,neutral]);
  const start = sim.snapshot().characters[1].x;
  expect(sim.snapshot().hitEvents.find(e=>e.moveId==='ultimate-soco')?.outcome).toBe('hit');
  let airborne = false, landed = false;
  for (let i=0;i<100;i++) {
    sim.stepFrame([neutral,neutral]);
    const target=sim.snapshot().characters[1];
    if (!target.grounded) airborne=true;
    if (airborne && target.grounded && target.mode==='knockdown') { landed=true; break; }
  }
  expect(airborne).toBe(true);
  expect(landed).toBe(true);
  expect(sim.snapshot().characters[1].remainingStateFrames).toBe(GRAPPLER_ULTIMATE_GROUND_RECOVERY_FRAMES);
  expect(sim.snapshot().characters[1].x - start).toBeGreaterThan(100);
});

it('a cabeçada aproxima e mantém a vítima no lugar após o impacto', () => {
  const sim = new Simulation(createGameConfig(1024,576), [grappler,shoto], {training:true,initialDistance:120});
  for (const direction of ['D','DF'] as const) sim.stepFrame([{direction,buttons:new Set()},neutral]);
  sim.stepFrame([{direction:'F',buttons:new Set(['1'])},neutral]);
  for (let i=0;i<100 && !sim.snapshot().hitEvents.some(e=>e.moveId==='grab-headbutt');i++) sim.stepFrame([neutral,neutral]);
  expect(sim.snapshot().hitEvents.find(e=>e.moveId==='grab-headbutt')?.outcome).toBe('hit');
  const before=sim.snapshot().characters[1].x;
  for (let i=0;i<20;i++) sim.stepFrame([neutral,neutral]);
  const pulled=sim.snapshot().characters[1].x;
  expect(pulled).toBeLessThan(before);
  for (let i=0;i<50;i++) sim.stepFrame([neutral,neutral]);
  expect(sim.snapshot().characters[1].x).toBeCloseTo(pulled);
});


it('percorre a mesma distância em 15 quadros, com 80% da velocidade anterior', () => {
  const move = grappler.moves.find(candidate => candidate.id === 'ultimate-soco')!;
  expect(move.movement!.until - move.movement!.from!).toBe(15);
  expect(move.movement!.arenaFraction! / 15).toBeCloseTo((.6 / 12) * .8);
  expect(move.activeFrames).toBe(15);
});

it.each([shoto, texas, grappler])('usa reação alta no impacto da cabeçada em $name', fighter => {
  const sim = new Simulation(createGameConfig(1024,576), [grappler,fighter], {training:true,initialDistance:100});
  for (const direction of ['D','DF'] as const) sim.stepFrame([{direction,buttons:new Set()},neutral]);
  sim.stepFrame([{direction:'F',buttons:new Set(['1'])},neutral]);
  const health = sim.snapshot().characters[1].health;
  for (let i=0;i<120 && sim.snapshot().characters[1].health === health;i++) sim.stepFrame([neutral,neutral]);
  const snapshot = sim.snapshot(), victim = snapshot.characters[1];
  expect(victim.health).toBeLessThan(health);
  expect(victim.commandGrabbed).toBeUndefined();
  expect(victim.grapplerGrabReaction).toBeUndefined();
  expect(victim.hitReaction?.level).toBe('high');
  if (fighter.id === 'shoto') expect(getShotoSpritePose(victim,snapshot.frame)?.texture).toBe('shoto-hurt-high');
  else if (fighter.id === 'texas') expect(getTexasSpritePose(victim,snapshot.frame)?.texture).toBe('texas-hurt-high');
  else expect(getGrapplerPose(victim,snapshot.frame).name).toBe('hurt-high');
});


it.each(['right','left'] as const)('mantém a direção do avanço ao atravessar o alvo para %s', facing => {
  const base = createGameConfig(1024,576);
  const config = {...base, arena:{...base.arena,left:0,right:2000,maxSeparation:undefined}};
  const sim = new Simulation(config,[grappler,shoto],{training:true,initialDistance:80});
  const chars = (sim as unknown as {characters:CharacterState[]}).characters;
  chars[0].x = facing === 'right' ? 500 : 1500;
  chars[1].x = facing === 'right' ? 580 : 1420;
  chars[0].facing = facing; chars[1].facing = facing === 'right' ? 'left' : 'right';
  sim.fillTrainingRage(); command(sim);
  let crossed = false, hit = false, previous = chars[0].x;
  for (let i=0;i<220;i++) {
    sim.stepFrame([neutral,neutral]);
    const snap=sim.snapshot(), [attacker,target]=snap.characters;
    hit ||= snap.hitEvents.some(event => event.moveId === 'ultimate-soco' && event.outcome === 'hit');
    if (!attacker.attack || attacker.attack.moveId !== 'ultimate-soco') continue;
    crossed ||= facing === 'right' ? attacker.x > target.x : attacker.x < target.x;
    expect(attacker.facing).toBe(facing);
    if (attacker.attack.elapsedFrames >= 20 && attacker.attack.elapsedFrames <= 35)
      expect((attacker.x - previous) * (facing === 'right' ? 1 : -1)).toBeGreaterThanOrEqual(-0.001);
    previous=attacker.x;
  }
  expect(hit).toBe(true);
  expect(crossed).toBe(true);
});


it('aceita a sequência solicitada em um ritmo de dois quadros por direção', () => {
  const sim = new Simulation(createGameConfig(1024,576),[grappler,shoto],{training:true,initialDistance:400});
  sim.fillTrainingRage();
  for (const direction of ['D','DB','B','DB','D','DF'] as const)
    for (let i=0;i<2;i++) sim.stepFrame([{direction,buttons:new Set()},neutral]);
  sim.stepFrame([{direction:'F',buttons:new Set(['1','2'])},neutral]);
  for (let i=0;i<12 && !sim.snapshot().ultimateActivation;i++) sim.stepFrame([neutral,neutral]);
  expect(sim.snapshot().characters[0].attack?.moveId).toBe('ultimate-soco');
});
