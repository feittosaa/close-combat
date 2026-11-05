import { RAGE_LEVEL } from '../engine/combat/rage';
import type Phaser from 'phaser';
import type { SimulationSnapshot } from '../engine/simulation/Simulation';
import { getCharacterById } from '../engine/data/characters';
import { getCowboySpriteLayers } from '../rendering/animations/cowboySprites';
import { COWBOY_GRAB_SHOTS } from '../engine/combat/cowboyGrab';

const files = import.meta.glob<string>('../assets/audio/effects/*.wav', { eager: true, query: '?url', import: 'default' });
const variants = {
  block: ['block_1'], perfect_block: ['perfect_block_1', 'perfect_block_2'],
  hit: ['hit_1', 'hit_2', 'hit_3'],
  heavy_hit: ['heavy_hit_1', 'heavy_hit_2', 'heavy_hit_3', 'heavy_hit_4'],
  magical_arms: ['magical_arms_1', 'magical_arms_2'], magical_shot: ['magical_shot_1', 'magical_shot_2', 'magical_shot_3', 'magical_shot_4'],
  landing: ['landing_1', 'landing_2', 'landing_3', 'landing_4', 'landing_5'], counter_hit: ['counter_hit_1', 'counter_hit_2', 'counter_hit_3'],
  steps: ['steps_1', 'steps_2', 'steps_3', 'steps_4', 'steps_5'],
  heavy_step: ['heavy_step_1', 'heavy_step_2', 'heavy_step_3', 'heavy_step_4'],
  magic_explosion: ['magic_explosion_1', 'magic_explosion_2'], start_fight: ['start_fight_1', 'start_fight_2', 'start_fight_3'],
  push_hit: ['push_hit_1', 'push_hit_2'], combo_breaker: ['combo_breaker_1', 'combo_breaker_2'],
  grab: ['grab_1', 'grab_2'], throw: ['throw_1', 'throw_2'],
  kick_on_the_ground: ['kick_on_the_ground_1', 'kick_on_the_ground_2'],
  dash: ['dash_1', 'dash_2'], air_dash: ['air_dash_1', 'air_dash_2', 'air_dash_3', 'air_dash_4'],
  lace_error: ['lace_error'], ultimate_ready: ['ultimate_ready'], round_start: ['round_start'], final_round: ['final_round'],
  victory: ['victory'], defeat: ['defeat'],
  lace_draw: ['lace_draw'], lace_catch: ['lace_catch'], pistol_draw: ['pistol_draw'],
  ultimate_activation: ['ultimate_activation'], lose_arcade_mode: ['lose_arcade_mode'], round_timeout: ['round_timeout'],
  round_win: ['round_win'], urgent_10_seconds_left: ['urgent_10_seconds_left'],
} as const;
type Effect = keyof typeof variants;
const volumes: Partial<Record<Effect, number>> = {
  dash: .2, air_dash: .2, magical_shot: .392, magical_arms: .8, steps: .2, heavy_step: .2, hit: 1.15, heavy_hit: 1.15, block: 1.15, perfect_block: 1.15,
};
// Keep 25 ms before each measured waveform peak to retain the impact's attack.
const impactSeek: Readonly<Record<string, number>> = {
  heavy_hit_1: .295, heavy_hit_2: .022, heavy_hit_3: .606, heavy_hit_4: .400,
  landing_1: .275, landing_2: .386, landing_3: .510, landing_4: .405, landing_5: .989,
  heavy_step_1: .205, heavy_step_2: .215, heavy_step_3: .215,
  lace_error: .415,
  steps_5: .315, air_dash_1: .135, air_dash_3: .385, air_dash_4: .135,
  magical_shot_3: .215, magical_shot_4: .245, magical_arms_1: .365,
  push_hit_1: .495, push_hit_2: .285, counter_hit_3: .285,
  combo_breaker_1: .295, combo_breaker_2: .195, grab_1: .325, grab_2: .225,
  block_1: .045, hit_3: .045, counter_hit_1: .065, counter_hit_2: .025,
  steps_1: .045, air_dash_2: .085, magical_shot_1: .035, magical_shot_2: .095,
  lace_draw: .065, lace_catch: .065, kick_on_the_ground_2: .015, magic_explosion_1: .015,
};
const PISTOL_DRAW_DELAY = 42;

