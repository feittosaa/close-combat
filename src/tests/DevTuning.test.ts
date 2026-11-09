import { describe, expect, it } from 'vitest';
import { characters } from '../engine/data/characters';
import { DevTuning, loadOverrides } from '../dev/devOverrides';
import { HUD } from '../ui/hudTheme';
import { fighterArt, heroFrame, tileFrame } from '../ui/fighterArt';
import { autoSpriteScale, type SheetMeasurements } from '../rendering/animations/spriteScale';
import texasMeasurements from '../assets/sprites/characters/texas/measurements.json';
import texasCalibration from '../assets/sprites/characters/texas/calibration.json';

const fresh = () => structuredClone(characters);

describe('developer tuning', () => {
  it('retunes move timings over the authored data and restores them', () => {
    const fighters = fresh(), [fighter] = fighters, move = fighter.moves[0], authored = structuredClone(move);
    const tuning = new DevTuning(fighters);
    tuning.setMove(fighter.id, move.id, 'startup', authored.startup + 5);
    tuning.setMove(fighter.id, move.id, 'pushbackBlock', 99);
    expect(move.startup).toBe(authored.startup + 5);
    expect(move.pushback).toEqual({ hit: authored.pushback.hit, block: 99 });
    expect(tuning.original(move)).toEqual(authored);
    tuning.addCombo(fighter.id, { id: 'dev-kept', name: 'Mantido', notation: '1,2', moveIds: [fighter.moves[0].id, fighter.moves[1].id] });
    tuning.resetMoves(fighter.id);
    expect(move).toEqual(authored);
    expect(tuning.overrides.combos[fighter.id]?.map(recipe => recipe.id)).toEqual(['dev-kept']);
  });

  it('adds manually authored recipes after the fighter\'s own and retimes existing ones', () => {
    const fighters = fresh(), fighter = fighters.find(entry => entry.combos?.length)!, authored = fighter.combos!;
    const tuning = new DevTuning(fighters);
    tuning.addCombo(fighter.id, { id: 'dev-test', name: 'Teste', notation: '1,2', moveIds: [fighter.moves[0].id, fighter.moves[1].id] });
    expect(fighter.combos!.map(recipe => recipe.id)).toEqual([...authored.map(recipe => recipe.id), 'dev-test']);
    tuning.setRecipe(fighter.id, authored[0].id, { recoveryFrames: 77, name: 'Editado', moveIds: [fighter.moves[1].id, fighter.moves[0].id] });
    expect(authored[0]).toMatchObject({ recoveryFrames: 77, name: 'Editado', moveIds: [fighter.moves[1].id, fighter.moves[0].id] });
    tuning.replaceCombo(fighter.id, { id: 'dev-test', name: 'Outro', notation: '2,1', moveIds: [fighter.moves[1].id, fighter.moves[0].id] });
    expect(fighter.combos![fighter.combos!.length - 1].name).toBe('Outro');
    tuning.setMove(fighter.id, fighter.moves[0].id, 'damage', 99);
    tuning.resetCombos(fighter.id);
    expect(fighter.combos).toBe(authored);
    expect(tuning.overrides.moves[fighter.id]?.[fighter.moves[0].id]).toEqual({ damage: 99 });
    expect(authored[0].recoveryFrames).toBe(structuredClone(characters.find(entry => entry.id === fighter.id)!.combos![0]).recoveryFrames);
  });

  it('recolours HUD tokens in their own format and restores them', () => {
    const tuning = new DevTuning(fresh()), gold = HUD.gold, player = HUD.playerText[0];
    tuning.setColor('hud:gold', '#123456'); tuning.setColor('hud:playerText.0', '#abcdef');
    expect(HUD.gold).toBe(0x123456); expect(HUD.playerText[0]).toBe('#abcdef');
    expect(tuning.hudDefault('gold')).toBe(`#${gold.toString(16).padStart(6, '0')}`);
    tuning.assign({ colors: {} });
    expect(HUD.gold).toBe(gold); expect(HUD.playerText[0]).toBe(player);
  });

  it('resizes one animation on top of its automatic scale and restores it', () => {
    const fighters = fresh(), texas = fighters.find(fighter => fighter.id === 'texas')!, tuning = new DevTuning(fighters);
    const scale = (sheet: string) => autoSpriteScale(texas, texasMeasurements as SheetMeasurements, sheet, 0, texasCalibration);
    const before = scale('walk'), other = scale('jump');
    tuning.setSpriteScale('texas:walk', 1.1);
    expect(scale('walk')).toBeCloseTo(before * 1.1);
    expect(scale('jump')).toBe(other);
    tuning.setSpriteScale('texas:walk', undefined);
    expect(scale('walk')).toBe(before);
  });

  it('ignores unreadable stored tuning', () => {
    expect(loadOverrides({ getItem: () => '{broken' })).toEqual({ moves: {}, recipes: {}, combos: {}, colors: {}, spriteScales: {}, frameCuts: {}, frameSizes: {}, selection: {}, alternatives: {} });
  });

  it('reframes the selection art over the authored values and restores them', () => {
    const tuning = new DevTuning(fresh()), art = fighterArt.texas, authored = structuredClone({ hero: heroFrame(art), tile: tileFrame(art), icon: art.iconWindow });
    tuning.setSelection('texas', 'hero', { zoom: 1.5, x: 10, y: 30 });
    tuning.setSelection('texas', 'iconWindow', { x: 3, y: 4, size: 900 });
    expect(heroFrame(art)).toEqual({ zoom: 1.5, x: 10, y: 30 });
    expect(art.iconWindow).toEqual({ x: 3, y: 4, size: 900 });
    expect(tileFrame(art)).toEqual(authored.tile);
    expect(tuning.authoredSelection('texas')).toMatchObject({ hero: authored.hero, iconWindow: authored.icon });
    tuning.setSelection('texas', 'hero', undefined);
    tuning.setSelection('texas', 'iconWindow', undefined);
    expect(tuning.overrides.selection).toEqual({});
    expect({ hero: heroFrame(art), tile: tileFrame(art), icon: art.iconWindow }).toEqual(authored);
  });

  it('drops edits of recipes that no longer exist, keeping created combos and edits of authored ones', () => {
    const fighters = fresh(), fighter = fighters.find(entry => entry.combos?.length)!, authored = fighter.combos![0];
    const created = { id: 'dev-new', name: 'Dança', notation: '3,1', moveIds: [fighter.moves[0].id, fighter.moves[1].id] };
    const tuning = new DevTuning(fighters, { ...loadOverrides({ getItem: () => null }),
      recipes: { [fighter.id]: { 'dev-gone': { name: 'Dança comigo' }, [authored.id]: { recoveryFrames: 33 } } },
      combos: { [fighter.id]: [created] } });
    expect(tuning.overrides.recipes[fighter.id]).toEqual({ [authored.id]: { recoveryFrames: 33 } });
    expect(tuning.overrides.combos[fighter.id]).toEqual([created]);
  });
});

it('ajustes salvos com os ids antigos dos personagens passam para os ids novos', () => {
  const saved = { moves: { cowboy: { 'light-punch': { damage: 30 } } }, spriteScales: { 'cowboy:idle': 1.1, 'shoto:idle': .9 }, selection: { puppet: { hero: { zoom: 2 } } } };
  const loaded = loadOverrides({ getItem: () => JSON.stringify(saved) });
  expect(loaded.moves).toEqual({ texas: { 'light-punch': { damage: 30 } } });
  expect(loaded.spriteScales).toEqual({ 'texas:idle': 1.1, 'shoto:idle': .9 });
  expect(Object.keys(loaded.selection)).toEqual(['mrapple']);
});
