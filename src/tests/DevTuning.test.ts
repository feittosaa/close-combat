import { describe, expect, it } from 'vitest';
import { characters } from '../engine/data/characters';
import { DevTuning, loadOverrides } from '../dev/devOverrides';
import { HUD } from '../ui/hudTheme';
import { autoSpriteScale, type SheetMeasurements } from '../rendering/animations/spriteScale';
import cowboyMeasurements from '../assets/sprites/characters/cowboy/measurements.json';
import cowboyCalibration from '../assets/sprites/characters/cowboy/calibration.json';

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
    tuning.resetFighter(fighter.id);
    expect(move).toEqual(authored);
  });

  it('adds manually authored recipes after the fighter\'s own and retimes existing ones', () => {
    const fighters = fresh(), fighter = fighters.find(entry => entry.combos?.length)!, authored = fighter.combos!;
    const tuning = new DevTuning(fighters);
    tuning.addCombo(fighter.id, { id: 'dev-test', name: 'Teste', notation: '1,2', moveIds: [fighter.moves[0].id, fighter.moves[1].id] });
    expect(fighter.combos!.map(recipe => recipe.id)).toEqual([...authored.map(recipe => recipe.id), 'dev-test']);
    tuning.setRecipe(fighter.id, authored[0].id, { recoveryFrames: 77 });
    expect(authored[0].recoveryFrames).toBe(77);
    tuning.resetFighter(fighter.id);
    expect(fighter.combos).toBe(authored);
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
    const fighters = fresh(), cowboy = fighters.find(fighter => fighter.id === 'cowboy')!, tuning = new DevTuning(fighters);
    const scale = (sheet: string) => autoSpriteScale(cowboy, cowboyMeasurements as SheetMeasurements, sheet, 0, cowboyCalibration);
    const before = scale('walk'), other = scale('jump');
    tuning.setSpriteScale('cowboy:walk', 1.1);
    expect(scale('walk')).toBeCloseTo(before * 1.1);
    expect(scale('jump')).toBe(other);
    tuning.setSpriteScale('cowboy:walk', undefined);
    expect(scale('walk')).toBe(before);
  });

  it('ignores unreadable stored tuning', () => {
    expect(loadOverrides({ getItem: () => '{broken' })).toEqual({ moves: {}, recipes: {}, combos: {}, colors: {}, spriteScales: {} });
  });
});
