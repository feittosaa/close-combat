import { describe, expect, it } from 'vitest';
import { characters, getCharacterById } from '../engine/data/characters';
import { ayla } from '../engine/data/fighters/ayla';
import { aylaMove } from '../engine/data/combat/aylaCombatBook';
import { recoveryFrames } from '../engine/combat/frameData';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import type { AttackButton, Direction, FrameInput } from '../input/types';
const input=(direction:Direction='N',buttons:readonly AttackButton[]=[]):FrameInput=>({direction,buttons:new Set(buttons)});
const N=input();
function step(sim:Simulation,value=N,frames=1){for(let f=0;f<frames;f++)sim.stepFrame([value,N]);}
function wait(sim:Simulation,until:()=>boolean){for(let f=0;f<180 && !until();f++)step(sim);expect(until()).toBe(true);}
function launch(sim:Simulation,command:'electric'|'string'){
  if(command==='electric')for(const value of [input('F'),N,input('D'),input('DF',['2'])])step(sim,value);
  else {
    step(sim,input('N',['1']));wait(sim,()=>!sim.snapshot().characters[0].attack);
    step(sim,input('N',['1']));wait(sim,()=>!sim.snapshot().characters[0].attack);
    step(sim,input('N',['2']));
  }
  wait(sim,()=>!sim.snapshot().characters[1].grounded);
}
describe('liberdade após atividade e preservação das strings',()=>{
  it('aplica recuperação só no bloqueio de todos os strikes dos livros locais',()=>{
    for(const fighter of characters)for(const move of fighter.moves.filter(m=>!m.throw)){
      expect(recoveryFrames(move),`${fighter.id}/${move.id} vazio`).toBe(0);
      expect(recoveryFrames(move,'hit'),`${fighter.id}/${move.id} acerto`).toBe(0);
      expect(recoveryFrames(move,'block'),`${fighter.id}/${move.id} bloqueio`).toBe(move.combat?.recoveryOnContact??move.recovery);
    }
  });
  it.each(['ayla','gris','tester'])('%s fica livre após acerto/erro mas recupera no bloqueio',id=>{
    const fighter=getCharacterById(id)!;
    for(const outcome of ['hit','miss','block']){
      const sim=new Simulation(createGameConfig(1600,700),[fighter,fighter],{training:true,initialDistance:outcome==='miss'?350:62});
      const defense=outcome==='block'?input('B'):N;
      sim.stepFrame([input('N',['1']),defense]);
      for(let f=0;f<8 && !sim.snapshot().characters[0].attack;f++)sim.stepFrame([N,defense]);
      const move=fighter.moves.find(m=>m.id===sim.snapshot().characters[0].attack?.moveId)!;expect(move).toBeDefined();
      for(let f=0;f<100 && (sim.snapshot().characters[0].attack?.elapsedFrames??Infinity)<move.startup+move.activeFrames;f++)sim.stepFrame([N,defense]);
      const self=sim.snapshot().characters[0];
      if(outcome==='block'){expect(self.mode).toBe('recovery');expect(self.attack?.wasBlocked).toBe(true);}
      else {expect(self.attack).toBeUndefined();expect(self.mode).toBe('neutral');sim.stepFrame([input('F'),N]);expect(sim.snapshot().characters[0].x).toBeGreaterThan(self.x);}
    }
  });
  it('fraco-fraco-forte lança, retorna ao neutro e aceita elétrico sem recuperação',()=>{
    const sim=new Simulation(createGameConfig(1800,700),[ayla,ayla],{training:true,initialDistance:62});launch(sim,'string');
    expect(sim.snapshot().recentContacts.map(c=>c.event.moveId)).toEqual(['1','1,1','1,1,2'].map(c=>aylaMove(c).id));
    expect(sim.snapshot().characters[0].mode).not.toBe('recovery');wait(sim,()=>!sim.snapshot().characters[0].attack);
    for(const value of [input('F'),N,input('D'),input('DF',['2'])])step(sim,value);
    expect(sim.snapshot().characters[0].attack?.moveId).toBe(aylaMove('f,n,d,df:2').id);
    wait(sim,()=>sim.snapshot().recentContacts.length>=4);expect(sim.snapshot().characters[1].combo?.hits).toBe(4);
  });
  it('qualquer contato bloqueado conserva recuperação em golpes de múltiplos contatos',()=>{
    const sim=new Simulation(createGameConfig(1600,700),[ayla,ayla],{training:true,initialDistance:62});
    sim.stepFrame([input('N',['1','2']),input('B')]);
    for(let f=0;f<30 && sim.snapshot().recentContacts.length===0;f++)sim.stepFrame([N,input('B')]);
    expect(sim.snapshot().recentContacts[0].event.outcome).toBe('block');
    wait(sim,()=>sim.snapshot().recentContacts.length===2);
    expect(sim.snapshot().recentContacts[1].event.outcome).toBe('hit');
    expect(sim.snapshot().characters[0].attack?.wasBlocked).toBe(true);
    step(sim,N,2);expect(sim.snapshot().characters[0].mode).toBe('recovery');
  });
  it('janela de string expira e reset descarta contexto sem prender movimento',()=>{
    const sim=new Simulation(createGameConfig(1600,700),[ayla,ayla],{training:true,initialDistance:350});step(sim,input('N',['1']));step(sim,N,60);
    expect(sim.snapshot().characters[0].followup).toBeUndefined();step(sim,input('N',['1']));expect(sim.snapshot().characters[0].attack?.moveId).toBe(aylaMove('1').id);
    sim.resetMatch();expect(sim.snapshot().characters[0].followup).toBeUndefined();
  });
});
describe('tempo de suspensão e queda',()=>{
  it.each(['electric','string'] as const)('%s tem suspensão prolongada, queda contínua e levantada manual',command=>{
    const sim=new Simulation(createGameConfig(1800,700),[ayla,ayla],{training:true,initialDistance:62});launch(sim,command);
    const floor=sim.snapshot().characters[0].y;let minY=floor;let airFrames=0;let apex=false;
    while(!sim.snapshot().characters[1].grounded && airFrames<100){const target=sim.snapshot().characters[1];minY=Math.min(minY,target.y);if(target.verticalVelocity>=0)apex=true;step(sim);airFrames++;}
    expect(airFrames).toBeGreaterThanOrEqual(54);expect(airFrames).toBeLessThanOrEqual(58);
    expect(floor-minY).toBeGreaterThan(80);expect(floor-minY).toBeLessThan(100);expect(apex).toBe(true);
    expect(sim.snapshot().characters[1]).toMatchObject({mode:'knockdown',y:floor,verticalVelocity:0});
    for(let f=0;f<25;f++){sim.stepFrame([N,N]);expect(sim.snapshot().characters[1].mode).toBe('knockdown');}
    expect(sim.snapshot().characters[1].combo).toBeUndefined();
    sim.stepFrame([N,input('F')]);expect(sim.snapshot().characters[1].mode).toBe('moving');
  });
});
