import { describe, it, expect } from 'vitest';
import { characters, playableCharacters, defaultCharacter, getCharacterById } from '../engine/data/characters';
import { getStageById } from '../rendering/stages/stageCatalog';
import { fighterMoveList, filterMoveList } from '../training/MoveList';
import { createArcadeRun, opponentFor } from '../scenes/matchSetup';

describe('elenco reiniciado', () => {
  it('registra Texas e Shoto, preservando os quatro básicos e o catálogo manual', () => {
    expect(characters.map(fighter => fighter.id)).toEqual(['shoto', 'texas', 'grappler']);
    expect(playableCharacters).toEqual(characters);
    expect(defaultCharacter.name).toBe('Bob');
    expect(getCharacterById('texas')?.name).toBe('Texas');
    expect(defaultCharacter.moves.filter(move => move.category === 'basic' && !move.airborne).map(move => [move.name, move.input.buttons])).toEqual([
      ['Soco fraco', ['1']], ['Soco forte', ['2']], ['Chute fraco', ['3']], ['Chute forte', ['4']],
    ]);
    expect(defaultCharacter.combos).toHaveLength(6);
    expect(defaultCharacter).not.toHaveProperty('assets');
    expect(defaultCharacter).not.toHaveProperty('combatRules');
  });
  it.each(['ayla', 'gris', 'tester', 'dummy'])('não resolve o personagem removido %s', id => expect(getCharacterById(id)).toBeUndefined());
  it('espelha o personagem fora do Arcade e recorre ao Shoto para id inválido', () => {
    expect(opponentFor('texas').id).toBe('texas');
    expect(opponentFor('id-inválido').id).toBe('shoto');
  });
  it('sorteia no Arcade todos os personagens, um cenário por luta e sem repetir o anterior', () => {
    const run = createArcadeRun(() => 0.99);
    expect([...run.opponents].sort()).toEqual(characters.map(fighter => fighter.id).sort());
    expect(run.stages).toHaveLength(characters.length);
    run.stages.forEach((id, index) => { expect(getStageById(id)).toBeDefined(); if (index) expect(id).not.toBe(run.stages[index - 1]); });
    expect(createArcadeRun(() => 0).opponents).not.toEqual(createArcadeRun(() => 0.99).opponents);
  });
  it('separa básicos, especiais e receitas manuais com busca', () => {
    const entries = fighterMoveList(defaultCharacter);
    expect(entries).toHaveLength(defaultCharacter.moves.filter(move => !move.comboOnly).length + 6);
    expect(filterMoveList(entries, 'combos', '')).toHaveLength(6);
    expect(filterMoveList(entries, 'basics', 'forte').map(entry => entry.notation)).toEqual(['2', '4', 'no ar + 2', 'no ar + 4']);
  });
});
