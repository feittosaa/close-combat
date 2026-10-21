import { describe, expect, it } from 'vitest';
import { ayla, aylaLegacyMoves } from '../engine/data/fighters/ayla';
import { gris } from '../engine/data/fighters/gris';
import { defaultCharacter } from '../engine/data/characters';
import { aylaReferenceMoves, aylaMove, aylaCombos } from '../engine/data/combat/aylaCombatBook';
import reference from '../engine/data/reference/kazuya.json';
import { CombatCommandParser } from '../engine/combat/CombatCommandParser';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { currentStrike } from '../engine/combat/strikeTimeline';
import { createHurtbox } from '../engine/collision/combatGeometry';
import { fighterMoveList, filterMoveList } from '../training/MoveList';
import type { AttackButton, Direction, FrameInput } from '../input/types';
import type { CharacterState } from '../engine/characters/CharacterState';
import { applyStrikeReaction } from '../engine/combat/CombatRuntime';

const input = (direction: Direction = 'N', buttons: readonly AttackButton[] = []): FrameInput => ({ direction, buttons: new Set(buttons) });
const N = input();
const tick = (sim: Simulation, p1 = N, p2 = N, frames = 1): void => { for (let i = 0; i < frames; i++) sim.stepFrame([p1, p2]); };
const setup = (distance = 70): Simulation => new Simulation(createGameConfig(1024, 576), [ayla, ayla], { training: true, initialDistance: distance });
function command(sim: Simulation, directions: readonly Direction[], button: AttackButton, precise = false): void {
  directions.forEach((direction, i) => tick(sim, input(direction, precise && i === directions.length - 1 ? [button] : [])));
  if (!precise) tick(sim, input(directions[directions.length - 1], [button]));
}

describe('catálogo executável de Ayla', () => {
  it('cobre cada entrada pública sem duplicar IDs nem impor o livro à Gris', () => {
    expect(aylaReferenceMoves).toHaveLength(reference.rows.length);
    expect(new Set(aylaReferenceMoves.map(move => move.combat!.reference!.command))).toEqual(new Set(reference.rows.map(row => row.Command)));
    expect(new Set(ayla.moves.map(move => move.id)).size).toBe(ayla.moves.length);
    expect(gris.moves.some(move => move.combat)).toBe(false);
    expect(ayla.moves.some(move => move.id === 'ayla-sway-2d')).toBe(true);
    expect(ayla.moves.some(move => move.id === 'ayla-turn-2d')).toBe(true);
    expect(ayla.moves.some(move => move.combat?.command.notation === 'db+1,2~F')).toBe(true);
  });

  it.each(aylaReferenceMoves.map(move => [move.combat!.reference!.command, move] as const))('reconhece %s com seus requisitos e entrada reais', (_name, move) => {
    const sim = setup(); const [state, target] = sim.snapshot().characters as CharacterState[];
    const parser = new CombatCommandParser(); const cmd = move.combat!.command;
    state.powerFrames = cmd.requiresPower ? 600 : 0; state.health = 1; state.rageUsed = false;
    state.crouchFrames = cmd.stance === 'crouching' ? 8 : 0;
    state.risingFrames = cmd.stance === 'rising' ? 8 : 0;
    state.stance = cmd.stance;
    if (cmd.targetGrounded) target.mode = 'knockdown';
    if (cmd.parentId) {
      state.attack = { moveId: cmd.parentId, buttons: [], elapsedFrames: cmd.followupWindow!.from, hasHit: true, hitOutcome: 'hit', preciseExecution: false };
      state.mode = 'active';
    }
    let frame = 0; let found: import('../engine/data/moves').MoveDefinition | undefined;
    const dirs = cmd.directions ?? [];
    dirs.forEach((direction, index) => {
      if (index && direction === dirs[index - 1]) parser.update(N, frame++, state, target, ayla.moves, true);
      const last = index === dirs.length - 1;
      found = parser.update(input(direction, last && cmd.preciseFrames !== undefined ? cmd.buttons : []), frame++, state, target, ayla.moves, true) ?? found;
    });
    if (!dirs.length || cmd.preciseFrames === undefined) {
      found = parser.update(input(dirs[dirs.length - 1] ?? (cmd.stance === 'crouching' ? 'D' : 'N'), cmd.buttons), frame++, state, target, ayla.moves, true) ?? found;
    }
    if (cmd.holdFrames) {
      for (let i = 0; i < cmd.holdFrames; i++) found = parser.update(input(dirs[dirs.length - 1] ?? 'N', cmd.buttons), frame++, state, target, ayla.moves, true) ?? found;
    } else if (!found) found = parser.update(N, frame++, state, target, ayla.moves, true);
    expect(found?.id).toBe(move.id);
  });

  it('não aceita posturas, recurso ou continuação fora do contexto', () => {
    const [state, target] = setup().snapshot().characters as CharacterState[];
    for (const text of ['ws2', 'SS.3', 'DVK.1+4', 'R.df+1+2', '1,1,2']) {
      const move = aylaMove(text); const parser = new CombatCommandParser(); const cmd = move.combat!.command;
      expect(parser.update(input(cmd.directions?.[cmd.directions.length - 1] ?? 'N', cmd.buttons), 0, state, target, [move], false)).toBeUndefined();
    }
  });

  it('tem caixas autoradas e intervalos positivos em cada contato; poses faltantes são explícitas', () => {
    for (const move of aylaReferenceMoves) {
      expect(move.combat!.animation.status).toBe('provisional');
      for (const strike of move.combat!.strikes) {
        expect(strike.from).toBeGreaterThanOrEqual(0); expect(strike.to).toBeGreaterThanOrEqual(strike.from);
        expect(strike.hitbox.width * strike.hitbox.height).toBeGreaterThan(0);
        expect(strike.damage).toBeGreaterThan(0);
      }
    }
  });

  it('todas as rotas publicadas modeladas referenciam movimentos executáveis e o livro local', () => {
    expect(aylaCombos.length).toBeGreaterThanOrEqual(30);
    for (const combo of aylaCombos) {
      expect(combo.moveIds.length).toBeGreaterThan(0);
      for (const id of combo.moveIds) expect(ayla.moves.some(move => move.id === id && !move.legacy)).toBe(true);
    }
  });
});

