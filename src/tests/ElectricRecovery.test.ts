import { getCharacterById } from '../engine/data/characters';
import { describe, expect, it } from 'vitest';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { ayla } from '../engine/data/fighters/ayla';
import { aylaMove } from '../engine/data/combat/aylaCombatBook';
import { recoveryFrames } from '../engine/combat/frameData';
import type { Direction, FrameInput } from '../input/types';
const input=(direction:Direction='N',pressed=false):FrameInput=>({direction,buttons:new Set(pressed?['2']:[])});
const N=input();const electric=aylaMove('f,n,d,df:2');
function step(sim:Simulation,value=N,frames=1){for(let f=0;f<frames;f++)sim.stepFrame([value,N]);}
function command(sim:Simulation){step(sim,input('F'));step(sim);step(sim,input('D'));step(sim,input('DF',true));}
describe('recuperação apenas no bloqueio',()=>{
  it.each(['ayla','gris','tester','dummy'])('encadeia elétricos contra %s no primeiro frame livre após atividade',target=>{
    const sim=new Simulation(createGameConfig(1600,700),[ayla,getCharacterById(target)!],{training:true,initialDistance:96});command(sim);
    step(sim,N,11);expect(sim.snapshot().characters[0].attack).toBeUndefined();expect(sim.snapshot().characters[0].mode).toBe('neutral');
    command(sim);step(sim,N,11);
    const contacts=sim.snapshot().recentContacts.filter(c=>c.event.moveId===electric.id && c.event.outcome==='hit');
    expect(contacts).toHaveLength(2);expect(contacts[1].frame-contacts[0].frame).toBeLessThanOrEqual(16);
    expect(sim.snapshot().characters[1].combo?.hits).toBe(2);
    expect(recoveryFrames(electric,'hit')).toBe(0);expect(recoveryFrames(electric)).toBe(0);expect(recoveryFrames(electric,'block')).toBe(18);
  });
  it('mantém recuperação e +5F ao ser bloqueado',()=>{
    const sim=new Simulation(createGameConfig(1600,700),[ayla,ayla],{training:true,initialDistance:96});
    for(const value of [input('F'),N,input('D'),input('DF',true)])sim.stepFrame([value,input('B')]);
    for(let f=0;f<20 && sim.snapshot().hitEvents.length===0;f++)sim.stepFrame([N,input('B')]);
    expect(sim.snapshot().hitEvents[0]).toMatchObject({outcome:'block',frameAdvantage:5});
    sim.stepFrame([N,input('B')]);expect(sim.snapshot().characters[0].mode).toBe('recovery');
    command(sim);expect(sim.snapshot().characters[0].attack?.moveId).toBe(electric.id);expect(sim.snapshot().characters[0].mode).toBe('recovery');
  });
  it('botão mantido não repete elétrico depois de ficar livre',()=>{
    const sim=new Simulation(createGameConfig(1600,700),[ayla,ayla],{training:true,initialDistance:96});command(sim);step(sim,input('DF',true),70);
    expect(sim.snapshot().recentContacts.filter(c=>c.event.moveId===electric.id && c.event.outcome==='hit')).toHaveLength(1);
    expect(sim.snapshot().characters[0].attack).toBeUndefined();
  });
});
