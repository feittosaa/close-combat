import { expect, it, vi } from 'vitest';
import { applyContactFrames, contactEffectKey, contactFrameCut, contactFrameGrowth, frameSizeAdjustments, preloadContactEffects } from '../rendering/contactEffects';
import { ProjectileView } from '../rendering/ProjectileView';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { texas } from '../engine/data/fighters/texas';
import { shoto } from '../engine/data/fighters/shoto';
import type { HitEvent } from '../engine/combat/AttackResolver';
import type { ProjectileState } from '../engine/combat/ProjectileState';

const event: HitEvent = { attackerId:'player-1',targetId:'player-2',moveId:'light-punch',damage:20,outcome:'hit',
  pushback:0,attackerRecoveryFrames:0,defenderStunFrames:0,frameAdvantage:0 };
const move = (fighter: typeof texas, id: string) => fighter.moves.find(item => item.id === id)!;

it.each(['hit','block'] as const)('selects separate images for %s variants', outcome => {
  const contact = {...event,outcome};
  expect(contactEffectKey(contact,move(texas,'light-kick'))).toBe(`${outcome}-light`);
  expect(contactEffectKey(contact,move(texas,'heavy-punch'))).toBe(`${outcome}-heavy`);
  expect(contactEffectKey(contact,move(texas,'crouch-heavy-kick'))).toBe(`${outcome}-sweep`);
  expect(contactEffectKey(contact,move(texas,'push-away'))).toBe(`${outcome}-sweep`);
  expect(contactEffectKey(contact,move(texas,'quick-shot'))).toBe(`${outcome}-blue`);
  expect(contactEffectKey(contact,move(shoto,'tomato-light'))).toBe(`${outcome}-wine`);
  expect(contactEffectKey(contact,move(shoto,'tomato-heavy'))).toBe(`${outcome}-wine`);
  expect(contactEffectKey(contact,move(shoto,'crow-ultimate'))).toBe(`${outcome}-heavy`);
});

