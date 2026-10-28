import { expect, it } from 'vitest';
import { applyShotoPalettePixels, shotoColor } from '../rendering/animations/shotoPalette';

it('preserva marfim e tinta originais, sem trocar dobras por pele', () => {
  for(const source of [[233,204,163],[231,220,190],[227,194,143],[0,0,0]]){
    const result=shotoColor(source[0],source[1],source[2],.12);
    expect(result).toEqual(source);
  }
  const hair=shotoColor(174,43,28,.06);
  expect(hair[0]).toBeLessThan(100);
  expect(hair[1]).toBeGreaterThan(43);
  const skin=shotoColor(182,109,64,.12);
  expect(skin[0]).toBeLessThan(182);
  expect(skin[1]).toBeLessThanOrEqual(109);
});

it('não cria saltos de cor em vizinhos nos antigos limites de material e de sombra', () => {
  const sources=[[181,145,95],[182,109,64],[121,57,49],[233,204,163],[119,42,39],[40,37,31],[120,98,72],[139,120,90],[183,160,120],[219,195,150],[189,110,68],[174,43,28]];
  for(const source of sources)for(const height of [.119,.179,.18,.239,.24,.429,.43,.6,.719,.72,.849,.85]){
    const baseline=shotoColor(source[0],source[1],source[2],height);
    for(let channel=0;channel<3;channel++){
      const neighbor=[...source];neighbor[channel]++;
      const result=shotoColor(neighbor[0],neighbor[1],neighbor[2],height);
      expect(Math.max(...result.map((v,i)=>Math.abs(v-baseline[i])))).toBeLessThanOrEqual(4);
    }
    const adjacent=shotoColor(source[0],source[1],source[2],height+1/631);
    expect(Math.max(...adjacent.map((v,i)=>Math.abs(v-baseline[i])))).toBeLessThanOrEqual(3);
  }
});

it('retém gradientes e detalhes, sem reduzir a jaqueta a degraus de uma paleta', () => {
  const colors=new Set<string>();
  for(let value=140;value<240;value++)colors.add(shotoColor(value,Math.round(value*.88),Math.round(value*.7),.35).join(','));
  expect(colors.size).toBeGreaterThan(80);
  for(const source of [[40,37,31],[65,62,50],[93,88,72]]){
    const result=shotoColor(source[0],source[1],source[2],.65);
    expect(Math.max(...result)).toBeLessThan(Math.max(...source));
  }
});

it('preserva alpha, transparência e mesma cor na mesma altura de corpos distintos', () => {
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
