import { describe, expect, it } from 'vitest';
import { ayla } from '../engine/data/fighters/ayla';
import { gris } from '../engine/data/fighters/gris';
import { getSpecialMoves, defaultCharacter, playableCharacters } from '../engine/data/characters';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { TutorialSession } from '../training/TutorialSession';
import type { AttackButton, Direction, FrameInput } from '../input/types';
import type { MoveDefinition } from '../engine/data/moves';

const input = (direction: Direction = 'N', buttons: readonly AttackButton[] = []): FrameInput => ({ direction, buttons: new Set(buttons) });
const N = input();
function game(fighter = ayla, target = defaultCharacter, distance = 62) {
  return new Simulation(createGameConfig(1600, 700), [fighter, target], { training: true, initialDistance: distance });
}
function tick(sim: Simulation, p1 = N, frames = 1, p2 = N) { for (let i = 0; i < frames; i++) sim.stepFrame([p1, p2]); }
function wait(sim: Simulation, until: () => boolean) {
  for (let i = 0; i < 160 && !until(); i++) tick(sim);
  expect(until()).toBe(true);
}
function execute(sim: Simulation, move: MoveDefinition) {
  const cmd = move.combat!.command;
  if (cmd.parentId) {
    wait(sim, () => ((sim.snapshot().characters[0].attack ?? sim.snapshot().characters[0].followup)?.elapsedFrames ?? -1) >= cmd.followupWindow!.from - 3);
  } else wait(sim, () => !sim.snapshot().characters[0].attack);
  tick(sim, input('N', cmd.buttons)); tick(sim, N, 3);
  expect(sim.snapshot().characters[0].attack?.moveId, cmd.notation).toBe(move.id);
}

describe('combate autoral com comandos simples', () => {
  it.each([ayla, gris])('$name possui 18 básicos, 6 launchers, 4 especiais, 2 agarrões e ultimate', fighter => {
    const moves = fighter.moves.filter(move => !move.legacy);
    expect(moves.filter(move => move.combat!.categories.includes('basics'))).toHaveLength(18);
    expect(moves.filter(move => move.combat!.role === 'launcher')).toHaveLength(6);
    expect(getSpecialMoves(fighter)).toHaveLength(4);
    expect(moves.filter(move => move.throw)).toHaveLength(2);
    expect(moves.filter(move => move.combat!.categories.includes('ultimate'))).toHaveLength(1);
    expect(moves.some(move => move.projectile)).toBe(true);
    expect(moves.every(move => !move.combat?.command.directions && !move.combat?.reference && !move.input.sequence)).toBe(true);
    expect(new Set(fighter.moves.map(move => move.id)).size).toBe(fighter.moves.length);
  });
  it('Ayla tem exatamente 80 entradas ativas, com prefixos e continuações únicos', () => {
    const moves = ayla.moves.filter(move => !move.legacy);
    expect(moves).toHaveLength(80);
    expect(new Set(moves.map(move => move.combat!.command.notation)).size).toBe(80);
    for (const move of moves) {
      const cmd = move.combat!.command;
      if (cmd.parentId) expect(moves.some(parent => parent.id === cmd.parentId)).toBe(true);
    }
  });
  it.each([ayla, gris])('$name mantém identidade dos seis ataques ao andar nos dois sentidos', fighter => {
    for (const token of ['1', '2', '3', '4', '1+2', '3+4']) {
      const ids = ['N', 'F', 'B'].map(direction => {
        const sim = game(fighter, defaultCharacter, 250);
        tick(sim, input(direction as Direction, token.split('+') as AttackButton[])); tick(sim, N, 3);
        return sim.snapshot().characters[0].attack?.moveId;
      });
      expect(ids[0]).toBeDefined(); expect(ids[1]).toBe(ids[0]); expect(ids[2]).toBe(ids[0]);
    }
  });
  it.each([ayla, gris])('$name seleciona agachados com D, DF e DB imediatamente', fighter => {
    for (const direction of ['D', 'DF', 'DB'] as const) {
      const sim = game(fighter); tick(sim, input(direction, ['1'])); tick(sim, input(direction), 3);
      expect(sim.snapshot().characters[0].attack?.moveId).toBe('crouching-lp');
    }
  });
  it('aceita o segundo botão até 3F e não dispara soco antes do acorde', () => {
    const sim = game(); tick(sim, input('N', ['1'])); tick(sim, N, 2);
    expect(sim.snapshot().characters[0].attack).toBeUndefined();
    tick(sim, input('N', ['2']));
    expect(sim.snapshot().characters[0].attack?.moveId).toBe('standing-pp');
  });
  it('não repete ataque por botão mantido nem reaproveita acorde sem comando', () => {
    const sim = game(); tick(sim, input('N', ['1']), 90);
    expect(sim.snapshot().recentContacts.filter(c => c.event.moveId === 'standing-lp')).toHaveLength(1);
    const invalid = game(); tick(invalid, input('N', ['1','3','4']), 20);
    expect(invalid.snapshot().characters[0].attack).toBeUndefined();
    expect(invalid.snapshot().recentContacts).toHaveLength(0);
  });
  it.each([ayla, gris])('$name executa todos os desafios iniciais contra os três corpos do elenco', fighter => {
    for (const target of [ayla, gris, defaultCharacter]) for (const recipe of fighter.combos!) {
      const sim = game(fighter, target);
      for (const id of recipe.moveIds) execute(sim, fighter.moves.find(move => move.id === id)!);
      tick(sim, N, 40);
      const contacts = sim.snapshot().recentContacts.filter(c => c.event.outcome === 'hit');
      expect(contacts.map(c => c.event.moveId), `${fighter.id}/${target.id}/${recipe.id}`).toEqual(recipe.moveIds);
      const defender = sim.snapshot().characters[1];
      expect((defender.combo ?? defender.lastCombo)?.moveIds).toEqual(recipe.moveIds);
    }
  });
  it.each([ayla, gris])('$name emite projétil com acorde, e o projétil conecta à distância', fighter => {
    const sim = game(fighter, defaultCharacter, 220);
    const move = getSpecialMoves(fighter).find(move => move.projectile)!;
    execute(sim, move); tick(sim, N, 65);
    expect(sim.snapshot().recentContacts.some(c => c.event.moveId === move.id && c.event.damage > 0)).toBe(true);
  });
  it.each([ayla, gris])('$name distingue os dois agarrões e permite suas quebras', fighter => {
    for (const reverse of [false, true]) {
      const move = fighter.moves.find(move => move.id === (reverse ? 'reverse-throw' : 'forward-throw'))!;
      const sim = game(fighter, defaultCharacter, 58);
      const before = sim.snapshot().characters;
      execute(sim, move); tick(sim, N, 40);
      const after = sim.snapshot().characters;
      expect(sim.snapshot().recentContacts.some(c => c.event.outcome === 'throw')).toBe(true);
      expect(after[0].x < after[1].x).toBe(!reverse);
      expect(before[0].x).toBeLessThan(before[1].x);
      const escaped = game(fighter, defaultCharacter, 58);
      execute(escaped, move);
      wait(escaped, () => escaped.snapshot().characters[1].mode === 'grabbed');
      tick(escaped, N, 1, input('N', [reverse ? '2' : '1']));
      expect(escaped.snapshot().hitEvents.some(e => e.outcome === 'throw-break')).toBe(true);
      expect(escaped.snapshot().characters[1].health).toBe(defaultCharacter.maxHealth);
    }
  });
});

