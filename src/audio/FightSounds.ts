import type Phaser from 'phaser';
import type { SimulationSnapshot } from '../engine/simulation/Simulation';
import { getCharacterById } from '../engine/data/characters';
import { getCowboySpriteLayers } from '../rendering/animations/cowboySprites';

const files = import.meta.glob<string>('../assets/audio/effects/*.wav', { eager: true, query: '?url', import: 'default' });
const variants = { block: 2, perfect_block: 2, hit: 4, heavy_hit: 2, magical_arms: 2, magical_shot: 4 } as const;
type Effect = keyof typeof variants;
const weights = [50, 25, 15, 10];
const volumes: Record<Effect, number> = {
  magical_shot: .7, magical_arms: 1, hit: 1.15, heavy_hit: 1.15, block: 1.15, perfect_block: 1.15,
};

export function selectSoundVariant(count: number, random = Math.random()): number {
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
  private confirmedThrows = new Map<string, number>();
  private round = 0;
  constructor(private readonly scene: Phaser.Scene) {}
  reset(): void { this.arms.clear(); this.projectiles.clear(); this.confirmedThrows.clear(); this.round = 0; }
  private play(effect: Effect): void {
    const key = `sfx-${effect}_${selectSoundVariant(variants[effect])}`;
    if (this.scene.cache.audio.exists(key)) this.scene.sound.play(key, { volume: volumes[effect] });
  }
  observe(snapshot: SimulationSnapshot): void {
    if (snapshot.round !== this.round) { this.reset(); this.round = snapshot.round; }
    for (const event of snapshot.hitEvents) {
      if (event.outcome === 'block') { this.play(event.perfectBlock ? 'perfect_block' : 'block'); continue; }
      const attacker = snapshot.characters.find(character => character.characterId === event.attackerId);
      const move = attacker && getCharacterById(attacker.fighterId)?.moves.find(candidate => candidate.id === event.moveId);
      const heavy = move && (move.category === 'special' || move.category === 'ultimate' || move.input.buttons.includes('2') || move.input.buttons.includes('4'));
      if (event.damage > 0) this.play(heavy ? 'heavy_hit' : 'hit');
    }
    for (const character of snapshot.characters) {
      if (character.fighterId !== 'cowboy') continue;
      const attack = character.attack;
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
      if (attack?.moveId === 'throw-24' && attack.throwConfirmedFrame !== undefined && this.confirmedThrows.get(character.characterId) !== attack.throwConfirmedFrame) {
        this.confirmedThrows.set(character.characterId, attack.throwConfirmedFrame);
        this.play('magical_shot'); this.play('magical_shot');
      }
    }
  }
}
