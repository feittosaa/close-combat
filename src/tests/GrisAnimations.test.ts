import { describe, expect, it } from 'vitest';
import manifest from '../assets/animations/gris.json';
import catalog from '../assets/sprites/characters/gris/runtime/frame-catalog.json';
import { gris } from '../engine/data/fighters/gris';
import { ayla } from '../engine/data/fighters/ayla';
import { getSpecialMoves } from '../engine/data/characters';
import { getAnimationManifest } from '../rendering/animations/characterAssets';
import { getAttackAnimationFrame, getClipFrames, getStateAnimationFrame, getTimedAnimationFrame, validateAnimationCoverage, validateAnimationManifest } from '../rendering/animations/AnimationPlayback';
import { arcadeOpponents, opponentFor } from '../scenes/matchSetup';
import { ArcadeController } from '../engine/combat/ArcadeController';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { TrainingSession } from '../training/TrainingSession';
import type { FrameInput } from '../input/types';

describe('Gris e seleção por modo', () => {
  it('mantém os cortes legíveis no contato e no seguimento, sem voltar imediatamente à guarda', () => {
    const state = new Simulation(createGameConfig(1024, 576), [gris, ayla]).snapshot().characters[0];
    for (const id of ['standing-rp', 'crouching-rp', 'air-rp', 'golden-arc', 'rising-shear', 'silk-step', 'royal-cleave']) {
      const move = gris.moves.find(move => move.id === id)!;
      const active = manifest.clips.find(clip => clip.key === `gris-${id}-active`)!;
      const recovery = manifest.clips.find(clip => clip.key === `gris-${id}-recovery`)!;
      const contact = getClipFrames(active);
      expect(contact).toHaveLength(1);
      const following = getClipFrames(recovery);
      const extended = new Set([...contact, following[0]]);
      let visible = 0;
      for (let elapsed = move.startup; elapsed < move.startup + move.activeFrames + move.recovery; elapsed++) {
        const mode = elapsed < move.startup + move.activeFrames ? 'active' : 'recovery';
        const frame = getAttackAnimationFrame({ ...state, mode, attack: {
          moveId: id, buttons: move.input.buttons, elapsedFrames: elapsed, hasHit: false, preciseExecution: false,
        } }, mode === 'active' ? active : recovery, move)!;
        if (extended.has(frame)) visible++;
      }
      expect(visible, id).toBeGreaterThanOrEqual(12);
      expect(following[0], id).not.toBe(following[following.length - 1]);
    }
  });
  it('retorna pelos quadros intermediários dos loops e respeita os mesmos holds no menu e na arena', () => {
    const state = new Simulation(createGameConfig(1024, 576), [gris, ayla]).snapshot().characters[0];
    for (const name of ['idle', 'walk', 'crouch', 'dash']) {
      const clip = manifest.clips.find(clip => clip.key === `gris-${name}`)!;
      const frames = getClipFrames(clip);
      const durations = clip.frameDurations!;
      expect(durations).toHaveLength(frames.length);
      for (let i = 0; i < frames.length; i++) expect(Math.abs(frames[i] - frames[(i + 1) % frames.length])).toBeLessThanOrEqual(1);
      const cycle = durations.reduce((sum, value) => sum + value, 0);
      for (let t = 0; t < cycle * 2; t++) {
        expect(getStateAnimationFrame({ ...state, stateStartedFrame: 0 }, clip, t)).toBe(getTimedAnimationFrame(clip, t));
      }
      expect(getTimedAnimationFrame(clip, cycle)).toBe(frames[0]);
    }
    expect(manifest.clips.find(clip => clip.key === 'gris-idle')!.frameDurations!.reduce((sum, n) => sum + n, 0)).toBeGreaterThanOrEqual(48);
  });
  it('separa a extensão dos chutes dos quadros de recolhimento e preparação', () => {
    const frames = catalog as Record<string, { name: string }>;
    for (const [move, contact] of [['standing-lk', 'gris-standing-lk-01'], ['crouching-lk', 'gris-crouching-lk-02']]) {
      const clip = manifest.clips.find(clip => clip.key === `gris-${move}-active`)!;
      expect(getClipFrames(clip).map(frame => frames[String(frame)].name)).toEqual([contact]);
    }
  });
  it('possui livro, velocidades, colisões e quantidade de especiais próprios', () => {
    expect(getSpecialMoves(gris)).toHaveLength(4);
    expect(getSpecialMoves(ayla).some(move => move.combat?.reference?.command === 'f,n,d,df:2')).toBe(true);
    expect(getSpecialMoves(ayla).length).not.toBe(getSpecialMoves(gris).length);
    expect(gris.movement).not.toEqual(ayla.movement);
    expect(gris.collision).not.toEqual(ayla.collision);
    expect(new Set(gris.moves.map(m => m.id)).size).toBe(gris.moves.length);
    for (const move of gris.moves) expect(move.hitbox.width * move.hitbox.height).toBeGreaterThan(0);
    for (const move of gris.moves) {
      expect(move.balanceReference, move.id).toMatchObject({ game: 'Tekken 7', character: 'Noctis' });
      expect(move.balanceReference?.url).toContain('/data/json/noctis.json');
      expect(move.balanceReference?.adaptation.length).toBeGreaterThan(20);
    }
  });
  it('confirma a string local 1,2 inspirada na string de Noctis', () => {
    const sim = new Simulation(createGameConfig(1024, 576), [gris, ayla], { training: true, initialDistance: 45 });
    const neutral: FrameInput = { direction: 'N', buttons: new Set() };
    sim.stepFrame([{ direction: 'N', buttons: new Set(['1']) }, neutral]);
    for (let frame = 0; frame < 30 && sim.snapshot().recentContacts.length === 0; frame += 1) sim.stepFrame([neutral, neutral]);
    expect(sim.snapshot().recentContacts[0]?.event.moveId).toBe('standing-lp');
    sim.stepFrame([{ direction: 'N', buttons: new Set(['2']) }, neutral]);
    expect(sim.snapshot().characters[0].attack?.moveId).toBe('standing-rp');
  });
  it('cobre todos os estados e as três fases de todos os golpes', () => {
    expect(getAnimationManifest('gris')).toEqual(manifest);
    expect(() => validateAnimationManifest(manifest)).not.toThrow();
    expect(() => validateAnimationCoverage(manifest, 'gris', gris.moves)).not.toThrow();
    const frames = catalog as Record<string, { goldPixels: number; weaponReviewed: boolean; sheet: string }>;
    for (const clip of manifest.clips) for (const frame of getClipFrames(clip)) {
      expect(frames[String(frame)].goldPixels).toBeGreaterThan(300);
      if (!clip.key.includes('-fx-')) expect(frames[String(frame)].weaponReviewed).toBe(true);
    }
  });
  it('mantém a arma nos quadros corporais e usa energia independente para o projétil', () => {
    const move = gris.moves.find(m => m.projectile)!;
    expect(move.projectile?.animationId).toBe('fx-golden-arc');
    const fx = manifest.clips.find(c => c.key === 'gris-fx-golden-arc')!;
    expect(getClipFrames(fx).every(f => (manifest.frameTextures as Record<string, string>)[String(f)] === 'gris-effects')).toBe(true);
    const melee = manifest.clips.find(c => c.key === 'gris-standing-rp-active')!;
    expect(getClipFrames(melee).every(f => (manifest.frameTextures as Record<string, string>)[String(f)] === 'gris-clean-standing-rp')).toBe(true);
  });
  it('define o segundo jogador sem uma seleção adicional e monta a sequência PvE', () => {
    expect(opponentFor('ayla', 'versus').id).toBe('gris');
    expect(opponentFor('gris', 'versus').id).toBe('ayla');
    expect(opponentFor('gris', 'training').id).toBe('tester');
    expect(arcadeOpponents('gris').map(f => f.id)).toEqual(['tester', 'ayla']);
    expect(arcadeOpponents('ayla').map(f => f.id)).toEqual(['tester', 'gris']);
  });
  it('executa ataques da Gris contra o jogador pelo mesmo parser e resolvedor', () => {
    const sim = new Simulation(createGameConfig(1024, 576), [ayla, gris], { training: true });
    const bot = new ArcadeController(gris, ayla); const neutral: FrameInput = { direction: 'N', buttons: new Set() };
    for (let i = 0; i < 600; i++) {
      const s = sim.snapshot(); sim.stepFrame([neutral, bot.readInput(s.frame, s.characters[1], s.characters[0], s.projectiles)]);
    }
    expect(sim.snapshot().characters[0].health).toBeLessThan(ayla.maxHealth);
    expect(sim.snapshot().recentContacts.some(({ event }) => event.attackerId === 'player-2' && gris.moves.some(m => m.id === event.moveId))).toBe(true);
  });
  it('o treino mantém guarda enquanto um projétil viaja após a recuperação do emissor', () => {
    const wave = ayla.moves.find(m => m.id === 'crimson-wave')!;
    const emitter = { ...ayla, moves: [{ ...wave, input: { buttons: ['1'] as const }, startup: 2, activeFrames: 1, recovery: 2 }] };
    const sim = new Simulation(createGameConfig(1024, 576), [emitter, gris]);
    const neutral: FrameInput = { direction: 'N', buttons: new Set() };
    sim.stepFrame([{ direction: 'N', buttons: new Set(['1']) }, neutral]);
    for (let i = 0; i < 8; i++)sim.stepFrame([neutral, neutral]);
    const s = sim.snapshot(); const training = new TrainingSession(); training.dummyMode = 'guard-low';
    expect(s.characters[0].attack).toBeUndefined(); expect(s.projectiles).toHaveLength(1);
    expect(training.dummyInput(s.frame, s.characters, s.projectiles)?.direction).toBe('DB');
  });
});