describe('tutorial com avanço por execução', () => {
  it.each([ayla, gris])('$name passa ambos os desafios somente após acertar a receita real', fighter => {
    const tutorial = new TutorialSession(fighter, 'combo-tutorial');
    expect(tutorial.next()).toBe(false);
    for (const recipe of fighter.combos!) {
      const sim = game(fighter);
      for (const id of recipe.moveIds) {
        execute(sim, fighter.moves.find(move => move.id === id)!);
        tutorial.observe(sim.snapshot(), N);
      }
      for (let frame = 0; frame < 40; frame++) { tick(sim); tutorial.observe(sim.snapshot(), N); }
      expect(tutorial.passed).toBe(true);
      if (!tutorial.complete) expect(tutorial.next()).toBe(true);
    }
    expect(tutorial.complete).toBe(true);
    tutorial.resetAttempt(); expect(tutorial.passed).toBe(false);
  });
  it('não aprova sequência apenas digitada, errada ou interrompida', () => {
    const tutorial = new TutorialSession(ayla, 'combo-tutorial');
    const sim = game(ayla, defaultCharacter, 400);
    for (const id of ayla.combos![0].moveIds) execute(sim, ayla.moves.find(move => move.id === id)!);
    tick(sim, N, 20); tutorial.observe(sim.snapshot(), N);
    expect(tutorial.passed).toBe(false);
    expect(tutorial.next()).toBe(false);
  });
});

