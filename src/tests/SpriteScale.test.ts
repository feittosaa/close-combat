import { describe, expect, it } from 'vitest';
import { shoto } from '../engine/data/fighters/shoto';
import { texas } from '../engine/data/fighters/texas';
import type { CharacterDefinition } from '../engine/data/characters';
import {
  autoSpriteScale, bodyCenterShift, CROUCH_EXIT, LYING_LENGTH, lyingFloorAnchor, POSE_BAND, postureBody, sheetKind,
  type SheetMeasure, type SheetMeasurements, type SpriteCalibration,
} from '../rendering/animations/spriteScale';
import { texasSheetScale } from '../rendering/animations/texasSprites';
import { getShotoSpritePose } from '../rendering/animations/shotoSprites';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import shotoMeasurements from '../assets/sprites/characters/shoto/measurements.json';
import texasMeasurements from '../assets/sprites/characters/texas/measurements.json';
import shotoCalibration from '../assets/sprites/characters/shoto/calibration.json';
import texasCalibration from '../assets/sprites/characters/texas/calibration.json';

const fighters = [
  { definition: shoto, measurements: shotoMeasurements as SheetMeasurements, calibration: shotoCalibration as SpriteCalibration, reference: 'idle-normal' },
  { definition: texas, measurements: texasMeasurements as SheetMeasurements, calibration: texasCalibration as SpriteCalibration, reference: 'idle' },
] satisfies { definition: CharacterDefinition; measurements: SheetMeasurements; calibration: SpriteCalibration; reference: string }[];
const atlases = Object.keys(import.meta.glob('../assets/sprites/characters/*/*.atlas.json'));
const NOT_A_BODY = /^(effect-|magic-|crow$|tomato$|dynamite$|idle$)/;

/** Escalas do refinamento manual validado antes da análise automática: medem a precisão do modelo, não a calibração vigente. */
const manual: Record<string, Record<string, number | readonly number[]>> = {
  shoto: {
    'crouch-guard': 1.08, 'turn-air': 1.1, hurt: .97 * 1.02, 'hurt-high': .97 * 1.02, 'hurt-low': .97 * 1.02, 'air-hurt': 1.05 * .97,
    defeat: 1.1 * .8, fall: [1.3 * .92 * 1.1, 1.3 * .92 * 1.1, 1.3 * .92 * 1.1, 1.08 * 1.1, 1.08 * 1.1, 1.08 * 1.1],
  },
  // A arte nova da Texas ainda não tem refinamento manual: o modelo é medido contra a escala 1.
  texas: {},
};
const manualScale = (id: string, name: string, frame: number) => {
  const value = manual[id][name] ?? 1;
  return typeof value === 'number' ? value : value[frame];
};

describe.each(fighters)('escala automática das animações de $definition.name', ({ definition, measurements, calibration, reference }) => {
  const scaleOf = (name: string, frame = 0) => autoSpriteScale(definition, measurements, name, frame, calibration);

  it('mede todas as folhas existentes, sem sobras (rode npm run measure:sprites)', () => {
    const prefix = `../assets/sprites/characters/${definition.id}/`;
    const sheets = atlases.filter(path => path.startsWith(prefix)).map(path => path.slice(prefix.length).replace('.atlas.json', '')).sort();
    expect(Object.keys(measurements).sort()).toEqual(sheets);
  });

  it('analisa todo desenho do corpo: golpes, especiais, ultimates, vitória, aéreos e quedas', () => {
    const ignored = Object.keys(measurements).filter(name => !sheetKind(definition, measurements, name));
    expect(ignored.every(name => NOT_A_BODY.test(name)), ignored.join()).toBe(true);
    const unvalidated = Object.keys(measurements).filter(name => sheetKind(definition, measurements, name) && !calibration[name]);
    expect(unvalidated, 'folhas de corpo sem validação (rode npm run calibrate:sprites após aprovar)').toEqual([]);
  });

  it('reproduz exatamente a calibração validada em todas as folhas e quadros', () => {
    // Regenerated drawings use their recorded body dimensions to preserve the validated on-screen size.
    const differences = Object.entries(measurements).flatMap(([name, measure]) => (!sheetKind(definition, measurements, name) && name !== reference) ||
      (definition.id === 'texas' && name === 'fall-landing') ? [] :
      measure.bodies.flatMap((_, frame) => {
        const expected = calibration[name]?.scales[frame] ?? 1, actual = scaleOf(name, frame);
        return Math.abs(actual - expected) > 1e-9 ? [`${name} ${frame}: ${actual} ≠ ${expected}`] : [];
      }));
    expect(differences).toEqual([]);
  });

  it('traz uma folha regenerada em outro tamanho de volta ao tamanho validado', () => {
    for (const name of ['walk', 'guard', 'crouch-guard', 'hurt', definition.id === 'shoto' ? 'fall' : 'fall-landing']) {
      const regenerated: SheetMeasurements = { ...measurements, [name]: {
        ...measurements[name], bodies: measurements[name].bodies.map(body => body * 1.2), heights: measurements[name].heights.map(height => height * 1.2),
      } };
      measurements[name].bodies.forEach((_, frame) => {
        expect(autoSpriteScale(definition, regenerated, name, frame, calibration), `${name} ${frame}`).toBeCloseTo(scaleOf(name, frame) / 1.2, 6);
      });
    }
  });

  it('apoia no chão o desenho caído pela sua linha mais baixa e centraliza poses soltas', () => {
    const lying = Object.keys(measurements).find(name => sheetKind(definition, measurements, name) === 'lying')!;
    measurements[lying].bottoms.forEach((bottom, frame) => expect(lyingFloorAnchor(definition, measurements, lying, frame)).toBe(bottom || undefined));
    expect(lyingFloorAnchor(definition, measurements, 'walk', 0)).toBeUndefined();
    expect(bodyCenterShift(definition, measurements, lying, 0)).toBeCloseTo(.5 - measurements[lying].centers[0], 5);
    expect(bodyCenterShift(definition, measurements, 'walk', 0)).toBe(0);
  });

  it('compara agachados com os agachados e golpes que saem do agachamento com as poses em pé', () => {
    for (const name of ['crouch-guard', 'crouch-punch', 'crouch-hurt'].filter(name => measurements[name])) {
      expect(sheetKind(definition, measurements, name), name).toBe('crouching');
    }
    if (definition.id === 'shoto') expect(sheetKind(definition, measurements, 'crouch-uppercut')).toBe('standing');
  });
});