describe('combate com entradas comuns', () => {
  it('o jab toca no décimo frame da ação e não antes; B é guarda e não parry universal', () => {
    const sim = setup(); tick(sim, input('N', ['1']), input('B'));
    tick(sim, N, input('B'), 8); expect(sim.snapshot().recentContacts).toHaveLength(0);
    tick(sim, N, input('B'));
    expect(sim.snapshot().hitEvents[0]).toMatchObject({ moveId: aylaMove('1').id, outcome: 'block', frameAdvantage: 1 });
  });

  it.each([70, 96])('1,1,2 exige entradas e mantém alcance a %i unidades', (distance) => {
    const sim = setup(distance); tick(sim, input('N', ['1'])); tick(sim, N, N, 10);
    expect(sim.snapshot().recentContacts).toHaveLength(1);
    tick(sim, input('N', ['1'])); tick(sim, N, N, 16);
    expect(sim.snapshot().characters[0].followup?.moveId).toBe(aylaMove('1,1').id);
    expect(sim.snapshot().characters[0].mode).not.toBe('recovery');
    tick(sim, input('N', ['2'])); tick(sim, N, N, 15);
    expect(sim.snapshot().recentContacts.map(contact => contact.event.moveId)).toEqual([aylaMove('1').id, aylaMove('1,1').id, aylaMove('1,1,2').id]);
    expect(sim.snapshot().characters[1].grounded).toBe(false);
  });

  it('distingue o elétrico do ascendente normal pelo frame final do comando', () => {
    const normal = setup(150); command(normal, ['F', 'N', 'D', 'DF'], '2');
    expect(normal.snapshot().characters[0].attack?.moveId).toBe(aylaMove('f,n,d,df+2').id);
    const precise = setup(150); command(precise, ['F', 'N', 'D', 'DF'], '2', true);
    expect(precise.snapshot().characters[0].attack?.moveId).toBe(aylaMove('f,n,d,df:2').id);
  });

  it.each([['F', 'N', 'DF'], ['F', 'D', 'DF']] as const)('aceita o atalho de elétrico %j mantendo o just frame', (...directions) => {
    const sim = setup(150); command(sim, directions, '2', true);
    expect(sim.snapshot().characters[0].attack?.moveId).toBe(aylaMove('f,n,d,df:2').id);
  });

  it('multi-hit não tem caixa durante o intervalo e cada contato acerta uma única vez', () => {
    const sim = setup(); tick(sim, input('N', ['1', '2']));
    tick(sim, N, N, 12); const first = sim.snapshot(); expect(first.recentContacts).toHaveLength(1);
    expect(first.activeHitboxes).toHaveLength(0);
    tick(sim, N, N, 30);
    expect(sim.snapshot().recentContacts.filter(contact => contact.event.attackerId === 'player-1')).toHaveLength(2);
    const firstDamage = sim.snapshot().recentContacts[0].event.damage;
    const secondDamage = sim.snapshot().recentContacts[1].event.damage;
    expect(firstDamage).toBe(20); expect(secondDamage).toBeLessThan(80);
  });

  it('o low parry abre janela curta em DF, não em B, e produz estado aéreo sem dano', () => {
    const slow = { ...defaultCharacter, moves: aylaLegacyMoves.filter(move => move.id === 'crouching-lk') };
    const sim = new Simulation(createGameConfig(1024, 576), [ayla, slow], { training: true, initialDistance: 65 });
    tick(sim, N, input('D', ['3'])); tick(sim, N, N, 6); tick(sim, input('DF'));
    expect(sim.snapshot().recentContacts.some(contact => contact.event.lowParry && contact.event.outcome === 'parry')).toBe(true);
    expect(sim.snapshot().characters[0].health).toBe(ayla.maxHealth);
  });

  it('Screw só é renovado uma vez e o combo devolve o controle após a aterrissagem', () => {
    const sim = setup(); command(sim, ['F', 'N', 'D', 'DF'], '2', true); tick(sim, N, N, 15);
    expect(sim.snapshot().characters[1].combo?.hits).toBe(1);
    expect(sim.snapshot().characters[1].grounded).toBe(false);
    tick(sim, N, N, 180);
    expect(sim.snapshot().characters[1].mode).toBe('neutral'); expect(sim.snapshot().characters[1].combo).toBeUndefined();
    const [attacker, target] = setup().snapshot().characters as CharacterState[];
    target.grounded = false; const move = aylaMove('f+2'); const strike = move.combat!.strikes[0];
    applyStrikeReaction(attacker, target, move, strike, 10, false); expect(target.combo?.screwUsed).toBe(true);
    target.verticalVelocity = 3; applyStrikeReaction(attacker, target, move, strike, 10, false);
    expect(target.verticalVelocity).toBeGreaterThan(-8);
  });

  it('o override de hurtbox espelha por fase e não depende da pose provisória', () => {
    const sim = setup(180); tick(sim, input('N', ['2']));
    const state = sim.snapshot().characters[0]; const box = createHurtbox(state);
    const mirrored = createHurtbox({ ...state, facing: 'left' });
    expect(box.height).toBe(138); expect(box.x - state.x).toBe(-(mirrored.x - state.x) - mirrored.width);
  });

  it('Fulgor habilita variantes, não pode ser reativado e o projétil da variante tem vida própria', () => {
    const sim = setup(210);
    tick(sim, input('N', ['2', '3'])); tick(sim, N, N, 65);
    expect(sim.snapshot().characters[0].powerAvailable).toBe(false);
    expect(sim.snapshot().characters[0].powerFrames).toBeGreaterThan(0);
    tick(sim, input('DB', ['3', '4']));
    expect(sim.snapshot().characters[0].attack?.moveId).toBe(aylaMove('DVK.db+3+4').id);
    tick(sim, N, N, 24);
    expect(sim.snapshot().projectiles).toHaveLength(1);
    expect(sim.snapshot().projectiles[0].strikeIndex).toBe(0);
    tick(sim, N, N, 60);
    expect(sim.snapshot().projectiles).toHaveLength(0);
    tick(sim, input('N', ['2', '3']));
    expect(sim.snapshot().characters[0].attack?.moveId).toBe(aylaMove('H.2+3').id);
    expect(sim.snapshot().characters[0].powerFrames).toBe(0);
  });

  it('um avanço confirmado consome Fulgor e encerra a recuperação da string', () => {
    const sim = setup(62);
    tick(sim, input('DB', ['1'])); tick(sim, N, N, 14);
    tick(sim, input('N', ['2'])); tick(sim, N, N, 30);
    const before = sim.snapshot().characters[0];
    expect(before.powerFrames).toBeGreaterThan(0);
    expect(before.followup?.moveId).toBe(aylaMove('db+1,2').id);
    tick(sim, input('F'));
    const after = sim.snapshot().characters[0];
    expect(after.attack).toBeUndefined(); expect(after.powerFrames).toBe(0);
    expect(after.x - before.x).toBeGreaterThanOrEqual(40);
  });

  it('a carga torna o próximo acerto counter hit sem virar um golpe com dano próprio', () => {
    const sim = setup(); tick(sim, input('N', ['1', '2', '3', '4']));
    expect(sim.snapshot().characters[0].stance).toBe('charging');
    expect(sim.snapshot().activeHitboxes).toHaveLength(0);
    tick(sim); tick(sim, input('DF', ['2'])); tick(sim, N, N, 15);
    expect(sim.snapshot().recentContacts[0].event.context).toBe('counter-hit');
    expect(sim.snapshot().characters[0].stance).toBe('standing');
  });

  it('sabaki de socos confirma a resposta, mas não apara chutes', () => {
    const sim = setup(62);
    tick(sim, N, input('N', ['1'])); tick(sim, N, N, 2);
    tick(sim, input('F', ['1', '2'])); tick(sim, N, N, 30);
    expect(sim.snapshot().recentContacts.some(contact => contact.event.outcome === 'parry')).toBe(true);
    expect(sim.snapshot().recentContacts.some(contact => contact.event.attackerId === 'player-1' && contact.event.damage === 100)).toBe(true);
    const kick = setup(62);
    tick(kick, N, input('N', ['3'])); tick(kick, N, N, 5);
    tick(kick, input('F', ['1', '2'])); tick(kick, N, N, 12);
    expect(kick.snapshot().recentContacts.some(contact => contact.event.outcome === 'parry')).toBe(false);
    expect(kick.snapshot().characters[0].health).toBeLessThan(ayla.maxHealth);
  });

  it('carga de 20F integra o startup da continuação e não soma um segundo preparo inteiro', () => {
    const sim = setup(62);
    tick(sim, input('DF', ['3'])); tick(sim, N, N, 19);
    tick(sim, input('N', ['2'])); tick(sim, N, N, 20);
    const pressedAt = sim.snapshot().frame;
    tick(sim, input('N', ['1']), N, 20);
    const charged = aylaMove('df+3,2,1*');
    expect(sim.snapshot().characters[0].attack?.moveId).toBe(charged.id);
    expect(sim.snapshot().characters[0].attack?.elapsedFrames).toBe(20);
    tick(sim, N, N, charged.startup + 1 - 20);
    expect(sim.snapshot().recentContacts.some(contact => contact.event.moveId === charged.id && contact.frame === pressedAt + charged.startup + 1)).toBe(true);
  });

  it('histórico de inputs pode ser limpo sem avançar tempo, ataque, projétil ou combo', () => {
    const sim = setup(); tick(sim, input('N', ['1'])); const before = sim.snapshot();
    sim.clearInputHistory(); expect(sim.snapshot()).toEqual(before);
  });
});

