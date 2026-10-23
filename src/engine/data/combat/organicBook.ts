import type { AttackButton } from '../../../input/types';
import type { MoveDefinition } from '../moves';
import type { ComboRecipe, MoveCombatData } from './CombatBook';

export type StringRole = 'link' | 'launcher' | 'damage' | 'extender' | 'stance' | 'carry';
export interface StringSpec {
  command: string; name: string; role: StringRole;
  tuning?: Partial<Pick<MoveDefinition, 'startup' | 'activeFrames' | 'recovery' | 'damage' | 'hitstun' | 'blockstun' | 'advance' | 'pushback' | 'hitbox'>>;
}
export interface OrganicProfile {
  id: string;
  seeds: readonly MoveDefinition[];
  strings: readonly StringSpec[];
  specials: readonly { id: string; command: string; name: string; role: StringRole }[];
  heavyNames: readonly [string, string, string, string, string, string];
  throwNames: readonly [string, string];
  ultimateName: string;
  animationAliases?: Readonly<Record<string, string>>;
  limb?: MoveCombatData['limb'];
}
export const buttonsFor = (token: string): AttackButton[] => token.split('+') as AttackButton[];
export const stringId = (command: string): string => `string-${command.replace(/,/g, '-').replace(/\+/g, '')}`;
const tokens = ['1', '2', '3', '4', '1+2', '3+4'];
const suffixes = ['lp', 'rp', 'lk', 'rk', 'pp', 'kk'];

