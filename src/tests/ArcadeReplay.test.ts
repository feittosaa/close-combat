import { describe, expect, it } from 'vitest';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { getCharacterById } from '../engine/data/characters';
import { ArcadeController } from '../engine/combat/ArcadeController';
import type { Direction, FrameInput } from '../input/types';

const input = (direction: Direction, buttons: FrameInput['buttons'] = new Set()): FrameInput => ({ direction, buttons });

describe('partidas completas contra o arcade', () => {
  it.each(['ayla', 'gris'])('resolve os dois rounds contra %s por entradas comuns', (fighterId) => {
    const player = getCharacterById('tester')!;
    const enemy = getCharacterById(fighterId)!;
    const simulation = new Simulation(createGameConfig(1024, 576), [player, enemy]);
    const bot = new ArcadeController(enemy, player);
    let lastAttack = -100;
    let round = 1;

    // Rehearse guarding startup/contact and punishing recovery. Neither side
    // changes health, position, move data, timer or the opponent's input.
    for (let frame = 0; frame < 14000 && !simulation.isMatchOver(); frame++) {
      const snapshot = simulation.snapshot();
      const [self, opponent] = snapshot.characters;
      if (snapshot.round !== round) {
        round = snapshot.round;
        bot.reset();
        lastAttack = -100;
      }
      let command = input('DB');
      if (snapshot.phase !== 'fight') command = input('N');
      else if (!self.attack && !['hitstun', 'blockstun', 'grabbed', 'throwRecovery'].includes(self.mode)) {
        if (opponent.attack && opponent.mode !== 'recovery') {
          const threat = enemy.moves.find(move => move.id === opponent.attack!.moveId);
          command = input(threat?.hitLevel === 'low' ? 'DB' : 'B');
        }
        else if (Math.abs(self.x - opponent.x) > 60) command = input('F');
        else if (snapshot.frame - lastAttack > 10) {
          command = input('N', new Set(['1', '2']));
          lastAttack = snapshot.frame;
        }
      }
      simulation.stepFrame([command, snapshot.phase === 'fight'
        ? bot.readInput(snapshot.frame, opponent, self, snapshot.projectiles) : input('N')]);
    }

    const result = simulation.snapshot();
    expect(result.phase).toBe('match-over');
    expect(result.round).toBe(2);
    expect(result.roundWins).toEqual([2, 0]);
    expect(result.matchWinnerId).toBe('player-1');
    expect(result.characters[0].health).toBeGreaterThan(0);
    expect(result.characters[1].health).toBe(0);
    expect(result.projectiles).toEqual([]);
  });
});