describe('catálogo do pause por personagem', () => {
  it('separa combos, starters, básicos e agarrões sem duplicar linhas de categorias múltiplas', () => {
    const list = fighterMoveList(ayla);
    expect(new Set(list.map(entry => entry.id)).size).toBe(list.length);
    for (const category of ['basics', 'combos', 'starters', 'throws', 'specials'] as const) expect(filterMoveList(list, category, '').length).toBeGreaterThan(0);
    expect(filterMoveList(list, 'all', 'f,n,d,df:2').length).toBeGreaterThan(0);
    expect(fighterMoveList(gris).some(entry => entry.move?.combat?.reference)).toBe(false);
    expect(fighterMoveList(gris).some(entry => entry.id === 'golden-arc')).toBe(true);
    expect(filterMoveList(fighterMoveList(defaultCharacter), 'specials', '').some(entry => entry.id === 'test-electric-palm')).toBe(true);
  });

  it('os intervalos não reativam um contato já consumido', () => {
    const state = setup().snapshot().characters[0]; const move = aylaMove('1+2');
    state.attack = { moveId: move.id, buttons: [], elapsedFrames: move.startup, hasHit: false, preciseExecution: false, connectedStrikes: [0] };
    expect(currentStrike(state, move)).toBeUndefined(); expect(currentStrike(state, move, true)?.index).toBe(0);
  });
});
