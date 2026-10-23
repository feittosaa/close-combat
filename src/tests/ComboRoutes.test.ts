import { describe, expect, it } from 'vitest';
import { ayla } from './fixtures/referenceFighters';
import { aylaMove, aylaCombos } from '../engine/data/combat/aylaCombatBook';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import type { AttackButton, Direction, FrameInput } from '../input/types';
import type { MoveDefinition } from '../engine/data/moves';

const input = (direction: Direction = 'N', buttons: readonly AttackButton[] = []): FrameInput => ({ direction, buttons: new Set(buttons) });
const N = input();
function step(sim: Simulation, value = N, frames = 1): void { for (let i = 0; i < frames; i++) sim.stepFrame([value, N]); }
function wait(sim: Simulation, until: () => boolean): void {
  for (let i = 0; !until() && i < 180; i++) step(sim);
  expect(until()).toBe(true);
}
/** Input-only replay helper: no attack assignment, forced contact or teleport. */
function execute(sim: Simulation, move: MoveDefinition): void {
  const cmd = move.combat!.command;
  if (cmd.parentId) {
    expect((sim.snapshot().characters[0].attack ?? sim.snapshot().characters[0].followup)?.moveId, `parent of ${cmd.notation}`).toBe(cmd.parentId);
    wait(sim, () => ((sim.snapshot().characters[0].attack ?? sim.snapshot().characters[0].followup)?.elapsedFrames ?? -1) >= cmd.followupWindow!.from - 1);
  } else {
    const self = sim.snapshot().characters[0];
    const current = ayla.moves.find(other => other.id === (self.attack ?? self.followup)?.moveId);
    if (current?.combat?.reference?.command === '3,1' && cmd.directions?.[0] === 'F') {
      wait(sim, () => ((sim.snapshot().characters[0].attack ?? sim.snapshot().characters[0].followup)?.elapsedFrames ?? -1) >= current.startup + current.activeFrames);
      step(sim, input('DF'));
    }
    wait(sim, () => !sim.snapshot().characters[0].attack && !['hitstun', 'blockstun', 'knockdown'].includes(sim.snapshot().characters[0].mode));
    if (cmd.stance === 'rising') { step(sim, input('D'), 6); step(sim); }
    if (cmd.stance === 'crouching') step(sim, input('D'), 6);
    if (cmd.stance === 'sway') { step(sim, input('F', ['1', '2', '3', '4'])); step(sim); }
    if (cmd.stance === 'backturned') { step(sim, input('B', ['1', '2', '3', '4'])); step(sim); }
  }
  const directions = cmd.directions ?? [];
  directions.forEach((direction, index) => {
    if (index && direction === directions[index - 1]) step(sim);
    step(sim, input(direction, index === directions.length - 1 ? cmd.buttons : []));
  });
  if (!directions.length) step(sim, input('N', cmd.buttons));
  step(sim);
  wait(sim, () => sim.snapshot().characters[0].attack?.moveId === move.id || move.combat!.strikes.length === 0);
}

describe('rotas de combo por entradas normais', () => {
  it('dois elétricos encadeiam em juggle, sem reset da contagem nem controle do defensor', () => {
    const sim = new Simulation(createGameConfig(1600, 700), [ayla, ayla], { training: true, initialDistance: 62 });
    execute(sim, aylaMove('f,n,d,df:2'));
    execute(sim, aylaMove('f,n,d,df:2'));
    step(sim, N, 14);
    const state = sim.snapshot().characters[1];
    expect(state.combo?.hits).toBe(2);
    expect(state.mode).toBe('hitstun'); expect(state.grounded).toBe(false);
  });

  it('elétrico seguido da string 3,1,4 mantém os quatro contatos no mesmo combo', () => {
    const sim = new Simulation(createGameConfig(1600, 700), [ayla, ayla], { training: true, initialDistance: 62 });
    for (const command of ['f,n,d,df:2', '3', '3,1', '3,1,4']) execute(sim, aylaMove(command));
    step(sim, N, 25);
    const events = sim.snapshot().recentContacts.filter(contact => contact.event.outcome === 'hit');
    expect(events.map(contact => contact.event.moveId)).toEqual(['f,n,d,df:2', '3', '3,1', '3,1,4'].map(command => aylaMove(command).id));
    expect(sim.snapshot().characters[1].combo?.hits).toBe(4);
  });

  it('a rota inicial completa usa extensor e finalizador no mesmo combo', () => {
    const sim = new Simulation(createGameConfig(2000, 700), [ayla, ayla], { training: true, initialDistance: 62 });
    const recipe = aylaCombos[0];
    for (const id of recipe.moveIds) execute(sim, ayla.moves.find(move => move.id === id)!);
    step(sim, N, 30);
    const target = sim.snapshot().characters[1];
    const events = sim.snapshot().recentContacts.filter(contact => contact.event.outcome === 'hit');
    expect(events.map(contact => contact.event.moveId)).toEqual(recipe.moveIds);
    expect((target.combo ?? target.lastCombo)?.hits).toBe(recipe.moveIds.length);
  });

  it('o combo de parede parte de contato real, usa um splat e respeita os limites físicos', () => {
    const config = createGameConfig(1024, 700);
    const sim = new Simulation(config, [ayla, ayla], { training: true, initialDistance: 62 });
    for (let i = 0; i < 340; i++) sim.stepFrame([input('F'), input('B')]);
    step(sim);
    execute(sim, aylaMove('f,n,d,df:2'));
    step(sim, N, 15);
    expect(sim.snapshot().characters[1].combo?.wallUsed).toBe(true);
    for (const command of ['df+3+4', 'df+3+4,1', 'df+3+4,1,2']) execute(sim, aylaMove(command));
    step(sim, N, 60);
    const snapshot = sim.snapshot();
    expect(snapshot.recentContacts.filter(contact => contact.event.damage > 0).length).toBeGreaterThanOrEqual(4);
    for (const state of snapshot.characters) {
      expect(state.x - state.collision.bodyWidth / 2).toBeGreaterThanOrEqual(config.arena.left);
      expect(state.x + state.collision.bodyWidth / 2).toBeLessThanOrEqual(config.arena.right);
    }
  });

  it('ataque de direção U com botão é reconhecido antes de iniciar um salto genérico', () => {
    const sim = new Simulation(createGameConfig(1024, 576), [ayla, ayla], { training: true, initialDistance: 180 });
    step(sim, input('UF', ['4']));
    expect(sim.snapshot().characters[0].attack?.moveId).toBe(aylaMove('uf+4').id);
    expect(sim.snapshot().characters[0].grounded).toBe(true);
  });
});
