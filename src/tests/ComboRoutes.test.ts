import { describe, expect, it } from 'vitest';
import { characters, type CharacterDefinition } from '../engine/data/characters';
import { cowboy } from '../engine/data/fighters/cowboy';
import { parseCommand, routeInputs, type FighterRoutes, type RouteStep } from '../training/comboRoute';
import { TUTORIAL_START_DISTANCE, approachInputs, lessonCommands, playExample, routeNotation } from '../training/tutorialLessons';
import { TutorialSession } from '../training/TutorialSession';
import comboRoutes from '../training/comboRoutes.json';

const routes = comboRoutes as Record<string, FighterRoutes>;
/** Replays a route like the tutorial example does and returns player one's combos. */
const play = (fighter: CharacterDefinition, steps: readonly RouteStep[]) =>
  playExample(fighter, [...approachInputs(fighter), ...routeInputs(steps)], TUTORIAL_START_DISTANCE);

it('lê comandos da notação universal, incluindo agachado, simultâneo, sequência e pulo', () => {
  expect(parseCommand('d+1')).toEqual({ motion: [], direction: 'D', buttons: ['1'], hold: 'D' });
  expect(parseCommand('1+2')).toMatchObject({ direction: 'N', buttons: ['1', '2'], hold: 'N' });
  expect(parseCommand('b,bd,d,df,f,1+2')).toMatchObject({ motion: ['B', 'DB', 'D', 'DF', 'F'], direction: 'F', buttons: ['1', '2'] });
  expect(parseCommand('uf')).toMatchObject({ direction: 'UF', buttons: [] });
  expect(() => parseCommand('x,1')).toThrow();
  const frames = routeInputs([{ wait: 1, command: 'd+1' }, { wait: 6, command: 'd,df,f,2' }]);
  expect(frames.map(frame => `${frame.direction}${[...frame.buttons].join('')}`)).toEqual(['D1', 'D', 'D', 'D', 'DF', 'F', 'F2']);
  expect(() => routeInputs([{ wait: 1, command: '1' }, { wait: 1, command: '1' }])).toThrow();
});

it('o combo de exemplo do Bob (1,1,2 levantamento, 1,1,1,3,3,2,2,2 e chute antiaéreo forte) está no avançado', () => {
  expect(routes.shoto.advanced.map(route => route.steps.map(step => step.command).join(' '))).toContain('1 1 2 1 1 1 3 3 2 2 2 f,d,df,4');
  expect(routes.cowboy.advanced.map(route => route.steps.map(step => step.command).join(' '))).toContain('3 3 3 1 d+1 d+1 4 4 2 d,df,f,2');
});

it('o dano mostrado acompanha uma mudança nos dados do golpe', () => {
  const softer = { ...cowboy, moves: cowboy.moves.map(move => move.id === 'power-kick' ? { ...move, damage: move.damage - 10 } : move) };
  const lessonOf = (fighter: CharacterDefinition) => {
    const tutorial = new TutorialSession(fighter);
    return tutorial.stats(tutorial.sections[0].lessons.find(lesson => lesson.key === 'move:power-kick')!);
  };
  expect(lessonOf(softer)!.damage).toBe(lessonOf(cowboy)!.damage - 10);
});

it('o combo de exemplo da Texas (3,3,3,1, agacha 1,1, levanta 4,4,2 e dinamite antiaérea) dá 10 hits e 336 de dano', () => {
  const route = routes.cowboy.advanced.find(entry => entry.steps.map(step => step.command).join(' ') === '3 3 3 1 d+1 d+1 4 4 2 d,df,f,2');
  expect(route).toMatchObject({ hits: 10, damage: 336 });
  const combos = play(cowboy, route!.steps);
  expect(combos).toHaveLength(1);
  expect(combos[0]).toMatchObject({ hits: 10, damage: 336 });
});

describe.each(characters.map(fighter => [fighter.id, fighter] as const))('rotas do tutorial de %s', (id, fighter) => {
  const data = routes[id];
  it('cobrem exatamente as lições atuais; rode npm run combos:find após mudar golpes ou receitas', () => {
    const expected = lessonCommands(fighter);
    expect(Object.keys(data.lessons).sort()).toEqual(Object.keys(expected).sort());
    for (const [key, route] of Object.entries(data.lessons)) expect(route.steps.map(step => step.command), key).toEqual(expected[key]);
    const tutorial = new TutorialSession(fighter);
    for (const section of tutorial.sections) for (const lesson of section.lessons) expect(lesson.demo?.length, lesson.key).toBeGreaterThan(0);
  });
  it('cada rota ainda sai inteira num único combo; se falhar, rode npm run combos:find', () => {
    for (const [key, route] of [...Object.entries(data.lessons), ...data.advanced.map((route, index) => [`advanced:${index}`, route] as const)]) {
      // Lesson examples the search could not complete were stored with fewer hits than moves; they only demonstrate the inputs.
      if (route.hits < route.moveIds.length) continue;
      const combos = play(fighter, route.steps);
      expect(combos, key).toHaveLength(1);
      expect(combos[0].hits, key).toBeGreaterThanOrEqual(route.moveIds.length);
    }
  });
  it('o tutorial mostra hits e dano medidos com os dados atuais, iguais aos do exemplo', () => {
    const tutorial = new TutorialSession(fighter);
    for (const lesson of tutorial.sections.flatMap(section => section.lessons).filter(entry => entry.moves)) {
      const route = lesson.key.startsWith('advanced:') ? data.advanced[Number(lesson.key.slice(9))] : data.lessons[lesson.key];
      if (!route?.hits) continue;
      expect(tutorial.stats(lesson), lesson.key).toEqual({ hits: play(fighter, route.steps)[0].hits, damage: play(fighter, route.steps)[0].damage });
    }
  });
  it('avançados vão do mais fácil ao mais difícil, ganham dano no caminho e terminam com ultimate', () => {
    const ultimate = (route: (typeof data.advanced)[number]) => route.moveIds.some(id => fighter.moves.find(move => move.id === id)?.category === 'ultimate');
    const plain = data.advanced.filter(route => !ultimate(route));
    expect(plain.length).toBeGreaterThan(1);
    expect(ultimate(data.advanced[data.advanced.length - 1])).toBe(true);
    expect(data.advanced.slice(0, plain.length)).toEqual(plain);
    const pairs = plain.slice(1).map((route, index) => [plain[index], route]);
    expect(pairs.every(([easier, harder]) => easier.difficulty <= harder.difficulty)).toBe(true);
    expect(plain[plain.length - 1].damage).toBeGreaterThan(plain[0].damage);
    expect(data.advanced.every(route => route.notation === routeNotation(fighter, route.moveIds))).toBe(true);
  });
});
