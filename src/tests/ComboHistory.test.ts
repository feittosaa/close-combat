import { expect, it } from 'vitest';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { cowboy } from '../engine/data/fighters/cowboy';
import { shoto } from '../engine/data/fighters/shoto';
import type { FrameInput } from '../input/types';

const neutral = (): FrameInput => ({direction:'N',buttons:new Set()});
const kick = (): FrameInput => ({direction:'N',buttons:new Set(['3'])});

it.each([0,1])('soma golpes até o adversário recuperar a defesa: jogador %i', player => {
  const fighters=player===0?[cowboy,shoto] as const:[shoto,cowboy] as const;
  const sim=new Simulation(createGameConfig(1024,576),fighters,{training:true,initialDistance:65});
  const step=(value:FrameInput=neutral(), guard:FrameInput=neutral())=>sim.stepFrame(player===0?[value,guard]:[guard,value]);
  for(let count=1;count<=3;count++) {
    step(kick());
    for(let tick=0;tick<70&&!sim.snapshot().hitEvents.length;tick++)step();
    expect(sim.snapshot().hitEvents[0]?.outcome).toBe('hit');
    expect(sim.snapshot().comboHistory.slice(-1)[0]).toMatchObject({attackerId:`player-${player+1}`,hits:count,damage:24*count,active:true});
    while(sim.snapshot().hitstopFramesRemaining)step();
  }
  for(let tick=0;tick<100 && sim.snapshot().comboHistory.slice(-1)[0]?.active;tick++)step();
  expect(sim.snapshot().comboHistory.slice(-1)[0]).toMatchObject({hits:3,damage:72,active:false});
  step(kick(),{direction:'DB',buttons:new Set()});
  for(let tick=0;tick<70&&!sim.snapshot().hitEvents.length;tick++)step(neutral(),{direction:'DB',buttons:new Set()});
  expect(sim.snapshot().hitEvents[0]?.outcome).toBe('block');
  expect(sim.snapshot().comboHistory).toHaveLength(1);
  sim.resetMatch();
  expect(sim.snapshot().comboHistory).toEqual([]);
});