export function selectSoundVariant(count: number, random = Math.random()): number {
  const weights = count === 5 ? [50, 25, 15, 5, 5] : [50, 25, 15, 10];
  const total = weights.slice(0, count).reduce((sum, weight) => sum + weight, 0);
  let value = Math.max(0, Math.min(random, 1 - Number.EPSILON)) * total;
  for (let i = 0; i < count; i++) { value -= weights[i]; if (value < 0) return i + 1; }
  return count;
}

export function preloadFightSounds(scene: Phaser.Scene): void {
  for (const [path, url] of Object.entries(files)) {
    const key = `sfx-${path.split('/').pop()!.replace('.wav', '')}`;
    if (!scene.cache.audio.exists(key)) scene.load.audio(key, url);
  }
}

/** Presentation-only observer, sampled after each simulation tick. */
export class FightSounds {
  private arms = new Map<string, boolean>();
  private projectiles = new Set<number>();
  private explosions = new Set<number>();
  private grabShots = new Set<string>();
  private grounded = new Map<string, boolean>();
  private lastSteps = new Map<string, number>();
  private lassoActive = new Set<string>();
  private lassoCaptures = new Map<string, number>();
  private grabCaptures = new Map<string, number>();
  private lassoHits = new Set<string>();
  private lassoMisses = new Set<string>();
  private kickFrames = new Map<string, number>();
  private dashing = new Set<string>();
  private ultimateReady = new Set<string>();
  private taunts = new Map<string, number>();
  private pendingDraws = new Map<string, { due: number; kind: 'taunt' | 'ultimate'; started?: number }>();
  private ultimateOwners = new Set<string>();
  private warned = false;
  private resultPlayed = false;
  private victoryAt?: number;
  private matchResultAt?: number;
  private round = 0;
  private announcedRound = 0;
  private arcadeLossPlayed = false;
  constructor(private readonly scene: Phaser.Scene, private readonly training = false, private readonly arcade = false, private readonly winsToFinish = 2) {}
  reset(): void {
    this.arms.clear(); this.projectiles.clear(); this.explosions.clear(); this.grabShots.clear(); this.grounded.clear(); this.lastSteps.clear();
    this.lassoActive.clear(); this.lassoCaptures.clear(); this.grabCaptures.clear(); this.lassoHits.clear(); this.lassoMisses.clear(); this.kickFrames.clear(); this.dashing.clear(); this.ultimateReady.clear(); this.taunts.clear(); this.pendingDraws.clear();
    this.ultimateOwners.clear(); this.warned = false; this.resultPlayed = false; this.victoryAt = undefined; this.matchResultAt = undefined; this.round = 0; this.announcedRound = 0; this.arcadeLossPlayed = false;
  }
  private play(effect: Effect): void {
    const choices: readonly string[] = variants[effect];
    const name = choices[selectSoundVariant(choices.length) - 1];
    const key = `sfx-${name}`;
    const seek = impactSeek[name];
    if (this.scene.cache.audio.exists(key)) this.scene.sound.play(key, { volume: volumes[effect] ?? 1, ...(seek ? { seek } : {}) });
  }
  prepareRound(snapshot: SimulationSnapshot): void {
    if (this.training || snapshot.round === this.announcedRound) return;
    this.announcedRound = snapshot.round;
    if (snapshot.round > 1 && snapshot.roundWins.every(wins => wins === this.winsToFinish - 1)) this.play('final_round');
    else this.play('round_start');
  }
  observe(snapshot: SimulationSnapshot): void {
    if (snapshot.round !== this.round) {
      const announced = this.announcedRound;
      this.reset(); this.announcedRound = announced; this.round = snapshot.round;
      if (!this.training) this.play('start_fight');
    }
    if (this.arcade && !this.arcadeLossPlayed && snapshot.phase === 'match-over' && snapshot.matchWinnerId === 'player-2') {
      this.arcadeLossPlayed = true; this.play('lose_arcade_mode');
    }
    if (!this.training && !this.warned && snapshot.phase === 'fight' && snapshot.roundFramesRemaining > 0 && snapshot.roundFramesRemaining <= 600) {
      this.warned = true; this.play('urgent_10_seconds_left');
    }
    if (!this.resultPlayed && snapshot.phase !== 'fight') {
      this.resultPlayed = true;
      if (snapshot.roundEndReason === 'time' || (snapshot.roundEndReason === 'draw' && snapshot.roundFramesRemaining === 0)) this.play('round_timeout');
      if (snapshot.roundWinnerId) this.victoryAt = snapshot.elapsedFrames + 45;
      if (snapshot.roundWinnerId && snapshot.roundWins.some(wins => wins >= this.winsToFinish)) this.matchResultAt = snapshot.elapsedFrames + 160;
    }
    if (this.victoryAt !== undefined && snapshot.elapsedFrames >= this.victoryAt) {
      this.victoryAt = undefined; this.play('round_win');
    }
    if (this.matchResultAt !== undefined && snapshot.elapsedFrames >= this.matchResultAt) {
      this.matchResultAt = undefined; this.play(snapshot.roundWinnerId === snapshot.characters[0].characterId ? 'victory' : 'defeat');
    }
    const owners = new Set(snapshot.ultimateActivation?.ownerIds ?? []);
    for (const ownerId of owners) if (!this.ultimateOwners.has(ownerId)) {
      this.play('ultimate_activation');
      if (snapshot.characters.find(character => character.characterId === ownerId)?.fighterId === 'cowboy') {
        this.pendingDraws.set(ownerId, { due: snapshot.elapsedFrames + PISTOL_DRAW_DELAY, kind: 'ultimate' });
      }
    }
    this.ultimateOwners = owners;
    const activeExplosions = new Set(snapshot.explosions.filter(explosion => explosion.kind === 'dynamite' && explosion.id !== undefined).map(explosion => explosion.id!));
    for (const id of activeExplosions) if (!this.explosions.has(id)) this.play('magic_explosion');
    this.explosions = activeExplosions;
    for (const event of snapshot.hitEvents) {
      if (event.outcome === 'block') { this.play(event.perfectBlock ? 'perfect_block' : 'block'); continue; }
      const attacker = snapshot.characters.find(character => character.characterId === event.attackerId);
      const move = attacker && getCharacterById(attacker.fighterId)?.moves.find(candidate => candidate.id === event.moveId);
      const heavy = move && (move.category === 'special' || move.category === 'ultimate' || move.input.buttons.includes('2') || move.input.buttons.includes('4'));
      if (move?.category === 'throw') { if (attacker?.fighterId !== 'cowboy') this.play('grab'); this.play('throw'); }
      if (event.moveId === 'crouch-heavy-kick' && attacker?.fighterId === 'cowboy') this.play('kick_on_the_ground');
      this.play(event.moveId === 'push-away' && attacker?.fighterId === 'cowboy' ? 'push_hit' : heavy ? 'heavy_hit' : 'hit');
      if (event.context === 'counter-hit') this.play('counter_hit');
    }
    for (const character of snapshot.characters) {
      const ready = character.maxRage > 0 && character.rage >= RAGE_LEVEL;
      if (ready && !this.ultimateReady.has(character.characterId)) this.play('ultimate_ready');
      if (ready) this.ultimateReady.add(character.characterId); else this.ultimateReady.delete(character.characterId);
      if (character.mode === 'dashing') {
        if (!this.dashing.has(character.characterId) && !character.grounded) this.play('air_dash');
        this.dashing.add(character.characterId);
      } else if (this.dashing.delete(character.characterId) && character.fighterId === 'cowboy' && character.grounded &&
        this.grounded.get(character.characterId) === true && snapshot.phase === 'fight') this.play('heavy_step');
      if (this.grounded.get(character.characterId) === false && character.grounded) this.play('landing');
      this.grounded.set(character.characterId, character.grounded);
      if (snapshot.phase === 'fight' && character.grounded && character.mode === 'moving') {
        const last = this.lastSteps.get(character.characterId);
        if (last === undefined || snapshot.frame - last >= 20 || snapshot.frame < last) {
          this.play(character.fighterId === 'grappler' ? 'heavy_step' : 'steps');
          this.lastSteps.set(character.characterId, snapshot.frame);
        }
      } else this.lastSteps.delete(character.characterId);
      if (character.fighterId !== 'cowboy') continue;
      const attack = character.attack;
      if (attack?.moveId === 'light-kick') {
        const previous = this.kickFrames.get(character.characterId);
        const impact = attack.startupFrames ?? getCharacterById('cowboy')!.moves.find(move => move.id === 'light-kick')!.startup;
        if (attack.elapsedFrames >= impact && (previous === undefined || previous < impact || previous > attack.elapsedFrames)) this.play('heavy_step');
        this.kickFrames.set(character.characterId, attack.elapsedFrames);
      } else this.kickFrames.delete(character.characterId);
      if (character.tauntStartedFrame !== undefined && this.taunts.get(character.characterId) !== character.tauntStartedFrame) {
        this.taunts.set(character.characterId, character.tauntStartedFrame);
        this.pendingDraws.set(character.characterId, { due: snapshot.elapsedFrames + PISTOL_DRAW_DELAY, kind: 'taunt', started: character.tauntStartedFrame });
      }
      const draw = this.pendingDraws.get(character.characterId);
      if (draw) {
        const active = draw.kind === 'taunt' ? character.tauntStartedFrame === draw.started :
          Boolean(snapshot.ultimateActivation?.ownerIds.includes(character.characterId));
        if (!active) this.pendingDraws.delete(character.characterId);
        else if (snapshot.elapsedFrames >= draw.due) { this.pendingDraws.delete(character.characterId); this.play('pistol_draw'); }
      }
      if (attack?.throwCapturedFrame !== undefined && this.grabCaptures.get(character.characterId) !== attack.throwCapturedFrame) {
        this.grabCaptures.set(character.characterId, attack.throwCapturedFrame); this.play('grab');
      }
      if (attack?.moveId === 'throw-13') {
        if (!this.lassoActive.has(character.characterId)) {
          this.lassoActive.add(character.characterId); this.play('lace_draw');
        }
        if (attack.throwCapturedFrame !== undefined && this.lassoCaptures.get(character.characterId) !== attack.throwCapturedFrame) {
          this.lassoCaptures.set(character.characterId, attack.throwCapturedFrame); this.lassoHits.add(character.characterId); this.play('lace_catch');
        }
        const move = getCharacterById('cowboy')!.moves.find(candidate => candidate.id === 'throw-13')!;
        if (attack.elapsedFrames >= (attack.startupFrames ?? move.startup) + move.activeFrames && !this.lassoHits.has(character.characterId) && !this.lassoMisses.has(character.characterId)) {
          this.lassoMisses.add(character.characterId); this.play('lace_error');
        }
      } else if (this.lassoActive.delete(character.characterId)) {
        this.lassoHits.delete(character.characterId); this.lassoMisses.delete(character.characterId);
      }
      const layers = getCowboySpriteLayers(character, snapshot.frame);
      const materialized = layers.some(layer => layer.texture.startsWith('cowboy-magic-')) ||
        Boolean(attack?.moveId === 'bulls-eye' && !snapshot.ultimateActivation);
      if (materialized && !this.arms.get(character.characterId)) this.play('magical_arms');
      this.arms.set(character.characterId, materialized);
      if (attack?.projectileId !== undefined && !this.projectiles.has(attack.projectileId)) {
        this.projectiles.add(attack.projectileId);
        const move = getCharacterById('cowboy')?.moves.find(candidate => candidate.id === attack.moveId);
        if (move?.projectile?.visual === 'bullet') this.play('magical_shot');
      }
      if (attack?.moveId === 'throw-24' && attack.throwConfirmedFrame !== undefined) {
        const age = snapshot.frame - attack.throwConfirmedFrame;
        for (const [index, shotFrame] of COWBOY_GRAB_SHOTS.entries()) {
          const id = `${character.characterId}:${attack.throwConfirmedFrame}:${index}`;
          if (age >= shotFrame && !this.grabShots.has(id)) { this.grabShots.add(id); this.play('magical_shot'); }
        }
      }
    }
  }
}
