import { expect, it, vi } from 'vitest';
import { ProjectileView } from '../rendering/ProjectileView';
import { grapplerHeadbuttImpact } from '../rendering/grapplerHands';
import { createGameConfig } from '../engine/data/gameConfig';
import { grappler } from '../engine/data/fighters/grappler';
import { shoto } from '../engine/data/fighters/shoto';
import { Simulation } from '../engine/simulation/Simulation';
import { grapplerTrail } from '../rendering/grapplerTrails';

it.each([['grab-throw', 8, 'throw'], ['grab-slam', 4, 'slam'], ['grab-launcher', 1, 'launcher']] as const)(
  'mostra rastro de %s somente na fase de movimento confirmada', (id, start, name) => {
    const [actor, target] = new Simulation(createGameConfig(1024, 576), [grappler, shoto]).snapshot().characters;
    const move = grappler.moves.find(candidate => candidate.id === id)!;
    const attacker = { ...actor, attack: { moveId:id, buttons:['2' as const], elapsedFrames:move.startup + start, hasHit:true } };
    const victim = { ...target, grounded:false, throwFlight:id === 'grab-throw', grapplerGrabReaction:{moveId:id, startedFrame:0, startedLying:false} };
    expect(grapplerTrail(attacker, victim)).toMatchObject({name, frame:0, flipX:false});
    expect(grapplerTrail({...attacker, attack:{...attacker.attack, hasHit:false}}, victim)).toBeUndefined();
    expect(grapplerTrail({...attacker, attack:{...attacker.attack, elapsedFrames:move.startup + start - 1}}, victim)).toBeUndefined();
    expect(grapplerTrail({...attacker, attack:{...attacker.attack, elapsedFrames:move.startup + start + 18}}, victim)).toBeUndefined();
    expect(grapplerTrail({...attacker, facing:'left'}, victim)?.flipX).toBe(true);
    if (id === 'grab-throw') expect(grapplerTrail(attacker, {...victim, throwPull: { distancePerFrame:0, remainingFrames:1, launchDistance:0, launchFrames:1, liftSpeed:0 }})).toBeUndefined();
  },
);

it('mantém o rastro do lançador por 36 quadros mesmo após o ataque terminar', () => {
  const sim = new Simulation(createGameConfig(1024,576), [grappler, shoto], {training:true, initialDistance:65});
  const neutral = {direction:'N' as const, buttons:new Set<'2'>()};
  const step = (direction:'N'|'D'|'DB'|'B' = 'N', button = false) => sim.stepFrame([{direction,buttons:new Set(button ? ['2' as const] : [])},neutral]);
  step('D'); step('DB'); step('B', true);
  for (let i=0; i<100 && !grapplerTrail(sim.snapshot().characters[0], sim.snapshot().characters[1]); i++) step();
  const first = sim.snapshot();
  expect(grapplerTrail(first.characters[0], first.characters[1])?.name).toBe('launcher');
  const graphics = {clear:vi.fn(), setDepth:vi.fn(), destroy:vi.fn()};
  const sprite = {setDepth:vi.fn(), setDisplaySize:vi.fn(), setFlipX:vi.fn(), setFrame:vi.fn(), setPosition:vi.fn(), destroy:vi.fn()};
  Object.values(graphics).forEach(fn => fn.mockReturnValue(graphics));
  Object.values(sprite).forEach(fn => fn.mockReturnValue(sprite));
  const view = new ProjectileView({add:{graphics:()=>graphics, image:()=>sprite},textures:{exists:(key:string)=>key === 'contact-grappler-trail-launcher'}} as never);
  view.sync([], [], first.frame, [], first.characters);
  for (let i=0;i<20;i++) { step(); const snap=sim.snapshot(); view.sync([], [], snap.frame, [], snap.characters); }
  expect(sim.snapshot().characters[0].attack).toBeUndefined();
  expect(sprite.setFrame).toHaveBeenLastCalledWith(3);
  expect(sprite.destroy).not.toHaveBeenCalled();
  for (let i=0;i<16;i++) { step(); const snap=sim.snapshot(); view.sync([], [], snap.frame, [], snap.characters); }
  expect(sprite.destroy).toHaveBeenCalledOnce();
  view.destroy();
});

it('ancora o impacto da cabeçada na testa e espelha a posição', () => {
  const right = grapplerHeadbuttImpact({facing:'right'}), left = grapplerHeadbuttImpact({facing:'left'});
  expect(right.x).toBeGreaterThan(0);
  expect(right.y).toBeLessThan(-100);
  expect(left.x).toBeCloseTo(-right.x);
  expect(left.y).toBe(right.y);
});

it('não inicia rastro durante a pausa e acompanha a subida diagonal depois dela', () => {
  const [actor, target] = new Simulation(createGameConfig(1024,576), [grappler, shoto]).snapshot().characters;
  const move = grappler.moves.find(candidate => candidate.id === 'grab-launcher')!;
  const attacker = {...actor, attack:{moveId:move.id, buttons:['2' as const], elapsedFrames:move.startup + 9, hasHit:true}};
  const victim = {...target, x:400, y:300, grounded:false, grapplerGrabReaction:{moveId:move.id,startedFrame:20,startedLying:false}};
  const graphics = {clear:vi.fn(),setDepth:vi.fn(),destroy:vi.fn()};
  const sprite = {setDepth:vi.fn(),setDisplaySize:vi.fn(),setFlipX:vi.fn(),setFrame:vi.fn(),setPosition:vi.fn(),destroy:vi.fn()};
  Object.values(graphics).forEach(fn=>fn.mockReturnValue(graphics));
  Object.values(sprite).forEach(fn=>fn.mockReturnValue(sprite));
  const image=vi.fn(()=>sprite);
  const view=new ProjectileView({add:{graphics:()=>graphics,image},textures:{exists:(key:string)=>key==='contact-grappler-trail-launcher'}} as never);
  view.sync([],[],20,[],[attacker,victim],new Set(),true);
  expect(image).not.toHaveBeenCalled();
  view.sync([],[],20,[],[attacker,victim],new Set(),false);
  expect(sprite.setPosition).toHaveBeenLastCalledWith(345,365);
  const moving = {...victim,x:420,y:260};
  view.sync([],[],21,[],[attacker,moving],new Set(),false);
  expect(sprite.setPosition).toHaveBeenLastCalledWith(365,325);
  expect(sprite.setFlipX).toHaveBeenCalledWith(false);
  view.destroy();
});
