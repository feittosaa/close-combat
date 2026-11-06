import { expect, it } from 'vitest';
import { drawVersusStage, groupOfStage, groupsFor, RANDOM_STAGE, resolveChoice, STAGE_GROUPS } from '../rendering/stages/stageGroups';
import { createArcadeRun } from '../scenes/matchSetup';
import { stages } from '../rendering/stages/stageCatalog';

const sequence = (values: number[]) => { let index = 0; return () => values[index++ % values.length]; };

it('agrupa os três saloons num cenário só e deixa a sala de treino por último', () => {
  expect(STAGE_GROUPS.map(group => group.id)).toEqual(['fazenda', 'saloon', 'sala-treino']);
  expect(STAGE_GROUPS[1].variants).toEqual(['saloon-dia', 'saloon-noite', 'saloon']);
  expect(STAGE_GROUPS.flatMap(group => group.variants).sort()).toEqual(stages.map(stage => stage.id).sort());
  expect(groupOfStage('saloon-noite')?.id).toBe('saloon');
});

it('bloqueia a sala de treino no Arcade e a oferece no PvP', () => {
  expect(groupsFor('arcade').map(group => group.id)).toEqual(['fazenda', 'saloon']);
  expect(groupsFor('versus')[2]?.id).toBe('sala-treino');
});

it('o Arcade aleatório nunca usa a sala de treino nem repete o Saloon em sequência, em dia, noite ou retrô', () => {
  for (let seed = 1; seed <= 200; seed++) {
    let state = seed; const random = () => (state = (state * 1103515245 + 12345) % 2147483648) / 2147483648;
    const run = createArcadeRun(random);
    expect(run.stages).not.toContain('sala-treino');
    run.stages.slice(1).forEach((id, index) => expect(groupOfStage(id)?.id, `seed ${seed}`).not.toBe(groupOfStage(run.stages[index])?.id));
  }
});

it('o aleatório sorteia um cenário e só depois a variação, então o Saloon pesa como um', () => {
  const counts: Record<string, number> = {};
  for (let i = 0; i < 3000; i++) { let n = i * 7919 + 13; const random = () => (n = (n * 48271) % 2147483647) / 2147483647; const id = resolveChoice(RANDOM_STAGE, groupsFor('versus'), random); counts[id] = (counts[id] ?? 0) + 1; }
  const saloon = (counts['saloon-dia'] ?? 0) + (counts['saloon-noite'] ?? 0) + (counts['saloon'] ?? 0);
  expect(saloon / 3000).toBeGreaterThan(.28); expect(saloon / 3000).toBeLessThan(.38);
  expect(counts['fazenda'] / 3000).toBeGreaterThan(.28);
});

it('sorteia 50% para cada cenário quando os dois escolhem diferente, e não sorteia quando escolhem o mesmo', () => {
  const groups = groupsFor('versus');
  const farm = { groupId: 'fazenda' }, night = { groupId: 'saloon', variantId: 'saloon-noite' };
  expect(drawVersusStage([farm, night], groups, sequence([.49]))).toMatchObject({ stageId: 'fazenda', drawn: true, winner: 0 });
  expect(drawVersusStage([farm, night], groups, sequence([.5]))).toMatchObject({ stageId: 'saloon-noite', drawn: true, winner: 1 });
  expect(drawVersusStage([night, { ...night }], groups, sequence([.1]))).toMatchObject({ stageId: 'saloon-noite', drawn: false });
  const wins = [0, 0]; for (let i = 0; i < 2000; i++) wins[drawVersusStage([farm, night], groups, () => (i * 0.6180339887) % 1).winner]++;
  expect(Math.abs(wins[0] - wins[1])).toBeLessThan(200);
});
