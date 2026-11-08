import { describe, expect, it } from 'vitest';
import { winnerWords } from '../ui/victoryLayout';
import { fighterArt } from '../ui/fighterArt';
import { playableCharacters } from '../engine/data/characters';

describe('tela de vitória', () => {
  it('a lateral direita traz WINNER, o jogador vencedor no PvP e o nome em maiúsculas', () => {
    expect(winnerWords('Texas')).toEqual(['WINNER', 'TEXAS']);
    expect(winnerWords('Bob', 2)).toEqual(['WINNER', 'PLAYER 2', 'BOB']);
  });

  it('todo personagem, jogável ou não, tem arte de corpo inteiro e enquadramento próprio para a vitória', () => {
    const frames = Object.values(fighterArt);
    expect(Object.keys(fighterArt).sort()).toEqual(['cowboy', 'gimmick', 'grappler', 'puppet', 'rushdown', 'shoto', 'stance']);
    for (const art of frames) { expect(art.fullbody).toBeTruthy(); expect(art.victory.height).toBeGreaterThan(1); }
    expect(playableCharacters.every(character => fighterArt[character.id])).toBe(true);
    expect(new Set(frames.map(art => `${art.victory.height}/${art.victory.top}`)).size).toBe(frames.length);
  });
});
