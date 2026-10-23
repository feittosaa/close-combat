import { createOrganicBook } from '../combat/organicBook';
import { grisStrings } from '../combat/grisStrings';
import type { CombatRules } from '../combat/CombatBook';
import type { CharacterDefinition } from '../characters';
import type { MoveDefinition } from '../moves';
import type { AttackButton } from '../../../input/types';

const noctisRef = (command: string, startup: string, damage: string, block: string, hit: string,
  counterHit: string, adaptation: string): NonNullable<MoveDefinition['balanceReference']> => ({
  game: 'Tekken 7', character: 'Noctis',
  url: 'https://github.com/theneosloth/tekken-api/blob/main/data/json/noctis.json',
  command, startup, damage, block, hit, counterHit, adaptation,
});

const strike = (id: string, button: AttackButton, startup: number, recovery: number, damage: number,
  hitbox: MoveDefinition['hitbox'], options: Partial<MoveDefinition> = {}): MoveDefinition => ({
    id, kind: 'normal', input: { buttons: [button] }, startup, activeFrames: 4, recovery,
    damage, hitstun: 19, blockstun: 12, pushback: { hit: 11, block: 7 }, hitLevel: 'mid', hitbox, ...options,
  });

/** Livro da Gris orientado pelas famílias de espada de Noctis; comandos, frames e dano são adaptação local para uma tesoura. */
export const grisLegacyMoves: readonly MoveDefinition[] = [
  strike('standing-lp', '1', 10, 14, 35, { forward: 18, yOffset: -119, width: 57, height: 28 }, {
    hitLevel: 'high', parryable: true, cancelOnHit: { moveIds: ['standing-rp'], windowFrames: 8 },
    balanceReference: noctisRef('1', '10', '7', '+1', '+8', '+8', 'Tesourada curta de punição; dano escalado à vida local.'),
  }),
  strike('standing-rp', '2', 14, 23, 68, { forward: 27, yOffset: -123, width: 108, height: 48 }, {
    balanceReference: noctisRef('1, 2 (2º hit)', '10 (string)', '7, 8 (string)', '-2 (string)', '+6 (string)', '+6 (string)', 'Follow-up confirmável após standing-lp; frames e dano locais adaptados.'),
  }),
  strike('standing-lk', '3', 13, 19, 48, { forward: 18, yOffset: -117, width: 108, height: 31 }, {
    balanceReference: noctisRef('3', '14', '15', '-7', '-1', '-1', 'Chute de referência convertido em corte lateral curto com tesoura.'),
  }),
  strike('standing-rk', '4', 11, 25, 76, { forward: 25, yOffset: -132, width: 100, height: 48 }, {
    balanceReference: noctisRef('4', '12', '15', '-8', '+3', '+3', 'Golpe de alcance maior; dano e recuperação reescalados para o ritmo local.'),
  }),
  strike('crouching-lp', '1', 10, 14, 32, { forward: 17, yOffset: -80, width: 54, height: 26 }, {
    input: { direction: 'D', buttons: ['1'] }, crouching: true,
    balanceReference: noctisRef('FC+1', '10 cs', '5', '-5', '+6', '+6', 'Resposta baixa rápida convertida para o toque curto da tesoura.'),
  }),
  strike('crouching-rp', '2', 11, 23, 64, { forward: 24, yOffset: -75, width: 109, height: 41 }, {
    input: { direction: 'D', buttons: ['2'] }, crouching: true,
    balanceReference: noctisRef('FC+2', '11 cs', '8', '-9', '+5', '+5', 'Médio agachado com alcance local maior e dano reescalado.'),
  }),
  strike('crouching-lk', '3', 15, 19, 42, { forward: 16, yOffset: -57, width: 88, height: 28 }, {
    input: { direction: 'D', buttons: ['3'] }, crouching: true, hitLevel: 'low',
    balanceReference: noctisRef('FC+3', '16', '12 cs', '-17', '-3', '-3', 'Corte baixo arriscado, mantém risco de punição da referência.'),
  }),
  strike('crouching-rk', '4', 11, 27, 68, { forward: 20, yOffset: -57, width: 91, height: 28 }, {
    input: { direction: 'D', buttons: ['4'] }, crouching: true, hitLevel: 'low',
    balanceReference: noctisRef('FC+4', '12 cs', '10', '-15', '-4', '-4', 'Corte baixo de alcance curto; dano e caixa adaptados à arma.'),
  }),
  strike('air-lp', '1', 9, 15, 35, { forward: 17, yOffset: -114, width: 65, height: 30 }, {
    airborne: true, balanceReference: noctisRef('During jump 1', '9', '7', '-23', '-16', '-16', 'Contato aéreo curto, convertido ao salto 2D existente.'),
  }),
  strike('air-rp', '2', 10, 23, 65, { forward: 25, yOffset: -115, width: 101, height: 90 }, {
    airborne: true, balanceReference: noctisRef('During jump 2', '10', '14', '-22', '-15', '-15', 'Golpe aéreo de tesoura com hitbox vertical local.'),
  }),
  strike('air-lk', '3', 10, 18, 42, { forward: 17, yOffset: -115, width: 100, height: 36 }, {
    airborne: true, balanceReference: noctisRef('(During jump) 3', '10', '10', '-22', '-15', '-15', 'Corte aéreo de alcance horizontal adaptado.'),
  }),
  strike('air-rk', '4', 12, 24, 65, { forward: 22, yOffset: -115, width: 94, height: 36 }, {
    airborne: true, balanceReference: noctisRef('(During jump) 4', '12', '12', '-21', '-14', '-14', 'Corte aéreo mais pesado; recuperação local reescalada.'),
  }),
  {
    id: 'golden-arc', kind: 'special', input: { sequence: ['D', 'DF', 'F'], buttons: ['1'] },
    startup: 15, activeFrames: 3, recovery: 28, damage: 72, hitstun: 24, blockstun: 16,
    hitLevel: 'mid', pushback: { hit: 12.5, block: 10 },
    balanceReference: noctisRef('f, f+1+2', '15', '20', '-9', '+10', 'KND', 'Espada arremessada/alcance convertidos em projétil de energia gerado pela tesoura; propriedades são locais.'),
    hitbox: { forward: 22, yOffset: -110, width: 108, height: 48 },
    projectile: {
      forward: 58, yOffset: -68, speed: 7.4, lifetimeFrames: 100,
      hitbox: { forward: 0, yOffset: -23, width: 66, height: 46 }, animationId: 'fx-golden-arc', maxActive: 1
    },
  },
  {
    id: 'rising-shear', kind: 'special', input: { sequence: ['D', 'DB', 'B'], buttons: ['3'] },
    startup: 18, activeFrames: 6, recovery: 34, damage: 88, hitstun: 26, blockstun: 14,
    hitLevel: 'mid', pushback: { hit: 13, block: 9 }, launchVelocity: -10,
    balanceReference: noctisRef('u/f+4 (família de launcher)', '19 js9~', '20', '-3', 'KND', 'KND', 'Launcher de espada reinterpretado como rising shear; invulnerabilidade, trajetória e dano foram recalibrados localmente.'),
    strikeInvulnerableStartupFrames: 2,
    hitbox: { forward: 8, yOffset: -266, width: 72, height: 180 },
  },
  {
    id: 'silk-step', kind: 'special', input: { sequence: ['D', 'DF', 'F'], buttons: ['2'] },
    startup: 19, activeFrames: 3, recovery: 31, damage: 82, hitstun: 24, blockstun: 14,
    hitLevel: 'mid', pushback: { hit: 15, block: 11 }, travelSpeed: 4.4,
    balanceReference: noctisRef('f+2', '20 js', '8 (,25 follow-up)', '-9', 'throw follow-up', 'throw follow-up', 'Arremesso/teleporte de espada convertido em avanço e corte 2D; dano do follow-up não é copiado.'),
    hurtboxStances: { startup: 'standing', active: 'crouching', recovery: 'standing' },
    hitbox: { forward: 22, yOffset: -105, width: 118, height: 58 },
  },
  {
    id: 'royal-cleave', kind: 'special', input: { sequence: ['D', 'DB', 'B'], buttons: ['4'] },
    startup: 15, activeFrames: 3, recovery: 36, damage: 98, hitstun: 29, blockstun: 17,
    hitLevel: 'mid', pushback: { hit: 16.5, block: 12 },
    balanceReference: noctisRef('d/f+2', '15', '20', '-20', 'JG', 'JG', 'Launcher médio convertido em corte pesado; o resultado local fica em knockdown/launch conforme dados da Gris.'),
    hitbox: { forward: 18, yOffset: -132, width: 130, height: 80 },
  },
  {
    id: 'forward-throw', kind: 'throw', input: { buttons: ['1', '3'] }, startup: 7,
    activeFrames: 1, recovery: 26, damage: 108, hitstun: 25, blockstun: 0,
    balanceReference: noctisRef('f+2 → follow-up de teleporte/agarre', '20 js', '8 + 25 no follow-up', '-9', 'throw follow-up', 'throw follow-up', 'Agarre local mantém comando e quebra próprios; referência informa uma conversão de espada em arremesso, não o mesmo throw.'),
    hitLevel: 'throw', pushback: { hit: 0, block: 0 },
    hitbox: { forward: 17, yOffset: -129, width: 53, height: 105 },
    throw: {
      range: 64, breakButtons: ['2', '4'], breakFrames: 6, breakRecovery: 12,
      launchDistance: { forward: 118, backward: 132 }
    },
  },
];

