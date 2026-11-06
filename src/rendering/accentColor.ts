/** Cor de destaque de um personagem: faixa de hue em graus (`from > to` cruza o vermelho), sobre a qual age a cor secundária. */
export interface Accent { label: string; from: number; to: number }

export const accents: Readonly<Record<string, Accent>> = {
  shoto: { label: 'verde/oliva da camisa', from: 27, to: 56 },
  cowboy: { label: 'vermelho/marrom', from: 300, to: 40 },
};

const wrap = (degrees: number): number => ((degrees % 360) + 360) % 360;

/** Parcela dos pixels coloridos (histograma de 36 faixas de 10 graus) dentro da faixa de destaque. */
export function accentShare(hues: readonly number[], { from, to }: Accent): number {
  const size = 360 / hues.length, span = wrap(to - from);
  return hues.reduce((total, share, bin) => wrap(bin * size + size / 2 - from) <= span ? total + share : total, 0);
}
