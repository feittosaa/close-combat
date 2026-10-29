import { CONTACT_HITSTOP_FRAMES } from '../engine/combat/hitstop';
import { describe, expect, it } from 'vitest';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { shoto } from '../engine/data/fighters/shoto';
import { TutorialSession } from '../training/TutorialSession';
import { fighterMoveList } from '../training/MoveList';
import { formatCommand } from '../ui/commandNotation';
import type { AttackButton, Direction, FrameInput } from '../input/types';
import type { MoveDefinition } from '../engine/data/moves';
const input = (direction: Direction = 'N', buttons: readonly AttackButton[] = []): FrameInput => ({ direction, buttons: new Set(buttons) });
const N = input();
const config = createGameConfig(1024, 576);
const create = (distance = 64, fighter = shoto) => new Simulation(config, [fighter, fighter], { training: true, initialDistance: distance });
function step(sim: Simulation, value = N, player = 0, guard = N): void {
  const inputs = [guard, guard]; inputs[player] = value; sim.stepFrame(inputs);
}
function wait(sim: Simulation, frames = 80, player = 0, guard = N): void {
  for (let f = 0; f < frames; f++) step(sim, N, player, guard);
}
function command(sim: Simulation, move: MoveDefinition, player = 0): void {
  const sequence = move.input.sequence ?? [];
  for (const direction of sequence.slice(0, -1)) step(sim, input(direction), player);
  step(sim, input(sequence[sequence.length-1] ?? (move.crouching ? 'D' : 'N'), move.input.buttons), player);
}
function untilContact(sim: Simulation, player = 0, guard = N, continuous = false): void {
  for (let i = 0; i < 400; i++) {
    if (sim.snapshot().hitEvents.some(e => e.attackerId === `player-${player + 1}`)) return;
    if(continuous)expect(sim.snapshot().characters[1-player].mode, `Defender escaped combo: ${sim.snapshot().characters[player].attack?.moveId}`).toBe('hitstun');
    step(sim, N, player, guard);
  }
  throw new Error(`No contact: ${JSON.stringify(sim.snapshot().characters.map(c => ({x:c.x,y:c.y,attack:c.attack,mode:c.mode})))}`);
}
const move = (id: string) => shoto.moves.find(m => m.id === id)!;

