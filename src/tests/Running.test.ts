import { describe, expect, it } from 'vitest';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { defaultCharacter as shoto } from '../engine/data/characters';
import type { Direction, FrameInput } from '../input/types';
import { getCharacterAnimationKey } from '../rendering/animations/CharacterAnimationMap';
const input=(direction:Direction):FrameInput=>({direction,buttons:new Set()});const N=input('N');
describe('corrida após dash',()=>{
  it.each([shoto])('$name corre ao manter avanço após os 12F de dash',fighter=>{
    const sim=new Simulation(createGameConfig(2200,700),[fighter,fighter],{training:true,initialDistance:900});
    sim.stepFrame([input('F'),N]);sim.stepFrame([N,N]);
    for(let f=0;f<12;f++){sim.stepFrame([input('F'),N]);expect(sim.snapshot().characters[0].mode).toBe('dashing');}
    const x=sim.snapshot().characters[0].x;sim.stepFrame([input('F'),N]);const state=sim.snapshot().characters[0];
    expect(state.mode).toBe('running');expect(state.x-x).toBeCloseTo(fighter.movement.runSpeed!);expect(getCharacterAnimationKey(state)).toBe(`${fighter.id}-run`);
    sim.stepFrame([N,N]);expect(sim.snapshot().characters[0].mode).toBe('neutral');
    sim.stepFrame([input('F'),N]);expect(sim.snapshot().characters[0].mode).not.toBe('running');
  });
  it('caminhada normal e backdash não viram corrida; salto e golpe interrompem',()=>{
    const sim=new Simulation(createGameConfig(2200,700),[shoto,shoto],{training:true,initialDistance:900});
    for(let f=0;f<30;f++)sim.stepFrame([input('F'),N]);expect(sim.snapshot().characters[0].mode).toBe('moving');
    sim.stepFrame([input('B'),N]);sim.stepFrame([N,N]);for(let f=0;f<20;f++)sim.stepFrame([input('B'),N]);expect(sim.snapshot().characters[0].mode).toBe('moving');
    sim.stepFrame([input('F'),N]);sim.stepFrame([N,N]);for(let f=0;f<13;f++)sim.stepFrame([input('F'),N]);expect(sim.snapshot().characters[0].mode).toBe('running');
    sim.stepFrame([{direction:'F',buttons:new Set(['1'])},N]);expect(sim.snapshot().characters[0].mode).toBe('startup');
    const airborne=new Simulation(createGameConfig(2200,700),[shoto,shoto],{training:true,initialDistance:900});
    airborne.stepFrame([input('F'),N]);airborne.stepFrame([N,N]);for(let f=0;f<13;f++)airborne.stepFrame([input('F'),N]);airborne.stepFrame([input('UF'),N]);
    expect(airborne.snapshot().characters[0]).toMatchObject({grounded:false,mode:'airborne'});
  });
});
