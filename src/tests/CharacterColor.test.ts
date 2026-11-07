import { expect, it, vi } from 'vitest';
import { characterColor, CharacterColorEffect, palettePixel } from '../rendering/characterColor';
import { getStageById } from '../rendering/stages/stageCatalog';
import { createStageLayout } from '../rendering/stages/stageLayout';

it('keeps ordinary training colors while differentiating the second mirrored fighter', () => {
  const stage = getStageById('sala-treino')!;
  const layout = createStageLayout(stage, 1024, 576, 488);
  const neutral = { exposure: 1, shadow: [1, 1, 1], occlusion: 0, warmth: 0 };
  expect(characterColor(stage, layout, 500, 0, false)).toEqual({ ...neutral, alternate: false });
  expect(characterColor(stage, layout, 500, 0, true)).toEqual({ ...neutral, alternate: true });
});

it('changes clothing and magic colors while preserving skin and unrelated colors', () => {
  const shirt = palettePixel(136, 104, 48, 'bob');
  const poncho = palettePixel(176, 32, 32, 'texas');
  const magic = palettePixel(60, 180, 230, 'magic');
  expect(shirt[0]).toBeGreaterThan(shirt[1] * 2);
  expect(shirt[0]).toBeGreaterThan(136);
  expect(poncho).toEqual([53, 53, 53]);
  expect(palettePixel(255, 145, 125, 'texas')[0]).toBeLessThan(200);
  expect(palettePixel(240, 70, 190, 'texas')).toEqual([72, 72, 72]);
  expect(palettePixel(230, 60, 230, 'texas')[0]).toBeLessThan(170);
  const leather = palettePixel(112, 64, 48, 'texas');
  expect(leather[0]).toBeLessThan(45);
  expect(leather[0] - leather[2]).toBeLessThan(6);
  expect(palettePixel(155, 75, 60, 'texas')[0]).toBeLessThan(155);
  expect(magic[2]).toBeGreaterThan(magic[1]);
  expect(palettePixel(60, 180, 230, 'texas')).toEqual(magic);
  expect(palettePixel(200, 220, 240, 'magic')).not.toEqual([200, 220, 240]);
  for (const palette of ['bob', 'texas', 'magic'] as const) {
    expect(palettePixel(240, 144, 80, palette)).toEqual([240, 144, 80]);
    expect(palettePixel(240, 224, 208, palette)).toEqual([240, 224, 208]);
  }
});

it('scopes canvas coloring to the fighter and updates it without wrapping repeatedly', () => {
  const context = { filter: 'none', save: vi.fn(), restore: vi.fn() };
  const render = vi.fn((_renderer: unknown) => expect(context.filter).toBe('brightness(0.9)'));
  const sprite = { scene: { sys: { game: { renderer: { type: 1 } } } }, renderCanvas: render };
  const effect = new CharacterColorEffect();
  effect.apply(sprite as never, {});
  const wrapped = sprite.renderCanvas;
  effect.apply(sprite as never, { exposure: .9 });
  expect(sprite.renderCanvas).toBe(wrapped);
  sprite.renderCanvas({ currentContext: context } as never);
  expect(render).toHaveBeenCalledOnce();
  expect(context.save).toHaveBeenCalledOnce();
  expect(context.restore).toHaveBeenCalledOnce();
});

it('lights a fighter near a flame and follows the layer parallax', () => {
  const original = getStageById('saloon')!;
  const flame = original.layers.find(layer => layer.id.startsWith('chama-'))!;
  const stage = { ...original, layers: [{ ...flame, parallax: .5 }] };
  const layout = createStageLayout(stage, 1024, 576, 488);
  const center = (flame.x + flame.size!.width / 2) * layout.scale;
  const near = characterColor(stage, layout, center + 50, 100, false);
  const far = characterColor(stage, layout, center + 500, 100, false);
  expect(near.warmth).toBeGreaterThan(far.warmth!);
  expect(far.warmth).toBeLessThan(.2);
});

const lit = { exposure: .9, shadow: [.9, .84, .8], occlusion: .2, warmth: .3 } as const;
const webglSprite = () => {
  const added: string[] = [];
  const sprite = {
    scene: { sys: { game: { renderer: { type: 2 } } } },
    pipeline: { name: 'MultiPipeline' }, pipelineData: {} as Record<string, unknown>,
    setPipeline: vi.fn((name: string) => { added.push(name); sprite.pipeline = { name }; }),
  };
  return { sprite, added };
};

it.each([['palette from the start', false], ['lit first, palette added later', true]] as const)('recolors and lights every sprite through the one shared pipeline (%s)', (_name, plainFirst) => {
  const { sprite, added } = webglSprite();
  const effect = new CharacterColorEffect();
  if (plainFirst) {
    effect.apply(sprite as never, { ...lit, alternate: false }, 'bob');
    expect(sprite.pipelineData).toMatchObject({ palette: 0, lit: true });
  }
  effect.apply(sprite as never, { ...lit, alternate: true }, 'bob');
  effect.apply(sprite as never, { ...lit, exposure: .8, alternate: true }, 'bob');
  expect(added).toEqual(['character-color']);
  expect(sprite.pipelineData).toMatchObject({ palette: 1, lit: true, exposure: .8, occlusion: .2, warmth: .3, shadow: [.9, .84, .8] });
  effect.apply(sprite as never, { alternate: false }, 'bob');
  expect(sprite.pipelineData).toMatchObject({ palette: 0, lit: false });
});

it('adds no lighting pass to sprites on a neutral stage, and never rotates hue', () => {
  const { sprite, added } = webglSprite();
  new CharacterColorEffect().apply(sprite as never, { alternate: false }, 'texas');
  expect(added).toEqual([]);
});

it('keeps the Texas poncho red on every stage: lighting only multiplies and deepens, it never changes the hue', () => {
  const poncho = [176, 32, 32] as const;
  const hueOf = ([r, g, b]: readonly number[]) => { const max = Math.max(r, g, b), d = max - Math.min(r, g, b); return ((max === r ? (g - b) / d : max === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60 + 360) % 360; };
  for (const id of ['fazenda', 'saloon-dia', 'saloon-noite', 'saloon']) {
    const stage = getStageById(id)!, layout = createStageLayout(stage, 1024, 576, 488);
    const { exposure = 1, shadow = [1, 1, 1], occlusion = 0 } = characterColor(stage, layout, 500, 0, false);
    const lum = (.299 * poncho[0] + .587 * poncho[1] + .114 * poncho[2]) / 255, shade = 1 - Math.min(1, Math.max(0, (lum - .05) / .65)) ** 2 * (3 - 2 * Math.min(1, Math.max(0, (lum - .05) / .65)));
    const lighted = poncho.map((value, channel) => value * (1 + (shadow[channel] - 1) * shade) * (1 - occlusion * shade) * exposure);
    const gap = Math.abs(hueOf(lighted) - hueOf(poncho));
    expect(Math.min(gap, 360 - gap), id).toBeLessThan(12);
  }
});
