import { afterEach, expect, it, vi } from 'vitest';
import { FightSounds, selectSoundVariant } from '../audio/FightSounds';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { cowboy } from '../engine/data/fighters/cowboy';
import { shoto } from '../engine/data/fighters/shoto';
import type { FrameInput } from '../input/types';

afterEach(() => vi.restoreAllMocks());

it('selects variants with the requested weights, normalized for fewer files', () => {
  expect([.01,.51,.76,.91].map(value => selectSoundVariant(4,value))).toEqual([1,2,3,4]);
  expect([.65,.68].map(value => selectSoundVariant(2,value))).toEqual([1,2]);
});

it.each(['hit','block'] as const)('plays magic and %s once per simulation event', outcome => {
  vi.spyOn(Math, 'random').mockReturnValue(0);
  const play=vi.fn();
  const sounds=new FightSounds({cache:{audio:{exists:()=>true}},sound:{play}} as never);
  const sim=new Simulation(createGameConfig(1024,576),[cowboy,shoto],{training:true,initialDistance:65});
  const neutral:FrameInput={direction:'N',buttons:new Set()};
  const guard:FrameInput={direction:outcome==='block'?'B':'N',buttons:new Set()};
  const attack:FrameInput={direction:'N',buttons:new Set(['1'])};
  sim.stepFrame([attack,guard]);sounds.observe(sim.snapshot());
  for(let i=0;i<80;i++){sim.stepFrame([neutral,guard]);sounds.observe(sim.snapshot());}
  const keys=play.mock.calls.map(call=>call[0]);
  expect(keys.filter(key=>key==='sfx-magical_shot_1')).toHaveLength(1);
  expect(keys.filter(key=>key==='sfx-magical_arms_1')).toHaveLength(1);
  expect(keys.filter(key=>key===`sfx-${outcome}_1`)).toHaveLength(1);
  expect(play).toHaveBeenCalledWith('sfx-magical_shot_1', {volume:.7});
  expect(play).toHaveBeenCalledWith(`sfx-${outcome}_1`, {volume:1.15});
  expect(keys.some(key=>key.startsWith('sfx-perfect_block'))).toBe(false);
});