describe('uso das escalas no jogo', () => {
  it('a Texas e o Bob desenham cada folha com a escala validada', () => {
    expect(texasSheetScale('fall-landing', 5)).toBeCloseTo(.975, 3);
    const state = new Simulation(createGameConfig(1024, 576), [shoto, shoto], { training: true }).snapshot().characters[0];
    expect(getShotoSpritePose({ ...state, mode: 'blocking', crouching: true, stateStartedFrame: 0 }, 14)?.scale).toBeCloseTo(1.08, 9);
    expect(getShotoSpritePose({ ...state, mode: 'knockdown', grounded: false, stateStartedFrame: 0 }, 4)?.scale).toBe(1);
  });
});

describe('modelo por postura para folhas ainda não validadas', () => {
  // Mede o modelo contra o refinamento manual: é a precisão esperada para folhas novas ou de outros personagens.
  const uncalibrated = fighters.flatMap(({ definition, measurements }) => Object.keys(measurements)
    .filter(name => !['lying', undefined].includes(sheetKind(definition, measurements, name)))
    .map(name => Math.abs(Math.log(autoSpriteScale(definition, measurements, name) / manualScale(definition.id, name, 0)))));
  it('fica a 2,5% do refinamento manual em média e a até 8% no pior caso', () => {
    expect(Math.sqrt(uncalibrated.reduce((sum, error) => sum + error ** 2, 0) / uncalibrated.length)).toBeLessThanOrEqual(.025);
    expect(Math.max(...uncalibrated)).toBeLessThanOrEqual(.08);
  });

  const measure = (minHeight: number, maxHeight: number, body: number, length = maxHeight, bottom = .9, center = .5): SheetMeasure =>
    ({ minHeight, maxHeight, body, cleanBody: body, heights: [maxHeight], bodies: [body], cleanBodies: [body], lengths: [length], bottoms: [bottom], centers: [center] });
  const sheets = (extra: Record<string, SheetMeasure>): SheetMeasurements =>
    ({ idle: measure(.5, .6, .3), walk: measure(.5, .6, .3), guard: measure(.5, .6, .3), crouch: measure(.35, .6, .27), ...extra });
  it('mantém uma pose dentro da variação natural e corrige uma fora dela até a borda', () => {
    expect(autoSpriteScale(texas, sheets({ hurt: measure(.4, .5, .29) }), 'hurt')).toBe(1);
    expect(autoSpriteScale(texas, sheets({ hurt: measure(.4, .5, .2) }), 'hurt')).toBeCloseTo(.3 / .2 / (1 + POSE_BAND), 2);
    expect(autoSpriteScale(texas, sheets({ hurt: measure(.4, .7, .45) }), 'hurt')).toBeCloseTo(.3 / .45 / (1 - POSE_BAND), 2);
    expect(postureBody(texas, sheets({}), 'standing')).toBe(.3);
  });
  it('compara agachados com agachados e golpes que se levantam com as poses em pé', () => {
    const set = sheets({ 'crouch-punch': measure(.33, .34, .27), 'crouch-uppercut': measure(.36, .35 * CROUCH_EXIT + .05, .25) });
    expect(sheetKind(shoto, set, 'crouch-punch')).toBe('crouching');
    expect(autoSpriteScale(shoto, set, 'crouch-punch')).toBe(1);
    expect(sheetKind(shoto, set, 'crouch-uppercut')).toBe('standing');
  });
  it('amplia por quadro um corpo caído desenhado pequeno, limitado pelo comprimento aprendido', () => {
    expect(autoSpriteScale(texas, sheets({ fall: measure(.2, .2, .2, .4) }), 'fall')).toBeCloseTo(LYING_LENGTH * .6 / .4, 2);
    expect(autoSpriteScale(texas, sheets({ fall: measure(.5, .5, .2, .5) }), 'fall')).toBe(1.5);
  });
  it('ignora efeitos e folhas inexistentes', () => {
    const noisy = sheets({ 'effect-dust-light': measure(.1, .2, .1) });
    for (const name of ['effect-dust-light', 'inexistente']) expect(autoSpriteScale(texas, noisy, name)).toBe(1);
  });
});
