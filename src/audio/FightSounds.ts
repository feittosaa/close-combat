import type Phaser from 'phaser';
import type { SimulationSnapshot } from '../engine/simulation/Simulation';
import { getCharacterById } from '../engine/data/characters';
import { getCowboySpriteLayers } from '../rendering/animations/cowboySprites';
import { COWBOY_GRAB_SHOTS } from '../engine/combat/cowboyGrab';

const files = import.meta.glob<string>('../assets/audio/effects/*.wav', { eager: true, query: '?url', import: 'default' });
const variants = {
  block: ['block_1', 'block_2'], perfect_block: ['perfect_block_1', 'perfect_block_2'],
  hit: ['hit_1', 'hit_2', 'hit_3', 'hit_4', 'hit_6'],
  heavy_hit: ['heavy_hit_1', 'heavy_hit_2', 'heavy_hit_3', 'heavy_hit_4'],
  magical_arms: ['magical_arms_1', 'magical_arms_2'], magical_shot: ['magical_shot_1', 'magical_shot_2', 'magical_shot_3', 'magical_shot_4'],
  landing: ['landing_1', 'landing_2', 'landing_3'], counter_hit: ['counter_hit_1', 'counter_hit_2', 'counter_hit_3'],
  push_hit: ['push_hit_1', 'push_hit_2'], combo_breaker: ['combo_breaker_1', 'combo_breaker_2'],
  lace_draw: ['lace_draw'], lace_catch: ['lace_catch'], pistol_draw: ['pistol_draw'],
  ultimate_activation: ['ultimate_activation'], knockout_lose: ['knockout_lose'], round_timeout: ['round_timeout'],
  round_win: ['round_win'], urgent_10_seconds_left: ['urgent_10_seconds_left'],
} as const;
type Effect = keyof typeof variants;
const volumes: Partial<Record<Effect, number>> = {
  magical_shot: .7, hit: 1.15, heavy_hit: 1.15, block: 1.15, perfect_block: 1.15,
};
// Keep 25 ms before each measured waveform peak to retain the impact's attack.
const impactSeek: Readonly<Record<string, number>> = {
  heavy_hit_2: .022, heavy_hit_3: .739, heavy_hit_4: .400,
};
const PISTOL_DRAW_DELAY = 36;

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
  private grabShots = new Set<string>();
  private grounded = new Map<string, boolean>();
  private lassoActive = new Set<string>();
  private lassoCaptures = new Map<string, number>();
  private taunts = new Map<string, number>();
  private pendingDraws = new Map<string, { due: number; kind: 'taunt' | 'ultimate'; started?: number }>();
  private ultimateActive = false;
  private warned = false;
  private resultPlayed = false;
  private victoryAt?: number;
  private round = 0;
  constructor(private readonly scene: Phaser.Scene, private readonly training = false) {}
  reset(): void {
    this.arms.clear(); this.projectiles.clear(); this.grabShots.clear(); this.grounded.clear();
    this.lassoActive.clear(); this.lassoCaptures.clear(); this.taunts.clear(); this.pendingDraws.clear();
    this.ultimateActive = false; this.warned = false; this.resultPlayed = false; this.victoryAt = undefined; this.round = 0;
  }
  private play(effect: Effect): void {
    const choices: readonly string[] = variants[effect];
    const name = choices[selectSoundVariant(choices.length) - 1];
    const key = `sfx-${name}`;
    const seek = impactSeek[name];
    if (this.scene.cache.audio.exists(key)) this.scene.sound.play(key, { volume: volumes[effect] ?? 1, ...(seek ? { seek } : {}) });
  }
  observe(snapshot: SimulationSnapshot): void {
    if (snapshot.round !== this.round) { this.reset(); this.round = snapshot.round; }
    if (!this.training && !this.warned && snapshot.phase === 'fight' && snapshot.roundFramesRemaining > 0 && snapshot.roundFramesRemaining <= 600) {
      this.warned = true; this.play('urgent_10_seconds_left');
    }
    if (!this.resultPlayed && snapshot.phase !== 'fight') {
      this.resultPlayed = true;
      if (snapshot.roundEndReason === 'knockout' || (snapshot.roundEndReason === 'draw' && snapshot.characters.some(c => c.health === 0))) this.play('knockout_lose');
      else if (snapshot.roundEndReason === 'time' || (snapshot.roundEndReason === 'draw' && snapshot.roundFramesRemaining === 0)) this.play('round_timeout');
      if (snapshot.roundWinnerId) this.victoryAt = snapshot.elapsedFrames + 45;
    }
    if (this.victoryAt !== undefined && snapshot.elapsedFrames >= this.victoryAt) {
      this.victoryAt = undefined; this.play('round_win');
    }
    if (snapshot.ultimateActivation && !this.ultimateActive) {
      this.play('ultimate_activation');
      for (const character of snapshot.characters) {
        if (character.fighterId === 'cowboy' && snapshot.ultimateActivation.ownerIds.includes(character.characterId)) {
          this.pendingDraws.set(character.characterId, { due: snapshot.elapsedFrames + PISTOL_DRAW_DELAY, kind: 'ultimate' });
        }
      }
    }
    this.ultimateActive = Boolean(snapshot.ultimateActivation);
    for (const event of snapshot.hitEvents) {
      if (event.outcome === 'block') { this.play(event.perfectBlock ? 'perfect_block' : 'block'); continue; }
      const attacker = snapshot.characters.find(character => character.characterId === event.attackerId);
      const move = attacker && getCharacterById(attacker.fighterId)?.moves.find(candidate => candidate.id === event.moveId);
      const heavy = move && (move.category === 'special' || move.category === 'ultimate' || move.input.buttons.includes('2') || move.input.buttons.includes('4'));
      if (event.damage > 0) {
        this.play(event.moveId === 'push-away' && attacker?.fighterId === 'cowboy' ? 'push_hit' : heavy ? 'heavy_hit' : 'hit');
        if (event.context === 'counter-hit') this.play('counter_hit');
      }
    }
    for (const character of snapshot.characters) {
      if (this.grounded.get(character.characterId) === false && character.grounded) this.play('landing');
      this.grounded.set(character.characterId, character.grounded);
      if (character.fighterId !== 'cowboy') continue;
      const attack = character.attack;
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
      if (attack?.moveId === 'throw-13') {
        if (!this.lassoActive.has(character.characterId)) {
          this.lassoActive.add(character.characterId); this.play('lace_draw');
        }
        if (attack.throwCapturedFrame !== undefined && this.lassoCaptures.get(character.characterId) !== attack.throwCapturedFrame) {
          this.lassoCaptures.set(character.characterId, attack.throwCapturedFrame); this.play('lace_catch');
        }
      } else this.lassoActive.delete(character.characterId);
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
