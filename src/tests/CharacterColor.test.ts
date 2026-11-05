import { expect, it, vi } from 'vitest';
import { characterColor, CharacterColorEffect, palettePixel } from '../rendering/characterColor';
import { getStageById } from '../rendering/stages/stageCatalog';
import { createStageLayout } from '../rendering/stages/stageLayout';

it('keeps ordinary training colors while differentiating the second mirrored fighter', () => {
  const stage = getStageById('sala-treino')!;
  const layout = createStageLayout(stage, 1024, 576, 488);
  expect(characterColor(stage, layout, 500, 0, false)).toEqual({ hue: 0, brightness: 1, alternate: false });
  expect(characterColor(stage, layout, 500, 0, true)).toEqual({ hue: 0, brightness: 1, alternate: true });
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
  const render = vi.fn((_renderer: unknown) => expect(context.filter).toBe('hue-rotate(95deg) brightness(0.9)'));
  const sprite = { scene: { sys: { game: { renderer: { type: 1 } } } }, renderCanvas: render };
  const effect = new CharacterColorEffect();
  effect.apply(sprite as never, { hue: 0, brightness: 1 });
  const wrapped = sprite.renderCanvas;
  effect.apply(sprite as never, { hue: 95, brightness: .9 });
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
  expect(near.brightness).toBeGreaterThan(far.brightness);
  expect(near.hue).toBeLessThan(far.hue);
});