describe('posturas e ultimate do livro autoral', () => {
  it.each([ayla, gris])('$name reconhece todos os seis ataques aéreos após salto real', fighter => {
    for (const token of ['1','2','3','4','1+2','3+4']) {
      const sim = game(fighter); tick(sim, input('U')); tick(sim, N, 4);
      tick(sim, input('F', token.split('+') as AttackButton[])); tick(sim, N, 3);
      const attack = sim.snapshot().characters[0].attack;
      expect(attack?.airborne).toBe(true);
      expect(fighter.moves.find(move => move.id === attack?.moveId)?.combat?.command.notation).toBe(`AR ${token}`);
    }
  });
  it.each([ayla, gris])('$name limita ultimate por vida e tentativa por round', fighter => {
    const sim = game(fighter);
    tick(sim, input('N', ['1','2','3','4'])); tick(sim, N, 4);
    expect(sim.snapshot().characters[0].attack).toBeUndefined();
    sim.setTrainingHealthRatio(0, .25);
    execute(sim, fighter.moves.find(move => move.id === 'ultimate')!);
    expect(sim.snapshot().characters[0].rageUsed).toBe(true);
    tick(sim, N, 60);
    tick(sim, input('N', ['1','2','3','4'])); tick(sim, N, 4);
    expect(sim.snapshot().characters[0].attack).toBeUndefined();
    sim.resetMatch(); expect(sim.snapshot().characters[0].rageUsed).toBe(false);
    const match = new Simulation(createGameConfig(1024, 576), [fighter, fighter]);
    match.setTrainingHealthRatio(0, .25);
    expect(match.snapshot().characters[0].health).toBe(fighter.maxHealth);
  });
});

describe('currículo básico executável', () => {
  it.each([ayla, gris])('$name permite concluir todas as onze lições sem acertos forçados', fighter => {
    const tutorial = new TutorialSession(fighter, 'tutorial');
    for (let lessonIndex = 0; lessonIndex < tutorial.lessons.length; lessonIndex++) {
      const lesson = tutorial.lesson;
      const sim = game(fighter, defaultCharacter, lesson.distance);
      const observe = (value = N, opponent = N) => {
        tick(sim, value, 1, opponent); tutorial.observe(sim.snapshot(), value);
      };
      if (lesson.healthRatio) sim.setTrainingHealthRatio(0, lesson.healthRatio);
      if (lesson.movement) { for (let i = 0; i < 25; i++) observe(input('F')); }
      else if (lesson.airborne) {
        observe(input('U')); observe(); observe(input('N', ['3']));
        for (let i = 0; i < 10; i++) observe();
      } else if (lesson.guard) {
        for (let i = 0; i < 30; i++) observe(input('B'), i === 0 ? input('N', ['1']) : N);
      } else for (const id of lesson.moves!) {
        const move = fighter.moves.find(other => other.id === id)!;
        const cmd = move.combat!.command;
        for (let i = 0; i < 150 && sim.snapshot().characters[0].attack; i++) observe();
        const direction = cmd.posture === 'crouching' ? 'D' : 'N';
        observe(input(direction, cmd.buttons));
        const waitFrames = move.startup + move.activeFrames + 4 + (move.throw ? 14 : 0) + (move.projectile ? 30 : 0);
        for (let i = 0; i < waitFrames; i++) observe(input(direction));
      }
      expect(tutorial.passed, `${fighter.id}/${lesson.title}`).toBe(true);
      if (!tutorial.complete) expect(tutorial.next()).toBe(true);
    }
    expect(tutorial.complete).toBe(true);
  });
});

describe('starters do elenco autoral', () => {
  it.each([ayla, gris])('$name conecta as seis opções de levantamento por entradas normais', fighter => {
    const starters = fighter.moves.filter(move => !move.legacy && move.combat?.role === 'launcher');
    const chain = (move: MoveDefinition): MoveDefinition[] => {
      const parent = fighter.moves.find(other => other.id === move.combat!.command.parentId);
      return [...(parent ? chain(parent) : []), move];
    };
    for (const starter of starters) {
      const sim = game(fighter);
      for (const move of chain(starter)) execute(sim, move);
      let launched = false;
      for (let i = 0; i < 30; i++) {
        tick(sim);
        const target = sim.snapshot().characters[1];
        if (!target.grounded && target.combo?.moveIds.includes(starter.id)) launched = true;
      }
      expect(launched, `${fighter.id}/${starter.combat!.command.notation}`).toBe(true);
    }
  });
});


it('mantém os comandos legados de diagnóstico fora da seleção pública', () => {
  expect(playableCharacters.map(fighter => fighter.id)).toEqual(['ayla', 'gris']);
  for (const fighter of playableCharacters) {
    const moves = fighter.moves.filter(move => !move.legacy);
    expect(moves.filter(move => move.combat?.categories.includes('basics'))).toHaveLength(18);
    expect(moves.every(move => move.combat?.command.horizontalNeutral)).toBe(true);
    expect(moves.filter(move => move.combat?.role === 'launcher')).toHaveLength(6);
    expect(getSpecialMoves(fighter)).toHaveLength(4);
    expect(moves.filter(move => move.throw)).toHaveLength(2);
  }
});
