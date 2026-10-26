import { expect, it } from 'vitest';
import { applyShotoPalettePixels, shotoColor, shotoMaterial, shotoPalette } from '../rendering/animations/shotoPalette';

it('mantém cabelo castanho separado da pele e da camisa vinho', () => {
  expect(shotoMaterial(174, 43, 28, .06)).toBe('hair');
  expect(shotoMaterial(182, 109, 64, .12)).toBe('skin');
  expect(shotoMaterial(182, 109, 64, .38)).toBe('skin');
  expect(shotoMaterial(121, 57, 49, .38, .15)).toBe('skin');
  expect(shotoMaterial(121, 57, 49, .38, 0)).toBe('shirt');
  expect(shotoMaterial(119, 42, 39, .35)).toBe('shirt');
  expect(shotoMaterial(100, 49, 36, .94)).toBe('shoes');
  expect(shotoMaterial(100, 49, 36, .79)).toBe('shoes'); // lifted rear boot during a step
  expect(shotoMaterial(231, 220, 190, .34)).toBe('jacket');
  expect(shotoMaterial(227, 194, 143, .34)).toBe('jacket');
  expect(shotoMaterial(181, 145, 95, .34)).toBe('jacket');
  expect(shotoMaterial(233, 204, 163, .12)).toBe('jacket'); // raised dash sleeve, level with the face
});

it('usa a mesma rampa escura em calças claras/escurecidas de folhas diferentes', () => {
  const samples = [[40, 37, 31], [65, 62, 50], [93, 88, 72]];
  const allowed = new Set(shotoPalette.trousers.map(hex => hex.toLowerCase()));
  for (const [r, g, b] of samples) {
    expect(shotoMaterial(r, g, b, .65)).toBe('trousers');
    const color = shotoColor(r, g, b, .65);
    expect(allowed.has('#' + color.map(v => v.toString(16).padStart(2, '0')).join(''))).toBe(true);
    expect(Math.max(...color)).toBeLessThan(75);
  }
});

it('preserva exatamente alpha, espaços transparentes e células com alturas diferentes', () => {
  // Two cells: second pose is crouched, with its head lower in the shared cell.
  const width = 4, height = 8, bytes = new Uint8ClampedArray(width * height * 4);
  const put = (x: number, y: number, rgba: number[]) => bytes.set(rgba, (y * width + x) * 4);
  put(0, 0, [174, 43, 28, 255]); put(0, 7, [100, 49, 36, 255]);
  put(2, 4, [174, 43, 28, 255]); put(2, 7, [100, 49, 36, 255]);
  put(3, 5, [182, 109, 64, 77]); put(1, 2, [255, 0, 255, 0]);
  const original = bytes.slice();
  applyShotoPalettePixels(bytes, width, height, 2);
  expect([...bytes.filter((_, i) => i % 4 === 3)]).toEqual([...original.filter((_, i) => i % 4 === 3)]);
  expect([...bytes.slice(0, 3)]).toEqual([...bytes.slice((4 * width + 2) * 4, (4 * width + 2) * 4 + 3)]);
  expect([...bytes.slice((2 * width + 1) * 4, (2 * width + 1) * 4 + 4)]).toEqual([255, 0, 255, 0]);
});
