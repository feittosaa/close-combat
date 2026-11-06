import { expect, it, vi } from 'vitest';
import { contactEffectKey, preloadContactEffects } from '../rendering/contactEffects';
import { ProjectileView } from '../rendering/ProjectileView';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { cowboy } from '../engine/data/fighters/cowboy';
import { shoto } from '../engine/data/fighters/shoto';
import type { HitEvent } from '../engine/combat/AttackResolver';
import type { ProjectileState } from '../engine/combat/ProjectileState';

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
  expect(contactEffectKey(contact,move(shoto,'tomato-light'))).toBe(`${outcome}-wine`);
  expect(contactEffectKey(contact,move(shoto,'tomato-heavy'))).toBe(`${outcome}-wine`);
  expect(contactEffectKey(contact,move(shoto,'crow-ultimate'))).toBe(`${outcome}-heavy`);
});

it('preloads every image as a six-frame sheet', () => {
  const spritesheet = vi.fn(), image = vi.fn();
  preloadContactEffects({textures:{exists:()=>false},load:{spritesheet,image}} as never);
  expect(image).toHaveBeenCalledWith('wall-bounce', expect.any(String));
  expect(spritesheet).toHaveBeenCalledTimes(11);
  expect(spritesheet).toHaveBeenCalledWith('contact-hit-light',expect.any(String),{frameWidth:362,frameHeight:724});
  expect(spritesheet).toHaveBeenCalledWith('contact-hit-heavy',expect.any(String),{frameWidth:464,frameHeight:724});
  expect(spritesheet).toHaveBeenCalledWith('contact-hit-wine',expect.any(String),{frameWidth:512,frameHeight:724});
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

it('colors only the alternate Texas projectile purple', () => {
  const graphics = { clear: vi.fn(), setDepth: vi.fn(), destroy: vi.fn() };
  Object.values(graphics).forEach(fn => fn.mockReturnValue(graphics));
  const sprite = () => {
    const matrix = { hue: vi.fn(), brightness: vi.fn() };
    const pipeline = { palette: 0 };
    const value = { setDepth: vi.fn(), setTexture: vi.fn(), setPosition: vi.fn(), setDisplaySize: vi.fn(),
      setFlipX: vi.fn(), setAngle: vi.fn(), setVisible: vi.fn(), destroy: vi.fn(),
      setPostPipeline: vi.fn(), getPostPipeline: vi.fn(() => pipeline), preFX: { addColorMatrix: () => matrix, remove: vi.fn() }, postFX: { addColorMatrix: () => matrix, remove: vi.fn() } };
    [value.setDepth, value.setTexture, value.setPosition, value.setDisplaySize, value.setFlipX, value.setAngle,
      value.setVisible, value.destroy, value.setPostPipeline].forEach(fn => fn.mockReturnValue(value));
    return { value, pipeline };
  };
  const original = sprite(), alternate = sprite(), bomb = sprite(), blast = sprite(), otherBlast = sprite();
  const image = vi.fn().mockReturnValueOnce(original.value).mockReturnValueOnce(alternate.value)
    .mockReturnValueOnce(bomb.value).mockReturnValueOnce(blast.value).mockReturnValueOnce(otherBlast.value);
  const view = new ProjectileView({ add: { graphics: () => graphics, image }, textures: { exists: () => true } } as never);
  const projectile = (id: number, ownerId: string): ProjectileState => ({ id, ownerId, fighterId: 'cowboy', x: 200, y: 400,
    facing: 'right', velocity: 9, remainingFrames: 50, visual: 'bullet',
    attack: { moveId: 'light-punch', buttons: ['1'], elapsedFrames: 8, hasHit: false } });
  const dynamite: ProjectileState = { ...projectile(3, 'player-2'), visual: 'dynamite', attack: { moveId: 'quick-shot', buttons: ['1'], elapsedFrames: 14, hasHit: false } };
  view.sync([projectile(1, 'player-1'), projectile(2, 'player-2'), dynamite],
    [{ id: 4, ownerId: 'player-2', kind: 'dynamite', x: 100, y: 200, remainingFrames: 12 },
      { id: 5, ownerId: 'player-1', kind: 'dynamite', x: 400, y: 200, remainingFrames: 12 }], 0, [], [], new Set(['player-2']));
  expect(original.value.setPostPipeline).not.toHaveBeenCalled();
  expect(alternate.value.setPostPipeline).toHaveBeenCalledWith('character-palette');
  expect(alternate.pipeline.palette).toBe(3);
  expect(bomb.pipeline.palette).toBe(3);
  expect(blast.pipeline.palette).toBe(3);
  expect(otherBlast.value.setPostPipeline).not.toHaveBeenCalled();
  view.destroy();
});

it('colors blocked projectiles by attacker while retaining perfect-block feedback', () => {
  const graphics = { clear: vi.fn(), setDepth: vi.fn(), destroy: vi.fn() };
  Object.values(graphics).forEach(fn => fn.mockReturnValue(graphics));
  const makeSprite = () => {
    const pipeline = { palette: 0 };
    const value = { setDepth: vi.fn(), setDisplaySize: vi.fn(), setFlipX: vi.fn(), setFrame: vi.fn(), destroy: vi.fn(),
      setPostPipeline: vi.fn(), getPostPipeline: vi.fn(() => pipeline), preFX: { addColorMatrix: () => ({ hue: vi.fn(), brightness: vi.fn() }), remove: vi.fn() }, postFX: { addColorMatrix: () => ({ hue: vi.fn(), brightness: vi.fn() }), remove: vi.fn() } };
    [value.setDepth, value.setDisplaySize, value.setFlipX, value.setFrame, value.destroy, value.setPostPipeline].forEach(fn => fn.mockReturnValue(value));
    return { value, pipeline };
  };
  const original = makeSprite(), alternate = makeSprite(), ultimate = makeSprite(), perfect = makeSprite(), dynamite = makeSprite(), hit = makeSprite();
  const image = vi.fn().mockReturnValueOnce(original.value).mockReturnValueOnce(alternate.value)
    .mockReturnValueOnce(ultimate.value).mockReturnValueOnce(perfect.value).mockReturnValueOnce(dynamite.value).mockReturnValueOnce(hit.value);
  const scene = { add: { graphics: () => graphics, image }, textures: { exists: () => true } };
  const view = new ProjectileView(scene as never);
  const characters = new Simulation(createGameConfig(1024, 576), [cowboy, cowboy]).snapshot().characters;
  const blocked = { ...event, outcome: 'block' as const, damage: 0 };
  view.sync([], [], 0, [blocked, { ...blocked, attackerId: 'player-2', targetId: 'player-1' },
    { ...blocked, attackerId: 'player-2', targetId: 'player-1', moveId: 'bulls-eye' },
    { ...blocked, attackerId: 'player-2', targetId: 'player-1', perfectBlock: true },
    { ...blocked, attackerId: 'player-2', targetId: 'player-1', moveId: 'quick-shot' },
    { ...event, attackerId: 'player-2', targetId: 'player-1', moveId: 'quick-shot' }], characters, new Set(['player-2']));
  expect(image.mock.calls.map(call => call[2])).toEqual(['contact-block-light', 'contact-block-blue', 'contact-block-blue', 'contact-block-perfect', 'contact-block-blue', 'contact-hit-blue']);
  expect(original.value.setPostPipeline).not.toHaveBeenCalled();
  expect(alternate.pipeline.palette).toBe(3);
  expect(ultimate.pipeline.palette).toBe(3);
  expect(perfect.pipeline.palette).toBe(4);
  expect(dynamite.pipeline.palette).toBe(3);
  expect(hit.pipeline.palette).toBe(3);
  view.destroy();
});
