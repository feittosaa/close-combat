import { describe, expect, it } from 'vitest';
import manifest from '../assets/animations/ayla.json';
import frameCatalog from '../assets/sprites/characters/ayla/runtime/frame-catalog.json';
import { ayla } from '../engine/data/fighters/ayla';
import { getAnimationManifest, preloadCharacter } from '../rendering/animations/characterAssets';
import type Phaser from 'phaser';
import { getCharacterAnimationKey } from '../rendering/animations/CharacterAnimationMap';
import { getClipFrames, validateAnimationCoverage, validateAnimationManifest } from '../rendering/animations/AnimationPlayback';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';

describe('arte jogável da Ayla', () => {
  it('mostra o pilar inteiro durante sua área de dano e mantém o pouso fora do contato do chute', () => {
    const catalog = frameCatalog as Record<string, { name: string; sourceRect: { w: number; h: number }; scale: number }>;
    const pillar = ayla.moves.find(move => move.id === 'ruby-eruption')!.projectile!;
    const effect = manifest.clips.find(clip => clip.key === `ayla-${pillar.animationId}`)!;
    for (const frame of getClipFrames(effect)) {
      const drawing = catalog[String(frame)];
      expect(drawing.sourceRect.h * drawing.scale).toBeGreaterThanOrEqual(pillar.hitbox.height * .9);
      expect(drawing.sourceRect.w * drawing.scale).toBeGreaterThanOrEqual(pillar.hitbox.width * .9);
    }
    const contact = manifest.clips.find(clip => clip.key === 'ayla-leaping-kick-active')!;
    expect(getClipFrames(contact).map(frame => catalog[String(frame)].name)).toEqual(['ayla-leaping-kick-03']);
  });
  it('carrega seu próprio manifesto e cobre estados, ataques e efeitos', () => {
    expect(getAnimationManifest('ayla')).toEqual(manifest);
    expect(() => validateAnimationManifest(manifest)).not.toThrow();
    expect(() => validateAnimationCoverage(manifest, 'ayla', ayla.moves)).not.toThrow();
    for (const move of ayla.moves) {
      if (move.projectile) expect(manifest.clips.some((c) => c.key === `ayla-${move.projectile!.animationId}`)).toBe(true);
    }
  });
  it('resolve cada golpe nas três fases para uma textura real do pacote', () => {
    const state = new Simulation(createGameConfig(1024, 576), [ayla, ayla]).snapshot().characters[0];
    const textures = new Set(manifest.textureSources.map((s) => s.key));
    for (const move of ayla.moves) for (const mode of ['startup', 'active', 'recovery'] as const) {
      const key = getCharacterAnimationKey({
        ...state, mode, attack: {
          moveId: move.id, elapsedFrames: 0,
          hasHit: false, preciseExecution: false, buttons: move.input.buttons
        }
      }, manifest.moveClips);
      const clip = manifest.clips.find((c) => c.key === key);
      expect(clip, key).toBeDefined();
      for (const frame of getClipFrames(clip!)) expect(textures.has(manifest.frameTextures[String(frame) as keyof typeof manifest.frameTextures])).toBe(true);
    }
  });
  it('usa contato isolado na rasteira, contato isolado na investida e vitória nova com solas completas', () => {
    const transform = manifest.frameTextures as Record<string, string>;
    for (const [key, texture] of [
      ['ayla-crouching-rk-active', 'ayla-sweep-contact'],
      ['ayla-scarlet-rush-active', 'ayla-rush-contact'],
      ['ayla-victory', 'ayla-cleanup'],
    ]) {
      const clip = manifest.clips.find((c) => c.key === key)!;
      expect(getClipFrames(clip).every((f) => transform[String(f)] === texture)).toBe(true);
    }
  });
  it('continua aceitando o personagem de desenvolvimento Dummy com cobertura explícita', () => {
    const dummy = getAnimationManifest('dummy');
    expect(() => validateAnimationManifest(dummy)).not.toThrow();
    expect(dummy.clips.some((c) => c.key === 'dummy-idle')).toBe(true);
  });
  it('carrega apenas a textura da guarda no menu e os atlas completos antes da luta', () => {
    const loaded: string[] = [];
    const scene = { textures: { exists: () => false }, load: {
      atlas: (key: string, url: string, atlas: object) => {
        expect(url).toBeTruthy(); expect(atlas).toHaveProperty('frames'); loaded.push(key);
      },
    } } as unknown as Phaser.Scene;
    preloadCharacter(scene, 'ayla', true);
    expect(loaded).toEqual(['ayla-movement']);
    loaded.length = 0;
    preloadCharacter(scene, 'gris', true);
    expect(loaded).toEqual(['gris-movement']);
    loaded.length = 0;
    preloadCharacter(scene, 'gris');
    expect(loaded).toHaveLength(13);
    expect(loaded).toContain('gris-effects');
  });
});
