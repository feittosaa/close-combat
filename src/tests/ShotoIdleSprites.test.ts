import { describe, expect, it } from 'vitest';
import { combatantDepth } from '../rendering/CombatantView';
import { getShotoIdleFrame, getShotoSpritePose, getShotoUltimatePose, preloadShotoSprites, shotoIdleTexture } from '../rendering/animations/shotoSprites';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { shoto } from '../engine/data/fighters/shoto';
import type { FrameInput } from '../input/types';

describe('animação de espera do Shoto', () => {
  it('desenha a vítima do ippon atrás do atacante apenas durante a projeção', () => {
    const state = new Simulation(createGameConfig(1024, 576), [shoto, shoto], { training: true }).snapshot().characters[0];
    expect(combatantDepth(state, 100)).toBe(10);
    expect(combatantDepth({ ...state, ipponReceivedFrame: 100 }, 99)).toBe(10);
    expect(combatantDepth({ ...state, ipponReceivedFrame: 100 }, 100)).toBe(9);
    expect(combatantDepth({ ...state, ipponReceivedFrame: 100 }, 123)).toBe(9);
    expect(combatantDepth({ ...state, ipponReceivedFrame: 100 }, 124)).toBe(10);
  });

  it('percorre os seis quadros no relógio da simulação e reinicia', () => {
    expect([0, 11, 12, 60, 71, 72].map(frame => getShotoIdleFrame(frame, 0))).toEqual([0, 0, 1, 5, 5, 0]);
    expect(getShotoIdleFrame(115, 100)).toBe(1);
  });

  it('carrega o atlas uma vez', () => {
    const loaded: string[] = [];
    const scene = { textures: { exists: () => false }, load: { packedAtlas: (key: string) => loaded.push(key), image: (key: string) => loaded.push(key) } };
    preloadShotoSprites(scene as never);
    expect(loaded).toContain(shotoIdleTexture);
    const initialCount = loaded.length;
    preloadShotoSprites({ ...scene, textures: { exists: () => true } } as never);
    expect(loaded).toHaveLength(initialCount);
  });

  it('acelera os quadros da ultimate', () => {
    const state = new Simulation(createGameConfig(1024, 576), [shoto, shoto], { training: true }).snapshot().characters[0];
    const attack = { moveId: 'heavy-punch', buttons: ['2' as const], elapsedFrames: 13, hasHit: false };
    const ultimate = { ...state, attack: { ...attack, moveId: 'rake-ultimate' } };
    expect([0, 1, 2, 3, 4].map(frame => getShotoUltimatePose(ultimate, frame, false).frame)).toEqual([0, 0, 1, 1, 2]);
    expect(getShotoUltimatePose(ultimate, 75, true).frame).toBe(5);
  });

  it('usa a pose de impacto durante a fase ativa e espelha a orientação original', () => {
    const state = new Simulation(createGameConfig(1024, 576), [shoto, shoto], { training: true }).snapshot().characters[0];
    const attack = { moveId: 'heavy-punch', buttons: ['2' as const], elapsedFrames: 13, hasHit: false };
    const right = getShotoSpritePose({ ...state, facing: 'right', mode: 'active', attack }, 13);
    const left = getShotoSpritePose({ ...state, facing: 'left', mode: 'active', attack }, 13);
    expect(right).toMatchObject({ texture: 'shoto-launcher-punch', frame: 4, flipX: false });
    expect(left).toMatchObject({ texture: 'shoto-launcher-punch', frame: 4, flipX: true });
    expect(getShotoSpritePose({ ...state, mode: 'active', attack: { ...attack, elapsedFrames: 15 } }, 15)?.frame).toBe(5);
    expect(getShotoSpritePose({ ...state, mode: 'recovery', attack: { ...attack, elapsedFrames: 17 } }, 17)?.frame).toBe(5);
    expect(shoto.moves.find(move => move.id === 'heavy-punch')?.recovery).toBe(23);
  });

  it('mantém arte nas defesas e reações aéreas e usa fallback nos golpes sem arte', () => {
    const state = new Simulation(createGameConfig(1024, 576), [shoto, shoto], { training: true }).snapshot().characters[0];
    expect(getShotoSpritePose({ ...state, grounded: false, mode: 'blocking' }, 0)).toMatchObject({ texture: 'shoto-air-guard', frame: 0 });
    expect(getShotoSpritePose({ ...state, grounded: false, mode: 'blocking' }, 4)?.frame).toBe(2);
    expect(getShotoSpritePose({ ...state, grounded: false, mode: 'blockstun' }, 0)).toMatchObject({ texture: 'shoto-air-guard', frame: 3 });
    expect(getShotoSpritePose({ ...state, grounded: false, mode: 'hitstun' }, 0)?.texture).toBe('shoto-air-hurt');
    const attack = { moveId: 'throw-24', buttons: ['2' as const, '4' as const], elapsedFrames: 0, hasHit: false };
    expect(getShotoSpritePose({ ...state, mode: 'startup', attack }, 0)?.texture).toBe('shoto-ippon');
  });

  it('mostra os golpes aéreos e agachados no quadro correspondente ao contato', () => {
    const state = new Simulation(createGameConfig(1024, 576), [shoto, shoto], { training: true }).snapshot().characters[0];
    for (const [moveId, expectedFrame] of [['air-light-punch', 3], ['air-heavy-punch', 4], ['crouch-punch', 3], ['crouch-light-kick', 3]] as const) {
      const move = shoto.moves.find(candidate => candidate.id === moveId)!;
      const attack = { moveId, buttons: ['1' as const], elapsedFrames: move.startup, hasHit: false };
      expect(getShotoSpritePose({ ...state, mode: 'active', attack }, move.startup)).toMatchObject({ texture: `shoto-${moveId}`, frame: expectedFrame });
    }
  });

  it('seleciona um sprite para cada golpe do catálogo durante a fase ativa', () => {
    const state = new Simulation(createGameConfig(1024, 576), [shoto, shoto], { training: true }).snapshot().characters[0];
    for (const move of shoto.moves.filter(move => !['throw-13', 'throw-24'].includes(move.id))) {
      const attack = { moveId: move.id, buttons: move.input.buttons, elapsedFrames: move.startup, hasHit: false };
      expect(getShotoSpritePose({ ...state, mode: 'active', attack }, move.startup)?.texture, move.id).toMatch(/^shoto-/);
    }
  });

  it('segura o tomate na mão até o projétil sair e mostra o arremesso no quadro em que ele nasce', () => {
    const state = new Simulation(createGameConfig(1024, 576), [shoto, shoto], { training: true }).snapshot().characters[0];
    for (const id of ['tomato-light', 'tomato-heavy']) {
      const move = shoto.moves.find(candidate => candidate.id === id)!;
      const frames = Array.from({ length: move.startup + move.activeFrames + move.recovery }, (_, elapsedFrames) => {
        const attack = { moveId: id, buttons: ['1' as const], elapsedFrames, hasHit: false };
        const pose = getShotoSpritePose({ ...state, mode: 'startup', attack }, elapsedFrames)!;
        expect(pose.texture).toBe('shoto-tomato-throw');
        return pose.frame;
      });
      expect(new Set(frames.slice(0, move.startup))).toEqual(new Set([0, 1, 2]));
      expect(frames[move.startup]).toBe(3);
      expect(new Set(frames.slice(move.startup))).toEqual(new Set([3, 4, 5]));
      expect(frames).toEqual([...frames].sort((a, b) => a - b));
      const sim = new Simulation(createGameConfig(1024, 576), [shoto, shoto], { training: true, initialDistance: 400 });
      const press = (direction: FrameInput['direction'], buttons: FrameInput['buttons'] = new Set()) => sim.stepFrame([{ direction, buttons }, { direction: 'N', buttons: new Set() }]);
      press('D'); press('DF'); press('F', new Set(move.input.buttons));
      for (let i = 0; i < 60 && !sim.snapshot().projectiles.length; i++) press('N');
      expect(getShotoSpritePose(sim.snapshot().characters[0], 0)).toMatchObject({ texture: 'shoto-tomato-throw', frame: 3 });
    }
  });

  it('mostra o ancinho apenas depois de 600 quadros parados', () => {
    const state = new Simulation(createGameConfig(1024, 576), [shoto, shoto], { training: true }).snapshot().characters[0];
    const idle = { ...state, mode: 'neutral' as const, idleStartedFrame: 10 };
    expect(getShotoSpritePose(idle, 609)?.texture).toBe('shoto-idle-normal');
    expect(getShotoSpritePose(idle, 610)).toMatchObject({ texture: 'shoto-rake-enter', frame: 0 });
    expect(getShotoSpritePose(idle, 639)).toMatchObject({ texture: 'shoto-rake-enter', frame: 5 });
    expect(getShotoSpritePose(idle, 640)?.texture).toBe('shoto-idle');
    expect(getShotoSpritePose({ ...idle, idleStartedFrame: 610 }, 610)?.texture).toBe('shoto-idle-normal');
  });

  it('reinicia a espera após uma ação e não antecipa o ancinho', () => {
    const sim = new Simulation(createGameConfig(1024, 576), [shoto, shoto], { training: true, initialDistance: 400 });
    const neutral = { direction: 'N' as const, buttons: new Set<'1'>() };
    for (let tick = 0; tick < 650; tick++) sim.stepFrame([neutral, neutral]);
    let snapshot = sim.snapshot();
    expect(getShotoSpritePose(snapshot.characters[0], snapshot.frame)?.texture).toBe('shoto-idle');
    sim.stepFrame([{ direction: 'F', buttons: new Set() }, neutral]);
    for (let tick = 0; tick < 4; tick++) sim.stepFrame([neutral, neutral]);
    snapshot = sim.snapshot();
    expect(getShotoSpritePose(snapshot.characters[0], snapshot.frame)?.texture).toBe('shoto-idle-normal');
  });

  it('faz a transição rápida do ancinho e mostra a reação ao agarrão', () => {
    const state = new Simulation(createGameConfig(1024, 576), [shoto, shoto], { training: true }).snapshot().characters[0];
    const from = { mode: 'neutral' as const, grounded: true, crouching: false, facing: 'right' as const, verticalVelocity: 0, stateStartedFrame: -700, idleStartedFrame: -700 };
    const walking = { ...state, mode: 'moving' as const, animationTransition: { from, startedFrame: 10 } };
    expect([10, 11, 12].map(frame => getShotoSpritePose(walking, frame)?.frame)).toEqual([0, 1, 2]);
    expect(getShotoSpritePose(walking, 13)?.texture).toBe('shoto-enter-walk');
    expect(getShotoSpritePose(walking, 22)?.texture).toBe('shoto-walk');
    expect(getShotoSpritePose({ ...state, mode: 'hitstun', grabbedStartedFrame: 10 }, 12)?.texture).toBe('shoto-grabbed');
    expect(getShotoSpritePose({ ...state, mode: 'hitstun', grabbedStartedFrame: 10 }, 26)?.texture).toBe('shoto-hurt');
  });

  it('usa transições de entrada na caminhada e saída da guarda e do agachamento', () => {
    const state = new Simulation(createGameConfig(1024, 576), [shoto, shoto], { training: true }).snapshot().characters[0];
    const from = { mode: 'neutral' as const, grounded: true, crouching: false, facing: 'right' as const, verticalVelocity: 0, stateStartedFrame: 0 };
    for (const facing of ['left', 'right'] as const) {
      const moving = { ...state, facing, mode: 'moving' as const, movementDirection: 'forward' as const, animationTransition: { from, startedFrame: 10 } };
      expect(getShotoSpritePose(moving, 10)).toMatchObject({ texture: 'shoto-enter-walk', frame: 0, flipX: facing === 'left' });
      expect(getShotoSpritePose(moving, 20)).toMatchObject({ texture: 'shoto-enter-walk', frame: 5 });
      expect(getShotoSpritePose(moving, 22)?.texture).toBe('shoto-walk');
      const rising = { ...state, facing, mode: 'neutral' as const, animationTransition: { from: { ...from, mode: 'crouching' as const, crouching: true }, startedFrame: 10 } };
      expect([10, 12, 15].map(frame => getShotoSpritePose(rising, frame)?.frame)).toEqual([5, 3, 0]);
      const guardExit = { ...rising, animationTransition: { from: { ...from, mode: 'blocking' as const }, startedFrame: 10 } };
      expect(getShotoSpritePose(guardExit, 10)).toMatchObject({ texture: 'shoto-guard', frame: 3 });
      expect(getShotoSpritePose(guardExit, 16)?.texture).toBe('shoto-idle-normal');
    }
  });

  it('reinicia a reação em cada novo acerto, no chão e no ar', () => {
    const state = new Simulation(createGameConfig(1024, 576), [shoto, shoto], { training: true }).snapshot().characters[0];
    for (const grounded of [true, false]) {
      const hurt = { ...state, grounded, mode: 'hitstun' as const, stateStartedFrame: 10, hitReaction: { level: 'mid' as const, startedFrame: 10 } };
      expect(getShotoSpritePose(hurt, 22)?.frame).toBe(5);
      expect(getShotoSpritePose({ ...hurt, hitReaction: { level: 'high', startedFrame: 22 } }, 22)?.frame).toBe(1);
    }
  });

  it('usa as reações de contato baixo, médio e alto no chão', () => {
    const state = new Simulation(createGameConfig(1024, 576), [shoto, shoto], { training: true }).snapshot().characters[0];
    for (const [level, texture] of [['low', 'shoto-hurt-low'], ['mid', 'shoto-hurt'], ['high', 'shoto-hurt-high']] as const) {
      expect(getShotoSpritePose({ ...state, mode: 'hitstun', hitReaction: { level, startedFrame: 10 } }, 10)?.texture).toBe(texture);
    }
  });

  it('mantém a pose agachada durante e depois da recuperação', () => {
    const state = new Simulation(createGameConfig(1024, 576), [shoto, shoto], { training: true }).snapshot().characters[0];
    for (const id of ['crouch-punch', 'crouch-light-kick', 'crouch-heavy-kick']) {
      const move = shoto.moves.find(candidate => candidate.id === id)!;
      const attack = { moveId: id, buttons: ['1' as const], elapsedFrames: move.startup + move.activeFrames, hasHit: false };
      expect(getShotoSpritePose({ ...state, mode: 'recovery', crouching: true, attack }, 30)).toMatchObject({ texture: 'shoto-crouch', frame: 5 });
    }
    const from = { mode: 'recovery' as const, grounded: true, crouching: true, facing: 'right' as const, verticalVelocity: 0, stateStartedFrame: 0 };
    expect(getShotoSpritePose({ ...state, mode: 'crouching', crouching: true, animationTransition: { from, startedFrame: 30 } }, 30)).toMatchObject({ texture: 'shoto-crouch', frame: 5 });
  });

  it('mostra a extensão vertical do antiaéreo e retorna ao agachamento nos dois lados', () => {
    const state = new Simulation(createGameConfig(1024, 576), [shoto, shoto], { training: true }).snapshot().characters[0];
    const move = shoto.moves.find(candidate => candidate.id === 'crouch-uppercut')!;
    for (const facing of ['left', 'right'] as const) {
      const attack = { moveId: move.id, buttons: move.input.buttons, elapsedFrames: move.startup, hasHit: false };
      const active = { ...state, facing, crouching: true, mode: 'active' as const, attack };
      expect(getShotoSpritePose(active, move.startup)).toMatchObject({ texture: 'shoto-crouch-uppercut', frame: 4, flipX: facing === 'left' });
      const end = move.startup + move.activeFrames;
      expect(getShotoSpritePose({ ...active, mode: 'recovery', attack: { ...attack, elapsedFrames: end } }, end)).toMatchObject({ texture: 'shoto-crouch-uppercut', frame: 5 });
      expect(getShotoSpritePose({ ...active, mode: 'recovery', attack: { ...attack, elapsedFrames: end + 3 } }, end + 3)).toMatchObject({ texture: 'shoto-crouch', frame: 5 });
    }
  });

  it.each([0, 1])('recupera o antiaéreo em pé ou agachado conforme a direção, jogador %i', player => {
    for (const held of [false, true]) {
      const sim = new Simulation(createGameConfig(1024, 576), [shoto, shoto], { training: true, initialDistance: 400 });
      const neutral = { direction: 'N' as const, buttons: new Set<'2'>() };
      const step = (value: FrameInput) => {
        const inputs: FrameInput[] = [neutral, neutral]; inputs[player] = value; sim.stepFrame(inputs);
      };
      step({ direction: 'D', buttons: new Set(['2']) });
      const move = shoto.moves.find(candidate => candidate.id === 'crouch-uppercut')!;
      for (let tick = 0; tick < move.startup + move.activeFrames + move.recovery + 2; tick++) {
        step({ direction: held ? 'D' : 'N', buttons: new Set() });
        const snapshot = sim.snapshot(); const state = snapshot.characters[player];
        if (state.attack?.moveId === move.id && state.mode === 'recovery') {
          expect(state.crouching).toBe(held);
          if (!held) expect(getShotoSpritePose(state, snapshot.frame)?.texture).toBe('shoto-idle-normal');
        }
      }
      const finished = sim.snapshot().characters[player];
      expect(finished.mode).toBe(held ? 'crouching' : 'neutral');
      expect(finished.crouching).toBe(held);
    }
  });

  it('seleciona o segundo e o terceiro chutes do windmill a partir da sequência confirmada', () => {
    const state = new Simulation(createGameConfig(1024, 576), [shoto, shoto], { training: true }).snapshot().characters[0];
    const light = shoto.moves.find(move => move.id === 'light-kick')!;
    const heavy = shoto.moves.find(move => move.id === 'heavy-kick')!;
    const attack = (moveId: string, elapsedFrames: number) => ({ moveId, buttons: ['3' as const], elapsedFrames, hasHit: false });
    expect(getShotoSpritePose({ ...state, mode: 'active', attack: attack(light.id, light.startup), chain: [light.id] }, light.startup)?.texture).toBe('shoto-light-kick');
    expect(getShotoSpritePose({ ...state, mode: 'active', attack: attack(light.id, light.startup), chain: [light.id, light.id] }, light.startup)).toMatchObject({ texture: 'shoto-windmill-2', frame: 3 });
    expect(getShotoSpritePose({ ...state, mode: 'active', attack: attack(heavy.id, heavy.startup), chain: [light.id, light.id, heavy.id] }, heavy.startup)).toMatchObject({ texture: 'shoto-windmill-4', frame: 3 });
    expect(getShotoSpritePose({ ...state, mode: 'active', attack: attack(heavy.id, heavy.startup), chain: [light.id, heavy.id] }, heavy.startup)).toMatchObject({ texture: 'shoto-windmill-4', frame: 3 });
  });

  it('usa o mesmo gancho no soco forte e no final de 1,1,2', () => {
    const state = new Simulation(createGameConfig(1024, 576), [shoto, shoto], { training: true }).snapshot().characters[0];
    const attack = { moveId: 'heavy-punch', buttons: ['2' as const], elapsedFrames: 13, hasHit: false };
    expect(getShotoSpritePose({ ...state, mode: 'active', attack, chain: ['light-punch', 'light-punch', 'heavy-punch'] }, 13)?.texture).toBe('shoto-launcher-punch');
    expect(getShotoSpritePose({ ...state, mode: 'active', attack, chain: ['heavy-punch'] }, 13)?.texture).toBe('shoto-launcher-punch');
  });

  it('seleciona os três ganchos do combo forte sem trocar o lado da apresentação', () => {
    const state = new Simulation(createGameConfig(1024, 576), [shoto, shoto], { training: true }).snapshot().characters[0];
    const attack = { moveId: 'heavy-punch', buttons: ['2' as const], elapsedFrames: 13, hasHit: false };
    for (const facing of ['left', 'right'] as const) {
      const textures = [1, 2, 3].map(count => getShotoSpritePose({ ...state, facing, mode: 'active', attack, chain: Array(count).fill('heavy-punch') }, 13));
      expect(textures.map(pose => pose?.texture)).toEqual(['shoto-launcher-punch', 'shoto-heavy-punch-2', 'shoto-heavy-punch-3']);
      expect(textures.every(pose => pose?.flipX === (facing === 'left'))).toBe(true);
    }
  });

  it('alterna os braços nos três socos leves sem inverter a direção', () => {
    const state = new Simulation(createGameConfig(1024, 576), [shoto, shoto], { training: true }).snapshot().characters[0];
    const attack = { moveId: 'light-punch', buttons: ['1' as const], elapsedFrames: 8, hasHit: false };
    for (const facing of ['left', 'right'] as const) {
      const poses = [1, 2, 3].map(count => getShotoSpritePose({ ...state, facing, mode: 'active', attack, chain: Array(count).fill('light-punch') }, 8));
      expect(poses.map(pose => pose?.texture)).toEqual(['shoto-light-punch', 'shoto-alternate-punch', 'shoto-light-punch']);
      expect(poses.every(pose => pose?.flipX === (facing === 'left'))).toBe(true);
    }
  });

  it('Bob que perde no ar pousa deitado, sem a pose de levantar nem a de pé', async () => {
    const { settleAfterRound } = await import('../rendering/animations/cowboySprites');
    const base = new Simulation(createGameConfig(1024, 576), [shoto, shoto], { training: true }).snapshot().characters[0];
    const airborne = { ...base, y: base.y - 200, grounded: false, verticalVelocity: -3, mode: 'airborne' as const, remainingStateFrames: 0, stateStartedFrame: 540 };
    const landed = settleAfterRound(airborne, 200, base.y, .55, true);
    expect(landed).toMatchObject({ grounded: true, mode: 'knockdown', y: base.y });
    expect(getShotoSpritePose(landed, 549)).toMatchObject({ texture: 'shoto-fall', frame: 5 });
    expect(settleAfterRound(airborne, 200, base.y, .55, false).mode).toBe('neutral');
  });
});