describe('manual Shoto catalogue', () => {
  it('registers only the four authored punch strings', () => {
    expect(shoto.combos?.map(c => c.notation)).toEqual([
      '1,1,1','2,2,2','1,1,2','1,1,1+2',
    ]);
    expect(formatCommand('b,bd,d,df,f,1+2')).toContain('←,↙,↓,↘,→,');
    expect(formatCommand('f,d,fd,4')).toContain('→,↓,↘,');
    expect(fighterMoveList(shoto).filter(e => e.categories.includes('special'))).toHaveLength(5);
  });

  it.each([0,1])('executes every authored string with connected hits for player %i', player => {
    for (const recipe of shoto.combos!) {
      const sim = create(56), tutorial = new TutorialSession(shoto, 'combo-tutorial');
      tutorial.index = shoto.combos!.indexOf(recipe);
      for (const [index,id] of recipe.moveIds.entries()) {
        command(sim, move(id), player);
        untilContact(sim, player, N, index > 0);
        if (player === 0) tutorial.observe(sim.snapshot(), N);
      }
      const events = sim.snapshot().recentContacts.map(e => e.event);
      expect(events.map(e => e.moveId), recipe.notation).toEqual(recipe.moveIds);
      expect(events.every(e => e.outcome === 'hit')).toBe(true);
      expect(sim.snapshot().characters[1-player].health).toBe(1000 - recipe.moveIds.reduce((sum,id) => sum + move(id).damage,0));
      if (player === 0) expect(tutorial.passed, recipe.notation).toBe(true);
      // Completing a string does not authorize a looping continuation.
      command(sim, move(recipe.moveIds[0]), player);
      wait(sim,6);
      expect(sim.snapshot().characters[player].chain?.length ?? 0).toBeLessThanOrEqual(recipe.moveIds.length);
    }
  });

  it('never executes a full string from a held button, whiff or an unauthorized route', () => {
    const sim = create(); for(let i=0;i<100;i++)step(sim,input('N',['1']));
    expect(sim.snapshot().recentContacts).toHaveLength(1);
    const miss=create(350);command(miss,move('light-punch'));wait(miss,7);command(miss,move('heavy-punch'));
    expect(miss.snapshot().characters[0].attack?.moveId).toBe('light-punch');
    const wrong=create();command(wrong,move('heavy-punch'));untilContact(wrong);command(wrong,move('light-kick'));wait(wrong,CONTACT_HITSTOP_FRAMES+1);
    expect(wrong.snapshot().characters[0].attack?.moveId).toBe('heavy-punch');
  });

  it.each([0,1])('prioritizes crouching attacks and low guard correctly for player %i', player => {
    for(const attack of shoto.moves.filter(m => m.crouching)) {
      for(const guard of [input('B'),input('DB')]) {
        const sim=create(56);command(sim,attack,player);untilContact(sim,player,guard);
        const event=sim.snapshot().hitEvents[0];
        expect(event.moveId).toBe(attack.id);
        expect(event.outcome).toBe(attack.hitLevel==='low' && guard.direction==='B'?'hit':'block');
        expect(sim.snapshot().characters[player].crouching).toBe(true);
      }
    }
  });

  it.each([0,1])('supports both throws against guard, but not at range or in the air for player %i', player => {
    for(const attack of shoto.moves.filter(m => m.category==='throw')) {
      const sim=create(48);command(sim,attack,player);untilContact(sim,player,input('B'));
      expect(sim.snapshot().hitEvents[0]).toMatchObject({moveId:attack.id,outcome:'hit',damage:attack.damage});
      const far=create(150);command(far,attack,player);wait(far);expect(far.snapshot().recentContacts).toHaveLength(0);
      const air=create(48);step(air,input('U'),1-player);command(air,attack,player);wait(air);expect(air.snapshot().recentContacts).toHaveLength(0);
    }
  });

  it('merges a chord within three frames without committing its first single attack', () => {
    const sim=create();step(sim,input('N',['1']));step(sim,input('N',['1','2']));
    expect(sim.snapshot().characters[0].attack?.moveId).toBe('power-punch');
    untilContact(sim);expect(sim.snapshot().recentContacts.map(c=>c.event.moveId)).toEqual(['power-punch']);
  });

  it.each([0,1])('creates independently travelling fast/slow wine projectiles for player %i', player => {
    for(const id of ['wine-glass','wine-bottle']) {
      const sim=create(300), attack=move(id);command(sim,attack,player);
      expect(sim.snapshot().characters[player].attack?.moveId).toBe(id);
      wait(sim,attack.startup);
      expect(sim.snapshot().projectiles).toHaveLength(1);
      const projectile=sim.snapshot().projectiles[0];
      expect(Math.abs(projectile.velocity)).toBe(attack.projectile!.speed);
      untilContact(sim,player);expect(sim.snapshot().hitEvents[0]).toMatchObject({moveId:id,damage:attack.damage});
      expect(sim.snapshot().projectiles).toHaveLength(0);
      const blocked=create(300);command(blocked,attack,player);untilContact(blocked,player,input('B'));
      expect(blocked.snapshot().hitEvents[0].outcome).toBe('block');
    }
  });

  it.each([0,1])('keeps single reversal kicks without the removed aerial extension for player %i', player => {
    for (const id of ['reversal-light','reversal-kick']) {
      const sim=create(56);command(sim,move(id),player);untilContact(sim,player);
      step(sim,input('N',['4']),player);wait(sim,CONTACT_HITSTOP_FRAMES+1);
      expect(sim.snapshot().characters[player].attack?.moveId).toBe(id);
      expect(sim.snapshot().recentContacts.map(e=>e.event.moveId)).toEqual([id]);
    }
    expect(shoto.moves.some(m=>m.id==='reversal-followup')).toBe(false);
  });

  it('builds rage on real contacts, requires a full bar and consumes it on ultimate startup', () => {
    const fastCharge={...shoto,rage:{...shoto.rage!,onHit:200}};
    const noRage=create(300);command(noRage,move('wine-ultimate'));
    expect(noRage.snapshot().characters[0].attack).toBeUndefined();
    const sim=create(56,fastCharge);command(sim,move('light-punch'));untilContact(sim);
    expect(sim.snapshot().characters.map(c=>c.rage)).toEqual([200,15]);wait(sim);
    command(sim,move('wine-ultimate'));
    expect(sim.snapshot().characters[0]).toMatchObject({rage:0,attack:{moveId:'wine-ultimate'}});
    untilContact(sim);expect(sim.snapshot().hitEvents[0]).toMatchObject({moveId:'wine-ultimate',stage:'confirm',damage:0});
    step(sim);untilContact(sim);expect(sim.snapshot().hitEvents[0]).toMatchObject({moveId:'wine-ultimate',stage:'explosion',damage:280});
    expect(sim.snapshot().characters[0].rage).toBe(0);
    sim.resetMatch();expect(sim.snapshot().projectiles).toHaveLength(0);expect(sim.snapshot().characters.map(c=>c.rage)).toEqual([0,0]);
  });

  it('keeps resource gains local to fighters that declare a rage system', () => {
    const bare={...shoto,id:'other',rage:undefined,combos:[],moves:shoto.moves.filter(m=>m.category==='basic')};
    const sim=create(56,bare);command(sim,move('light-punch'));untilContact(sim);
    expect(sim.snapshot().characters.map(c=>[c.rage,c.maxRage])).toEqual([[0,0],[0,0]]);
  });
  it('reversal ignores a real incoming melee attack while ordinary aerial kick remains vulnerable', () => {
    for(const id of ['reversal-kick','reversal-light']) {
      const sim=create(56);step(sim,input('N',['1']),1);
      command(sim,move(id));
      for(let i=0;i<10;i++)step(sim);
      expect(sim.snapshot().characters[0].health).toBe(id==='reversal-kick'?1000:980);
    }
  });

  it('advancing knee passes through a real projectile, but is not immune to melee', () => {
    const sim=create(200);command(sim,move('wine-glass'),1);
    wait(sim,20);command(sim,move('advancing-knee'));
    const start=sim.snapshot().characters[0].x;
    for(let i=0;i<26;i++)step(sim);
    expect(sim.snapshot().characters[0].x).toBeGreaterThan(start);
    expect(sim.snapshot().characters[0].health).toBe(1000);
    expect(sim.snapshot().projectiles.some(p=>p.x < sim.snapshot().characters[0].x)).toBe(true);
    const melee=create(56);step(melee,input('N',['1']),1);command(melee,move('advancing-knee'));wait(melee,7);
    expect(melee.snapshot().characters[0].health).toBe(980);
  });

  it('a projectile contact triggers hitstop independently of the round clock and resets with the match', () => {
    const sim=new Simulation(config,undefined,{initialDistance:300});
    command(sim,move('wine-glass'));untilContact(sim);
    const contact=sim.snapshot();expect(contact.hitstopFramesRemaining).toBe(CONTACT_HITSTOP_FRAMES);
    step(sim);expect(sim.snapshot().frame).toBe(contact.frame);
    expect(sim.snapshot().roundFramesRemaining).toBe(contact.roundFramesRemaining-1);
    sim.resetMatch();expect(sim.snapshot().projectiles).toEqual([]);
  });

  it('fills rage only in training and gains nothing on whiff', () => {
    const fight=new Simulation(config);fight.fillTrainingRage();
    expect(fight.snapshot().characters.map(c=>c.rage)).toEqual([0,0]);
    const practice=create();practice.fillTrainingRage();
    expect(practice.snapshot().characters.map(c=>c.rage)).toEqual([200,200]);
    const miss=create(350);command(miss,move('heavy-punch'));wait(miss);
    expect(miss.snapshot().characters.map(c=>c.rage)).toEqual([0,0]);
    const blocked=create();command(blocked,move('light-punch'));untilContact(blocked,0,input('B'));
    expect(blocked.snapshot().characters.map(c=>c.rage)).toEqual([5,5]);
  });

  it('crouching uppercut reaches an airborne opponent', () => {
    const sim=create(56);step(sim,input('U'),1);command(sim,move('crouch-uppercut'));untilContact(sim);
    expect(sim.snapshot().hitEvents[0].moveId).toBe('crouch-uppercut');
    expect(sim.snapshot().characters[1].grounded).toBe(false);
  });

  it('projectile continues after its owner is interrupted, then expires without contact', () => {
    const sim=create(56);command(sim,move('wine-bottle'));
    // Time a reversal to interrupt after bottle release while its invulnerability avoids contact.
    wait(sim,move('wine-bottle').startup-7);command(sim,move('reversal-kick'),1);
    untilContact(sim,1);
    expect(sim.snapshot().characters[0].mode).toBe('hitstun');
    expect(sim.snapshot().projectiles.some(p=>p.ownerId==='player-1')).toBe(true);
    wait(sim,220);expect(sim.snapshot().projectiles).toHaveLength(0);
  });

  it.each([0,1])('gates ultimate and respects guard on either side for player %i', player => {
    const sim=create(200);sim.fillTrainingRage();command(sim,move('wine-ultimate'),player);
    expect(sim.snapshot().characters[player].rage).toBe(0);
    untilContact(sim,player,input('B'));
    expect(sim.snapshot().hitEvents[0]).toMatchObject({moveId:'wine-ultimate',outcome:'block',damage:0});
  });

});
