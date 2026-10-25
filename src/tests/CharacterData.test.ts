import { describe, it, expect } from 'vitest';
import { characters, playableCharacters, defaultCharacter, getCharacterById } from '../engine/data/characters';
import { fighterMoveList, filterMoveList } from '../training/MoveList';
import { arcadeOpponents, opponentFor } from '../scenes/matchSetup';

describe('elenco reiniciado', () => {
  it('registra somente Shoto, com quatro básicos e sem receitas ou assets antigos', () => {
    expect(characters.map(fighter => fighter.id)).toEqual(['shoto']);
    expect(playableCharacters).toEqual([defaultCharacter]);
    expect(defaultCharacter.name).toBe('Shoto');
    expect(defaultCharacter.moves.map(move => [move.name, move.input.buttons])).toEqual([
      ['Soco fraco', ['1']], ['Soco forte', ['2']], ['Chute fraco', ['3']], ['Chute forte', ['4']],
    ]);
    expect(defaultCharacter.combos).toEqual([]);
    expect(defaultCharacter).not.toHaveProperty('assets');
    expect(defaultCharacter).not.toHaveProperty('combatRules');
  });
  it.each(['ayla', 'gris', 'tester', 'dummy'])('não resolve o personagem removido %s', id => expect(getCharacterById(id)).toBeUndefined());
  it.each(['versus', 'training', 'tutorial', 'combo-tutorial', 'arcade'] as const)('usa Shoto espelhado em %s', mode => {
    expect(opponentFor('shoto', mode).id).toBe('shoto');
    expect(opponentFor('id-inválido', mode).id).toBe('shoto');
    expect(arcadeOpponents('shoto')).toEqual([defaultCharacter]);
  });
  it('oferece os quatro básicos no catálogo, com busca e sem combos antigos', () => {
    const entries = fighterMoveList(defaultCharacter);
    expect(entries).toHaveLength(4);
    expect(filterMoveList(entries, 'combos', '')).toEqual([]);
    expect(filterMoveList(entries, 'basics', 'forte').map(entry => entry.notation)).toEqual(['2', '4']);
  });
});