/** Shared construction only. Geometry, timings, strings and specials come from each fighter. */
export function createOrganicBook(profile: OrganicProfile): { moves: MoveDefinition[]; combos: ComboRecipe[] } {
  const moves: MoveDefinition[] = [];
  const seedFor = (id: string): MoveDefinition => {
    const seed = profile.seeds.find(move => move.id === id);
    if (!seed) throw new Error(`Base ausente no livro ${profile.id}: ${id}`);
    return seed;
  };
  for (const posture of ['standing', 'crouching', 'air'] as const) {
    tokens.forEach((token, i) => {
      const source = seedFor(`${posture}-${suffixes[i === 4 ? 1 : Math.min(i, 3)]}`);
      const heavy = i >= 4;
      const startup = heavy ? source.startup + 3 : source.startup;
      const damage = heavy ? Math.round(source.damage * 1.2) : source.damage;
      const box = heavy ? { ...source.hitbox, yOffset: posture === 'crouching' ? -90 : -128, height: 85 } : source.hitbox;
      const move: MoveDefinition = { ...source, legacy: false, balanceReference: undefined, cancelOnHit: undefined,
        id: `${posture}-${suffixes[i]}`, input: { buttons: buttonsFor(token) }, startup, damage, hitbox: box, hitstun: 24,
        // Heavy punches hit the suspended body and finish a route; no direction variant.
        combat: { name: heavy ? profile.heavyNames[(posture === 'standing' ? 0 : posture === 'crouching' ? 2 : 4) + i - 4] :
          `${posture === 'standing' ? 'Em pé' : posture === 'crouching' ? 'Agachada' : 'No ar'} · ${['Soco leve', 'Soco forte', 'Chute leve', 'Chute forte'][i]}`,
          categories: posture === 'crouching' ? ['basics', 'crouching'] : ['basics'],
          command: { notation: `${posture === 'standing' ? '' : posture === 'crouching' ? 'AG ' : 'AR '}${token}`, buttons: buttonsFor(token), posture, horizontalNeutral: true },
          strikes: [{ from: startup, to: startup + source.activeFrames - 1, damage, hitbox: box,
            hitLevel: heavy && i === 4 ? 'mid' : source.hitLevel, hitstun: 24, blockstun: source.blockstun,
            ender: heavy, wallSplat: heavy }], hurtboxes: [], limb: profile.limb ?? (i < 2 || i === 4 ? 'punch' : 'kick'),
          adaptation: 'Golpe autoral. Frente/trás não alteram identidade. Tempos e caixas provisórios por personagem.',
          animation: { clip: profile.animationAliases?.[source.id] ?? source.id, status: 'provisional' } },
      };
      moves.push(move);
    });
  }
  for (const spec of profile.strings) {
    const parts = spec.command.split(',');
    const parentCommand = parts.slice(0, -1).join(',');
    const parent = parts.length === 2 ? moves[tokens.indexOf(parts[0])] : moves.find(move => move.id === stringId(parentCommand));
    if (!parent) throw new Error(`Prefixo ausente: ${spec.command}`);
    const token = parts[parts.length - 1];
    const source = moves[tokens.indexOf(token)];
    const startup = spec.tuning?.startup ?? (spec.role === 'launcher' ? 12 : spec.role === 'damage' ? 11 : 8);
    const activeFrames = spec.tuning?.activeFrames ?? 3;
    const damage = spec.tuning?.damage ?? (spec.role === 'damage' ? 80 : spec.role === 'launcher' ? 42 : 30);
    const box = spec.tuning?.hitbox ?? { ...source.hitbox, forward: 10, width: source.hitbox.width + 26, yOffset: -134, height: 112 };
    moves.push({ ...source, id: stringId(spec.command), startup, activeFrames, recovery: spec.tuning?.recovery ?? source.recovery, damage, hitbox: box,
      hitLevel: token === '3+4' ? 'low' : 'mid', hitstun: spec.tuning?.hitstun ?? 26,
      blockstun: spec.tuning?.blockstun ?? (spec.role === 'launcher' ? 8 : 12),
      advance: spec.tuning?.advance ?? (spec.role === 'carry' ? 22 : 5), pushback: spec.tuning?.pushback ?? { hit: spec.role === 'carry' ? 19 : 2, block: 7 },
      combat: { ...source.combat!, name: spec.name, categories: ['strings', ...(spec.role === 'launcher' ? ['starters' as const] : []), ...(spec.role === 'carry' ? ['wall' as const] : []), ...(spec.role === 'stance' ? ['stances' as const] : [])],
        role: spec.role,
        command: { notation: spec.command, buttons: buttonsFor(token), parentId: parent.id, posture: 'standing', horizontalNeutral: true,
          followupWindow: { from: parent.startup + parent.activeFrames, to: parent.startup + parent.activeFrames + 24 } },
        strikes: [{ from: startup, to: startup + activeFrames - 1, damage, hitbox: box, hitLevel: token === '3+4' ? 'low' : 'mid',
          hitstun: spec.tuning?.hitstun ?? 26, blockstun: spec.tuning?.blockstun ?? (spec.role === 'launcher' ? 8 : 12),
          reaction: spec.role === 'launcher' ? 'launch' : undefined,
          screw: spec.role === 'extender', ender: spec.role === 'damage', wallSplat: spec.role === 'carry' }],
        highCrush: spec.role === 'stance' ? { from: 4, to: startup + activeFrames - 1 } : undefined,
        action: spec.role === 'stance' ? { stance: 'sway', duration: 30, move: -14 } : undefined,
        adaptation: `String autoral: ${spec.role}. Cada contato exige uma nova entrada; sem sequência automática.` },
    });
  }
  for (const spec of profile.specials) {
    const seed = seedFor(spec.id);
    const box = seed.hitbox;
    moves.push({ ...seed, legacy: false, balanceReference: undefined, launchVelocity: undefined,
      input: { buttons: buttonsFor(spec.command) }, combat: {
        name: spec.name, categories: ['specials', ...(spec.role === 'launcher' ? ['starters' as const] : [])], role: spec.role,
        command: { notation: spec.command, buttons: buttonsFor(spec.command), posture: 'standing', horizontalNeutral: true },
        strikes: [{ from: seed.startup, to: seed.startup + seed.activeFrames - 1, damage: seed.damage,
          hitLevel: seed.hitLevel, hitbox: box, hitstun: seed.hitstun, blockstun: seed.blockstun,
          reaction: spec.role === 'launcher' ? 'launch' : undefined, ender: spec.role === 'damage' }],
        hurtboxes: [], limb: profile.limb ?? 'body',
        animation: { clip: seed.id, status: 'provisional' }, adaptation: 'Especial autoral com acorde direto; sem quarto de lua, direção ou just frame.' },
    });
  }
  const seedThrow = profile.seeds.find(move => move.throw)!;
  ['1+3', '2+4'].forEach((token, index) => moves.push({ ...seedThrow, id: index ? 'reverse-throw' : 'forward-throw', legacy: false,
    balanceReference: undefined, input: { buttons: buttonsFor(token) }, damage: index ? seedThrow.damage - 12 : seedThrow.damage,
    throw: { ...seedThrow.throw!, breakButtons: [index ? '2' : '1'], breakAlternatives: undefined, breakFrames: 14 },
    combat: { name: profile.throwNames[index], categories: ['throws'],
      command: { notation: token, buttons: buttonsFor(token), posture: 'standing', horizontalNeutral: true },
      strikes: [{ from: seedThrow.startup, to: seedThrow.startup, damage: index ? seedThrow.damage - 12 : seedThrow.damage, hitLevel: 'throw',
        hitbox: seedThrow.hitbox, hitstun: seedThrow.hitstun, blockstun: 0 }], hurtboxes: [], limb: 'body',
      action: { sideSwitch: index === 1 }, animation: { clip: 'forward-throw', status: 'provisional' }, adaptation: 'Agarre frontal; quebra 1 ou 2; segundo agarrão troca os lados.' },
  }));
  const heavy = moves[4];
  moves.push({ ...heavy, id: 'ultimate', kind: 'special', startup: 24, activeFrames: 4, recovery: 36, damage: 180, blockstun: 12,
    input: { buttons: ['1', '2', '3', '4'] }, combat: { ...heavy.combat!, name: profile.ultimateName, categories: ['ultimate'],
      command: { notation: '1+2+3+4', buttons: ['1', '2', '3', '4'], posture: 'standing', horizontalNeutral: true, requiresRage: true },
      strikes: [{ ...heavy.combat!.strikes[0], from: 24, to: 27, damage: 180, ender: true, blockstun: 12 }],
      adaptation: 'Uma tentativa por round com vida até 25%; sem QTE. Bloqueável e sujeito à escala de combo.' },
  });
  const chain = (id: string): string[] => {
    const move = moves.find(other => other.id === id)!;
    return [...(move.combat?.command.parentId ? chain(move.combat.command.parentId) : []), id];
  };
  const launcher = moves.find(move => move.combat?.command.notation === '1,1,2')!;
  const combos: ComboRecipe[] = [
    { id: 'organic-1', name: 'Combo 1 · levantar e finalizar', category: 'beginner', notation: '1,1,2 → 1+2', moveIds: [...chain(launcher.id), 'standing-pp'] },
    { id: 'organic-2', name: 'Combo 2 · prolongar a sequência', category: 'beginner', notation: '1,1,2 → 1,1,1+2', moveIds: [...chain(launcher.id), ...chain(stringId('1,1,1+2'))] },
  ];
  return { moves, combos };
}
