import { it, expect } from 'vitest';
import { TrainingSession, OPPONENT_MODES } from '../training/TrainingSession';
import { TutorialSession, type TutorialLesson } from '../training/TutorialSession';
import { Simulation } from '../engine/simulation/Simulation';
import { defaultCharacter as shoto } from '../engine/data/characters';
import { cowboy } from '../engine/data/fighters/cowboy';
import { fighterMoveList } from '../training/MoveList';
import { createGameConfig } from '../engine/data/gameConfig';
import type { FrameInput } from '../input/types';
const N: FrameInput = { direction: 'N', buttons: new Set() };
const create = () => new Simulation(createGameConfig(1024, 576), [shoto, shoto], { training: true, initialDistance: 64 });
it('treino alterna controles e mantém inspeção dos quatro golpes', () => {
  const session = new TrainingSession(), sim = create();
  expect(session.opponentInput(0, sim.snapshot().characters)).toEqual(N);
  for (let i = 0; i < OPPONENT_MODES.length; i++) session.cycleOpponent();
  expect(session.opponentMode).toBe('idle'); session.opponentMode = 'manual';
  expect(session.opponentInput(0, sim.snapshot().characters)).toBeUndefined();
  session.cycleSpeed(); expect(session.speed).toBe(.5); session.cycleSpeed(); expect(session.speed).toBe(.25); session.cycleSpeed(); expect(session.speed).toBe(1);
  sim.stepFrame([{ direction: 'N', buttons: new Set(['1']) }, N]); session.observe(sim.snapshot());
  expect(session.lastMoves[0]?.name).toBe('Soco fraco'); session.resetInspection(); expect(session.lastMoves).toEqual([undefined, undefined]);
});
it('adversário de treino bloqueia por entrada legal sem receber dano ou usar parry', () => {
  const session = new TrainingSession(); session.opponentMode = 'guard-high'; const sim = create();
  for (let f = 0; f < 25; f++) sim.stepFrame([f === 0 ? { direction: 'N', buttons: new Set(['1']) } : N, session.opponentInput(f, sim.snapshot().characters)!]);
  expect(sim.snapshot().characters[1].health).toBe(1000);
  expect(sim.snapshot().recentContacts[0]?.event.outcome).toBe('block');
});
/** Opens the first lesson matching `find`, in any section. */
const openLesson = (tutorial: TutorialSession, find: (lesson: TutorialLesson) => boolean) => {
  tutorial.sectionIndex = tutorial.sections.findIndex(section => section.lessons.some(find));
  tutorial.lessonIndex = tutorial.section.lessons.findIndex(find); tutorial.resetAttempt();
  return tutorial.lesson!;
};
it('tutorial livre tem básico, combos e avançado, em ordem contínua e sem exigir conclusão', () => {
  const tutorial = new TutorialSession(shoto);
  expect(tutorial.sections.map(section => section.id)).toEqual(['basic', 'combos', 'advanced']);
  expect(tutorial.sections[0].lessons.slice(0, 8).map(lesson => lesson.notation)).toEqual(['f / b', 'u', 'd', 'b', '1', '2', '3', '4']);
  // Next lesson reads straight through: the end of a section leads into the next one, the very end back to the start.
  tutorial.changeLesson(-1); expect(tutorial.section.id).toBe('advanced'); expect(tutorial.lessonIndex).toBe(tutorial.section.lessons.length - 1);
  expect(tutorial.upcoming?.section.id).toBe('basic');
  tutorial.changeLesson(1); expect([tutorial.section.id, tutorial.lessonIndex]).toEqual(['basic', 0]);
  tutorial.lessonIndex = tutorial.section.lessons.length - 1;
  expect(tutorial.upcoming?.section.id).toBe('combos'); expect(tutorial.upcoming?.lesson).toBe(tutorial.sections[1].lessons[0]);
  tutorial.changeLesson(1); expect([tutorial.section.id, tutorial.lessonIndex]).toEqual(['combos', 0]);
  tutorial.changeSection(1); expect(tutorial.section.id).toBe('advanced'); expect(tutorial.lessonIndex).toBe(0);
  tutorial.changeSection(-2); expect(tutorial.section.id).toBe('basic');
});
it('golpe básico só conta com contato real e fica marcado como concluído', () => {
  const tutorial = new TutorialSession(shoto), lesson = openLesson(tutorial, entry => entry.key === 'move:light-punch'), sim = create();
  tutorial.observe(sim.snapshot(), { direction: 'N', buttons: new Set(['1']) }); expect(tutorial.passed).toBe(false);
  sim.stepFrame([{ direction: 'N', buttons: new Set(['1']) }, N]);
  for (let f = 0; f < 11; f++) { tutorial.observe(sim.snapshot(), N); sim.stepFrame([N, N]); }
  expect(tutorial.passed).toBe(true); expect(tutorial.isCompleted(tutorial.section, lesson)).toBe(true);
  expect(tutorial.connectedSteps).toBe(1); expect(lesson.steps).toEqual(['1']);
  tutorial.changeLesson(1); expect(tutorial.passed).toBe(false); expect(tutorial.isCompleted(tutorial.sections[0], lesson)).toBe(true);
});
it('combos trazem receitas, sequências encadeadas, especiais e ultimates de cada personagem', () => {
  const combos = new TutorialSession(cowboy).sections[1].lessons;
  expect(combos.map(lesson => lesson.key)).toEqual([...cowboy.combos!.map(combo => `combo:${combo.id}`), 'chain:0',
    ...cowboy.moves.filter(move => move.category === 'special' || move.category === 'ultimate').map(move => `move:${move.id}`)]);
  expect(combos.find(lesson => lesson.key === 'chain:0')?.moves).toEqual(['light-kick', 'light-kick', 'light-kick', 'light-punch', 'heavy-punch', 'heavy-punch', 'heavy-punch']);
  expect(new TutorialSession(shoto).sections[1].lessons.filter(lesson => lesson.key.startsWith('move:')).map(lesson => lesson.key))
    .toEqual(shoto.moves.filter(move => !move.comboOnly && (move.category === 'special' || move.category === 'ultimate')).map(move => `move:${move.id}`));
});
it('exemplo substitui as entradas até o fim e não conclui a lição sozinho', () => {
  const tutorial = new TutorialSession(shoto);
  openLesson(tutorial, entry => entry.key === 'move:light-punch');
  expect(tutorial.startDemo()).toBe(true);
  const sim = create();
  let lit = 0;
  while (!tutorial.demoFinished) { const input = tutorial.demoInput()!; sim.stepFrame([input, N]); tutorial.observe(sim.snapshot(), input); lit = Math.max(lit, tutorial.connectedSteps); }
  expect(sim.snapshot().characters[1].health).toBeLessThan(1000);
  expect(tutorial.passed).toBe(false); expect(lit).toBe(1); expect(tutorial.demoInput()).toBeUndefined();
  tutorial.resetAttempt(); expect(tutorial.demonstrating).toBe(false);
});
it('tutorial reconhece finalizador agachado e lista não o oferece como golpe independente', () => {
  const tutorial=new TutorialSession(cowboy);
  const lesson=openLesson(tutorial,entry=>entry.notation==='d+1,1,1');
  expect(lesson?.moves).toEqual(['crouch-punch','crouch-punch','crouch-combo-shot']);
  const list=fighterMoveList(cowboy);
  expect(list.some(entry=>entry.id==='crouch-combo-shot')).toBe(false);
  expect(list.some(entry=>entry.id==='crouch-butt-shot')).toBe(true);
});
it('tutorial de combo agachado reconhece as duas coronhadas e o projétil', () => {
  const tutorial=new TutorialSession(cowboy);
  openLesson(tutorial,lesson=>lesson.notation==='d+1,1,1');
  const sim=new Simulation(createGameConfig(1024,576),[cowboy,shoto],{training:true,initialDistance:65});
  const down:FrameInput={direction:'D',buttons:new Set()};
  const step=(value:FrameInput)=>{sim.stepFrame([value,N]);tutorial.observe(sim.snapshot(),value);};
  for(const move of ['crouch-punch','crouch-punch','crouch-combo-shot']) {
    step({direction:'D',buttons:new Set(['1'])});
    for(let tick=0;tick<80;tick++) {
      step(down);
      if(sim.snapshot().hitEvents.some(event=>event.moveId===move))break;
    }
    while(sim.snapshot().hitstopFramesRemaining)step(down);
  }
  expect(tutorial.passed).toBe(true);
});
