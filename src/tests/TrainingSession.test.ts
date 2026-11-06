import { it, expect } from 'vitest';
import { TrainingSession, OPPONENT_MODES } from '../training/TrainingSession';
import { TutorialSession } from '../training/TutorialSession';
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
it('tutorial básico só oferece movimento, quatro básicos e guarda; exige contato real', () => {
  const tutorial = new TutorialSession(shoto);
  expect(tutorial.lessons.slice(0, 6).map(lesson => lesson.notation)).toEqual(['F / B', '1', '2', '3', '4', 'B']);
  tutorial.index = 1; const sim = create();
  tutorial.observe(sim.snapshot(), { direction: 'N', buttons: new Set(['1']) }); expect(tutorial.passed).toBe(false);
  sim.stepFrame([{ direction: 'N', buttons: new Set(['1']) }, N]);
  for (let f = 0; f < 11; f++) { tutorial.observe(sim.snapshot(), N); sim.stepFrame([N, N]); }
  expect(tutorial.passed).toBe(true); expect(tutorial.next()).toBe(true);
  expect(tutorial.lesson?.notation).toBe('2'); tutorial.resetAttempt(); expect(tutorial.passed).toBe(false);
});
const comboLessons = (tutorial: TutorialSession) => tutorial.lessons.filter(lesson => lesson.part === 'COMBOS · OPCIONAL');
it('o tutorial único termina no treino opcional de combos, sem aprovar digitação isolada', () => {
  const tutorial = new TutorialSession(shoto);
  expect(tutorial.lessons.slice(0, 6).every(lesson => lesson.part !== 'COMBOS · OPCIONAL')).toBe(true);
  expect(comboLessons(tutorial)).toHaveLength(6);
  tutorial.index = tutorial.lessons.indexOf(comboLessons(tutorial)[0]);
  tutorial.observe(create().snapshot(), N); expect(tutorial.complete).toBe(false); expect(tutorial.next()).toBe(false);
});
it('combos do tutorial vão do menor ao maior dano e incluem a sequência autorada da Texas', () => {
  const tutorial = new TutorialSession(cowboy), lessons = comboLessons(tutorial);
  const damage = (moves: readonly string[]) => moves.reduce((sum, id) => sum + cowboy.moves.find(move => move.id === id)!.damage, 0);
  const values = lessons.map(lesson => damage(lesson.moves!));
  expect(values).toEqual([...values].sort((a, b) => a - b));
  const chain = lessons.find(lesson => lesson.notation === '3,3,3,1,2,2,2');
  expect(chain?.moves).toEqual(['light-kick', 'light-kick', 'light-kick', 'light-punch', 'heavy-punch', 'heavy-punch', 'heavy-punch']);
  expect(lessons[lessons.length - 1]).toBe(chain);
});
it('tutorial reconhece finalizador agachado e lista não o oferece como golpe independente', () => {
  const tutorial=new TutorialSession(cowboy);
  const lesson=tutorial.lessons.find(entry=>entry.notation==='d+1,1,1');
  expect(lesson?.moves).toEqual(['crouch-punch','crouch-punch','crouch-combo-shot']);
  const list=fighterMoveList(cowboy);
  expect(list.some(entry=>entry.id==='crouch-combo-shot')).toBe(false);
  expect(list.some(entry=>entry.id==='crouch-butt-shot')).toBe(true);
});
it('tutorial de combo agachado reconhece as duas coronhadas e o projétil', () => {
  const tutorial=new TutorialSession(cowboy);
  tutorial.index=tutorial.lessons.findIndex(lesson=>lesson.notation==='d+1,1,1');
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