it('preloads every image as a six-frame sheet', () => {
  const spritesheet = vi.fn(), image = vi.fn(), once = vi.fn();
  preloadContactEffects({textures:{exists:()=>false},load:{spritesheet,image,once}} as never);
  expect(once).toHaveBeenCalledWith('filecomplete-spritesheet-contact-hit-blue', expect.any(Function));
  expect(image).toHaveBeenCalledWith('wall-bounce', expect.any(String));
  expect(spritesheet).toHaveBeenCalledTimes(24);
  expect(spritesheet).toHaveBeenCalledWith('contact-grappler-ultimate-rotation', expect.any(String), { frameWidth:362, frameHeight:724 });
  expect(spritesheet).toHaveBeenCalledWith('contact-ultimate-ground-impact', expect.any(String), { frameWidth:362, frameHeight:724 });
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
  const characters=new Simulation(createGameConfig(1024,576),[texas,shoto]).snapshot().characters;
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

it('fixa o impacto da ultimate no ponto de aterrissagem e encerra o efeito', () => {
  const graphics = { clear:vi.fn(), setDepth:vi.fn(), destroy:vi.fn() };
  Object.values(graphics).forEach(fn => fn.mockReturnValue(graphics));
  const sprite = { setDepth:vi.fn(), setOrigin:vi.fn(), setDisplaySize:vi.fn(), setFrame:vi.fn(), destroy:vi.fn() };
  Object.values(sprite).forEach(fn => fn.mockReturnValue(sprite));
  const image = vi.fn().mockReturnValue(sprite);
  const view = new ProjectileView({add:{graphics:()=>graphics,image},textures:{exists:()=>true}} as never);
  const [state] = new Simulation(createGameConfig(1024,576),[shoto,texas]).snapshot().characters;
  const victim = {...state, y:440, ultimateImpactFrame:100, ultimateImpactPosition:{x:420,y:488}};
  view.sync([],[],101,[],[victim]);
  expect(image).toHaveBeenCalledWith(420,488,'contact-ultimate-ground-impact','0');
  expect(sprite.setOrigin).toHaveBeenCalledWith(.5,484/724);
  view.sync([],[],109,[],[victim]);
  expect(image).toHaveBeenCalledOnce();
  expect(sprite.setFrame).toHaveBeenLastCalledWith(3);
  view.sync([],[],118,[],[victim]);
  expect(sprite.destroy).toHaveBeenCalledOnce();
  view.destroy();
});

it('colors only the alternate Texas projectile purple', () => {
  const graphics = { clear: vi.fn(), setDepth: vi.fn(), destroy: vi.fn() };
  Object.values(graphics).forEach(fn => fn.mockReturnValue(graphics));
  const sprite = () => {
    const matrix = { hue: vi.fn(), brightness: vi.fn() };
    const pipeline: Record<string, unknown> = {};
    const value = { setDepth: vi.fn(), setTexture: vi.fn(), setPosition: vi.fn(), setDisplaySize: vi.fn(),
      setFlipX: vi.fn(), setAngle: vi.fn(), setVisible: vi.fn(), destroy: vi.fn(),
      pipeline: { name: 'MultiPipeline' }, pipelineData: pipeline, setPipeline: vi.fn((name: string) => { value.pipeline = { name }; return value; }),
      preFX: { addColorMatrix: () => matrix, remove: vi.fn() }, postFX: { addColorMatrix: () => matrix, remove: vi.fn() } };
    [value.setDepth, value.setTexture, value.setPosition, value.setDisplaySize, value.setFlipX, value.setAngle,
      value.setVisible, value.destroy].forEach(fn => fn.mockReturnValue(value));
    return { value, pipeline };
  };
  const original = sprite(), alternate = sprite(), bomb = sprite(), blast = sprite(), otherBlast = sprite();
  const image = vi.fn().mockReturnValueOnce(original.value).mockReturnValueOnce(alternate.value)
    .mockReturnValueOnce(bomb.value).mockReturnValueOnce(blast.value).mockReturnValueOnce(otherBlast.value);
  const view = new ProjectileView({ add: { graphics: () => graphics, image }, textures: { exists: () => true } } as never);
  const projectile = (id: number, ownerId: string): ProjectileState => ({ id, ownerId, fighterId: 'texas', x: 200, y: 400,
    facing: 'right', velocity: 9, remainingFrames: 50, visual: 'bullet',
    attack: { moveId: 'light-punch', buttons: ['1'], elapsedFrames: 8, hasHit: false } });
  const dynamite: ProjectileState = { ...projectile(3, 'player-2'), visual: 'dynamite', attack: { moveId: 'quick-shot', buttons: ['1'], elapsedFrames: 14, hasHit: false } };
  view.sync([projectile(1, 'player-1'), projectile(2, 'player-2'), dynamite],
    [{ id: 4, ownerId: 'player-2', kind: 'dynamite', x: 100, y: 200, remainingFrames: 12 },
      { id: 5, ownerId: 'player-1', kind: 'dynamite', x: 400, y: 200, remainingFrames: 12 }], 0, [], [], new Set(['player-2']));
  expect(original.value.setPipeline).not.toHaveBeenCalled();
  expect(alternate.value.setPipeline).toHaveBeenCalledWith('character-color');
  expect(alternate.pipeline.palette).toBe(3);
  expect(bomb.pipeline.palette).toBe(3);
  expect(blast.pipeline.palette).toBe(3);
  expect(otherBlast.value.setPipeline).not.toHaveBeenCalled();
  view.destroy();
});

it('colors blocked projectiles by attacker while retaining perfect-block feedback', () => {
  const graphics = { clear: vi.fn(), setDepth: vi.fn(), destroy: vi.fn() };
  Object.values(graphics).forEach(fn => fn.mockReturnValue(graphics));
  const makeSprite = () => {
    const pipeline: Record<string, unknown> = {};
    const value = { setDepth: vi.fn(), setDisplaySize: vi.fn(), setFlipX: vi.fn(), setFrame: vi.fn(), destroy: vi.fn(),
      pipeline: { name: 'MultiPipeline' }, pipelineData: pipeline, setPipeline: vi.fn((name: string) => { value.pipeline = { name }; return value; }),
      preFX: { addColorMatrix: () => ({ hue: vi.fn(), brightness: vi.fn() }), remove: vi.fn() }, postFX: { addColorMatrix: () => ({ hue: vi.fn(), brightness: vi.fn() }), remove: vi.fn() } };
    [value.setDepth, value.setDisplaySize, value.setFlipX, value.setFrame, value.destroy].forEach(fn => fn.mockReturnValue(value));
    return { value, pipeline };
  };
  const original = makeSprite(), alternate = makeSprite(), ultimate = makeSprite(), perfect = makeSprite(), dynamite = makeSprite(), hit = makeSprite();
  const image = vi.fn().mockReturnValueOnce(original.value).mockReturnValueOnce(alternate.value)
    .mockReturnValueOnce(ultimate.value).mockReturnValueOnce(perfect.value).mockReturnValueOnce(dynamite.value).mockReturnValueOnce(hit.value);
  const scene = { add: { graphics: () => graphics, image }, textures: { exists: () => true } };
  const view = new ProjectileView(scene as never);
  const characters = new Simulation(createGameConfig(1024, 576), [texas, texas]).snapshot().characters;
  const blocked = { ...event, outcome: 'block' as const, damage: 0 };
  view.sync([], [], 0, [blocked, { ...blocked, attackerId: 'player-2', targetId: 'player-1' },
    { ...blocked, attackerId: 'player-2', targetId: 'player-1', moveId: 'bulls-eye' },
    { ...blocked, attackerId: 'player-2', targetId: 'player-1', perfectBlock: true },
    { ...blocked, attackerId: 'player-2', targetId: 'player-1', moveId: 'quick-shot' },
    { ...event, attackerId: 'player-2', targetId: 'player-1', moveId: 'quick-shot' }], characters, new Set(['player-2']));
  expect(image.mock.calls.map(call => call[2])).toEqual(['contact-block-light', 'contact-block-blue', 'contact-block-blue', 'contact-block-perfect', 'contact-block-blue', 'contact-hit-blue']);
  expect(original.value.setPipeline).not.toHaveBeenCalled();
  expect(alternate.pipeline.palette).toBe(3);
  expect(ultimate.pipeline.palette).toBe(3);
  expect(perfect.pipeline.palette).toBe(4);
  expect(dynamite.pipeline.palette).toBe(3);
  expect(hit.pipeline.palette).toBe(3);
  view.destroy();
});

it('recorta cada desenho inteiro, sem invadir o vizinho', () => {
  for (const key of ['contact-hit-blue', 'contact-hit-sweep', 'contact-hit-light', 'contact-block-wine']) {
    const frames = [0, 1, 2, 3, 4, 5].map(frame => contactFrameCut(key, frame));
    frames.forEach((cut, index) => {
      expect(cut.x).toBeGreaterThanOrEqual(index ? frames[index - 1].x + frames[index - 1].width : 0);
      expect(cut.x + cut.width).toBeLessThanOrEqual(6 * 362);
    });
  }
  expect(contactFrameCut('contact-hit-heavy', 2)).toEqual({ x: 928, y: 0, width: 464, height: 724, left: 0, top: 0 });
});

it('aplica os cortes nos quadros carregados mantendo o tamanho do quadro', () => {
  const frames = [0, 1, 2, 3, 4, 5].map(() => { const frame = { setSize: vi.fn(), setTrim: vi.fn() }; frame.setSize.mockReturnValue(frame); return frame; });
  const texture = { has: (name: string) => Number(name) < 6, get: (index: number) => frames[index] };
  applyContactFrames({ exists: () => true, get: () => texture } as never, 'contact-hit-blue');
  const cut = contactFrameCut('contact-hit-blue', 2);
  expect(frames[2].setSize).toHaveBeenCalledWith(cut.width, cut.height, cut.x, cut.y);
  expect(frames[2].setTrim).toHaveBeenCalledWith(362, 724, cut.left, cut.top, cut.width, cut.height);
});

it('aumenta o quadro em volta do centro sem mudar o desenho no jogo', () => {
  const frame = { setSize: vi.fn(), setTrim: vi.fn() }; frame.setSize.mockReturnValue(frame);
  frameSizeAdjustments.set('contact-hit-blue', { width: 462, height: 824 });
  try {
    applyContactFrames({ exists: () => true, get: () => ({ has: (name: string) => name === '0', get: () => frame }) } as never, 'contact-hit-blue');
    const cut = contactFrameCut('contact-hit-blue', 0);
    expect(frame.setTrim).toHaveBeenCalledWith(462, 824, cut.left + 50, cut.top + 50, cut.width, cut.height);
    expect(contactFrameGrowth('contact-hit-blue')).toEqual({ x: 462 / 362, y: 824 / 724 });
  } finally { frameSizeAdjustments.clear(); }
});
