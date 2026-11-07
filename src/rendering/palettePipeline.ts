import Phaser from 'phaser';
import { CHARACTER_COLOR_PIPELINE, type CharacterColorData } from './characterColor';

/**
 * Phaser's multi-texture sprite shader with the palette and stage light applied to each sampled texel. One program
 * serves every coloured sprite: no sprite compiles a shader or allocates a framebuffer when it first appears.
 */
const fragment = `
#define SHADER_NAME CLOSE_COMBAT_CHARACTER_COLOR_FS
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uMainSampler[%count%];
uniform float uPalette;
uniform float uLit;
uniform float uExposure;
uniform vec3 uShadow;
uniform float uOcclusion;
uniform float uWarmth;
varying vec2 outTexCoord;
varying float outTexId;
varying float outTintEffect;
varying vec4 outTint;

// The colour rules keep the medium precision they were tuned and approved with; texture coordinates stay high.
precision mediump float;
vec3 hsv(vec3 c) {
  float hi = max(c.r, max(c.g, c.b));
  float lo = min(c.r, min(c.g, c.b));
  float d = hi - lo;
  float h = 0.0;
  if (d > 0.0001) {
    if (hi == c.r) h = mod((c.g - c.b) / d, 6.0);
    else if (hi == c.g) h = (c.b - c.r) / d + 2.0;
    else h = (c.r - c.g) / d + 4.0;
  }
  return vec3(h * 60.0, hi > 0.0 ? d / hi : 0.0, hi);
}
vec3 rgb(vec3 h) {
  vec3 k = mod(vec3(5.0, 3.0, 1.0) + h.x / 60.0, 6.0);
  return h.z - h.z * h.y * max(vec3(0.0), min(min(k, 4.0 - k), 1.0));
}
vec3 palette(vec3 color) {
  if (uPalette < 0.5) return color;
  if (uPalette > 3.5) return color * vec3(0.72, 0.5, 1.0);
  vec3 v = hsv(color);
  if (uPalette < 1.5) {
    if (v.x >= 27.0 && v.x <= 56.0 && v.y >= 0.38 && v.z < 0.745 && v.z > 0.078) {
      // Saturated orange at the low hue edge is blond hair or straw, not shirt: fade it out instead of cutting.
      float shirt = max(smoothstep(30.0, 35.0, v.x), 1.0 - smoothstep(0.6, 0.72, v.y));
      vec3 red = rgb(vec3(mod(355.0 + (v.x - 40.0) * 0.35, 360.0), max(v.y, 0.9), min(v.z * 1.15, 1.0)));
      return mix(color, red, shirt);
    }
    return color;
  }
  if (v.x >= 160.0 && v.x <= 255.0 && v.y >= 0.1) { v.x += 55.0; return rgb(v); }
  if (uPalette > 2.5) return color;
  float warm = max(1.0 - smoothstep(34.0, 44.0, v.x), smoothstep(292.0, 307.0, v.x));
  float red = max(1.0 - smoothstep(8.0, 24.0, v.x), smoothstep(292.0, 307.0, v.x));
  float dark = warm * smoothstep(0.18, 0.35, v.y) * (1.0 - smoothstep(0.69, 0.82, v.z));
  float weight = max(dark, red * smoothstep(0.35, 0.6, v.y));
  return mix(color, vec3(v.z * 0.3), weight);
}
vec3 light(vec3 c) {
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  // Deep tones receive the ambient occlusion: they take the stage's shadow colour and are deepened, so no hue is rotated.
  float shade = 1.0 - smoothstep(0.05, 0.7, lum);
  c *= mix(vec3(1.0), uShadow, shade);
  c *= 1.0 - uOcclusion * shade;
  c *= uExposure;
  // Flame light only warms the lit surfaces.
  c += vec3(1.0, 0.62, 0.3) * uWarmth * lum * lum * 0.35;
  return min(c, vec3(1.0));
}
/** The 8-bit value a framebuffer stores: the rules were approved on pixels already written to one. */
vec4 stored(vec4 c) { return floor(c * 255.0 + 0.5) / 255.0; }
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#endif
void main() {
  vec4 texture;
  %forloop%
  vec4 texel = vec4(outTint.bgr * outTint.a, outTint.a);
  vec4 color = texture * texel;
  if (outTintEffect == 1.0) color.rgb = mix(texture.rgb, outTint.bgr * outTint.a, texture.a);
  else if (outTintEffect == 2.0) color = texel;
  if (uPalette > 0.5 || uLit > 0.5) {
    // Same steps as the drawn sprite going through the palette and then the light: each reads the stored pixel.
    color = stored(color);
    if (uPalette > 0.5 && color.a >= 0.001) color = stored(vec4(palette(color.rgb / color.a) * color.a, color.a));
    if (uLit > 0.5 && color.a >= 0.001) color = vec4(light(color.rgb / color.a) * color.a, color.a);
  }
  gl_FragColor = color;
}`;

const sameColor = (a: CharacterColorData, b: CharacterColorData): boolean => a.palette === b.palette && a.lit === b.lit &&
  a.exposure === b.exposure && a.occlusion === b.occlusion && a.warmth === b.warmth && a.shadow.every((channel, index) => channel === b.shadow[index]);
const neutral: CharacterColorData = { palette: 0, lit: false, exposure: 1, shadow: [1, 1, 1], occlusion: 0, warmth: 0 };

/** Registers the shared colour pipeline once per game; compiling it here keeps that cost out of the fight. */
export function registerCharacterColor(scene: Phaser.Scene): void {
  const renderer = scene.game?.renderer;
  if (renderer?.type !== Phaser.WEBGL) return;
  const pipelines = (renderer as Phaser.Renderer.WebGL.WebGLRenderer).pipelines;
  if (pipelines.has(CHARACTER_COLOR_PIPELINE)) return;
  class CharacterColorPipeline extends Phaser.Renderer.WebGL.Pipelines.MultiPipeline {
    private current?: CharacterColorData;
    constructor(game: Phaser.Game) { super({ game, fragShader: fragment }); }
    override batchSprite(sprite: Phaser.GameObjects.Image, camera: Phaser.Cameras.Scene2D.Camera, parent?: Phaser.GameObjects.Components.TransformMatrix): void {
      const data = { ...neutral, ...sprite.pipelineData } as CharacterColorData;
      if (!this.current || !sameColor(this.current, data)) {
        // Sprites already batched keep the colour they were queued with.
        this.flush();
        this.set1f('uPalette', data.palette);
        this.set1f('uLit', data.lit ? 1 : 0);
        this.set1f('uExposure', data.exposure);
        this.set3f('uShadow', data.shadow[0], data.shadow[1], data.shadow[2]);
        this.set1f('uOcclusion', data.occlusion);
        this.set1f('uWarmth', data.warmth);
        this.current = data;
      }
      super.batchSprite(sprite, camera, parent);
    }
    override onBind(): void { this.current = undefined; }
  }
  pipelines.add(CHARACTER_COLOR_PIPELINE, new CharacterColorPipeline(scene.game));
}
