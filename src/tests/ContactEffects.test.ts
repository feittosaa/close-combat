import { expect, it, vi } from 'vitest';
import { contactEffectKey, preloadContactEffects } from '../rendering/contactEffects';
import { ProjectileView } from '../rendering/ProjectileView';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { cowboy } from '../engine/data/fighters/cowboy';
import { shoto } from '../engine/data/fighters/shoto';
import type { HitEvent } from '../engine/combat/AttackResolver';

const event: HitEvent = { attackerId:'player-1',targetId:'player-2',moveId:'light-punch',damage:20,outcome:'hit',
  pushback:0,attackerRecoveryFrames:0,defenderStunFrames:0,frameAdvantage:0 };
const move = (fighter: typeof cowboy, id: string) => fighter.moves.find(item => item.id === id)!;

it.each(['hit','block'] as const)('selects separate images for %s variants', outcome => {
  const contact = {...event,outcome};
  expect(contactEffectKey(contact,move(cowboy,'light-kick'))).toBe(`${outcome}-light`);
  expect(contactEffectKey(contact,move(cowboy,'heavy-punch'))).toBe(`${outcome}-heavy`);
  expect(contactEffectKey(contact,move(cowboy,'crouch-heavy-kick'))).toBe(`${outcome}-sweep`);
  expect(contactEffectKey(contact,move(cowboy,'push-away'))).toBe(`${outcome}-sweep`);
  expect(contactEffectKey(contact,move(cowboy,'quick-shot'))).toBe(`${outcome}-blue`);
  expect(contactEffectKey(contact,move(shoto,'wine-glass'))).toBe(`${outcome}-wine`);
  expect(contactEffectKey(contact,move(shoto,'wine-bottle'))).toBe(`${outcome}-green`);
  expect(contactEffectKey({...contact,stage:'explosion'},move(shoto,'wine-ultimate'))).toBe(`${outcome}-orange`);
});

it('preloads every image as a six-frame sheet', () => {
  const spritesheet = vi.fn(), image = vi.fn();
  preloadContactEffects({textures:{exists:()=>false},load:{spritesheet,image}} as never);
  expect(image).toHaveBeenCalledWith('wall-bounce', expect.any(String));
  expect(spritesheet).toHaveBeenCalledTimes(15);
  expect(spritesheet).toHaveBeenCalledWith('contact-hit-light',expect.any(String),{frameWidth:362,frameHeight:724});
  expect(spritesheet).toHaveBeenCalledWith('contact-hit-heavy',expect.any(String),{frameWidth:464,frameHeight:724});
});

it('renders simultaneous contacts using sprites, advances frames and clears them on reset', () => {
  const graphics = {clear:vi.fn(),setDepth:vi.fn(),destroy:vi.fn()};
  Object.values(graphics).forEach(fn=>fn.mockReturnValue(graphics));
  const makeSprite = () => { const sprite={setDepth:vi.fn(),setDisplaySize:vi.fn(),setFlipX:vi.fn(),setFrame:vi.fn(),destroy:vi.fn()};
    Object.values(sprite).forEach(fn=>fn.mockReturnValue(sprite)); return sprite; };
  const first=makeSprite(),second=makeSprite();
  const image=vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second);
  const view=new ProjectileView({add:{graphics:()=>graphics,image},textures:{exists:()=>true}} as never);
  const characters=new Simulation(createGameConfig(1024,576),[cowboy,shoto]).snapshot().characters;
  view.sync([],[],10,[{...event,contactPoint:{x:300,y:250}}, {...event,outcome:'block',perfectBlock:true,contactPoint:{x:400,y:200},attackerId:'player-2',targetId:'player-1'}],characters);
  expect(image).toHaveBeenCalledTimes(2);
  expect(image).toHaveBeenNthCalledWith(2,400,200,'contact-block-perfect',0);
  expect(second.setDisplaySize).toHaveBeenCalledWith(66,66);
  view.sync([],[],14,[],characters);
  expect(first.setFrame).toHaveBeenLastCalledWith(2);
  view.sync([],[],0,[],characters);
  expect(first.destroy).toHaveBeenCalledOnce(); expect(second.destroy).toHaveBeenCalledOnce();
  view.destroy();
});