export const grisCombatRules: CombatRules = {
  maxLaunches: 2, aerialLaunchVelocity: -3.8, forcedFallSpeed: 8,
  launchVelocity: -6.6, launchGravity: .24, juggleHitVelocity: -2.7, screwVelocity: -4.3,
  commandBufferFrames: 8, lowParryFrames: 0, lowParryStunFrames: 18, stanceFrames: 30,
  comboScaling: [1, .7, .6, .5, .4, .3, .25, .2], juggleGravity: .012, juggleBaseGravity: .2,
  knockdownFrames: 26, wallStunFrames: 24, powerFrames: 0,
};
export const grisOrganicBook = createOrganicBook({
  limb: 'weapon',
  id: 'gris', seeds: grisLegacyMoves, strings: grisStrings,
  heavyNames: ['Fecho real', 'Arco cruzado', 'Fecho baixo', 'Renda rasteira', 'Corte suspenso', 'Cruz aérea'],
  throwNames: ['Laço dourado', 'Reverso real'], ultimateName: 'Corte soberano',
  specials: [
    { id: 'golden-arc', command: '1+4', name: 'Arco dourado', role: 'carry' },
    { id: 'silk-step', command: '2+3', name: 'Passo de seda', role: 'carry' },
    { id: 'rising-shear', command: '1+2+3', name: 'Tesoura ascendente', role: 'launcher' },
    { id: 'royal-cleave', command: '2+3+4', name: 'Talho real', role: 'damage' },
  ],
});
export const grisMoves = grisOrganicBook.moves;

export const gris: CharacterDefinition = {
  id: 'gris', name: 'Gris', maxHealth: 1000,
  movement: { walkSpeed: 1.85, backwardWalkSpeed: 1.4, dashSpeed: 4.3, backdashSpeed: 3.5, runSpeed: 5.4, jumpVelocity: -12.2 },
  moves: grisMoves,
  combos: grisOrganicBook.combos,
  combatRules: grisCombatRules,
  collision: {
    bodyWidth: 44, hurtboxes: {
      standing: { offsetX: 0, offsetY: -152, width: 44, height: 152 },
      crouching: { offsetX: 0, offsetY: -91, width: 46, height: 91 },
      airborne: { offsetX: 0, offsetY: -139, width: 43, height: 139 },
      juggled: { offsetX: 0, offsetY: -40, width: 88, height: 90 },
    }
  },
  assets: { animationManifest: 'animations/gris.json' },
};
