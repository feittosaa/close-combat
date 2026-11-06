import { describe, expect, it } from 'vitest';
import { fitFontSize, winnerLine } from '../ui/victoryLayout';
import { fighterArt } from '../ui/fighterArt';
import { playableCharacters } from '../engine/data/characters';

describe('tela de vitória', () => {
  it('o texto da lateral direita encolhe com o tamanho do nome e nunca passa do máximo', () => {
    const strip = 700;
    const short = fitFontSize(winnerLine('Bob').length * .62, strip, 90);
    const long = fitFontSize(winnerLine('Grappler Jr').length * .62, strip, 90);
    expect(long).toBeLessThan(short);
    expect(fitFontSize(1, strip, 90)).toBe(90);
    expect(fitFontSize(winnerLine('Bob').length * .62, strip, 90) * winnerLine('Bob').length * .62).toBeLessThanOrEqual(strip + 1e-9);
  });

  it('o nome vem em maiúsculas depois de WINNER', () => {
    expect(winnerLine('Texas')).toBe('WINNER  TEXAS');
  });

  it('todo personagem, jogável ou não, tem arte de corpo inteiro e enquadramento próprio para a vitória', () => {
    const frames = Object.values(fighterArt);
    expect(Object.keys(fighterArt).sort()).toEqual(['cowboy', 'grappler', 'pirate', 'puppet', 'shoto', 'stance']);
    for (const art of frames) { expect(art.fullbody).toBeTruthy(); expect(art.victory.height).toBeGreaterThan(1); }
    expect(playableCharacters.every(character => fighterArt[character.id])).toBe(true);
    expect(new Set(frames.map(art => `${art.victory.height}/${art.victory.top}`)).size).toBe(frames.length);
  });
});
