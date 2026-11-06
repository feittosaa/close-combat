import Phaser from 'phaser';

const fragment = `
precision mediump float;
uniform sampler2D uMainSampler;
uniform float uPalette;
varying vec2 outTexCoord;

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
void main() {
  vec4 source = texture2D(uMainSampler, outTexCoord);
  if (source.a < 0.001 || uPalette < 0.5) { gl_FragColor = source; return; }
  vec3 color = source.rgb / source.a;
  if (uPalette > 3.5) { gl_FragColor = vec4(color * vec3(0.72, 0.5, 1.0) * source.a, source.a); return; }
  vec3 v = hsv(color);
  if (uPalette < 1.5 && v.x >= 27.0 && v.x <= 56.0 && v.y >= 0.38 && v.z < 0.745 && v.z > 0.078) {
    // Saturated orange at the low hue edge is blond hair or straw, not shirt: fade it out instead of cutting.
    float shirt = max(smoothstep(30.0, 35.0, v.x), 1.0 - smoothstep(0.6, 0.72, v.y));
    vec3 red = rgb(vec3(mod(355.0 + (v.x - 40.0) * 0.35, 360.0), max(v.y, 0.9), min(v.z * 1.15, 1.0)));
    gl_FragColor = vec4(mix(color, red, shirt) * source.a, source.a);
    return;
  }
  else if (uPalette < 2.5 && uPalette > 1.5) {
    if (v.x >= 160.0 && v.x <= 255.0 && v.y >= 0.1) {
      v.x += 55.0;
      gl_FragColor = vec4(rgb(v) * source.a, source.a);
      return;
    }
    float warm = max(1.0 - smoothstep(34.0, 44.0, v.x), smoothstep(292.0, 307.0, v.x));
    float red = max(1.0 - smoothstep(8.0, 24.0, v.x), smoothstep(292.0, 307.0, v.x));
    float dark = warm * smoothstep(0.18, 0.35, v.y) * (1.0 - smoothstep(0.69, 0.82, v.z));
    float weight = max(dark, red * smoothstep(0.35, 0.6, v.y));
    gl_FragColor = vec4(mix(color, vec3(v.z * 0.3), weight) * source.a, source.a);
    return;
  }
  else if (uPalette > 2.5 && v.x >= 160.0 && v.x <= 255.0 && v.y >= 0.1)
    v.x += 55.0;
  else { gl_FragColor = source; return; }
  gl_FragColor = vec4(rgb(v) * source.a, source.a);
}`;

const lightFragment = `
precision mediump float;
uniform sampler2D uMainSampler;
uniform float uExposure;
uniform vec3 uShadow;
uniform float uOcclusion;
uniform float uWarmth;
varying vec2 outTexCoord;
void main() {
  vec4 source = texture2D(uMainSampler, outTexCoord);
  if (source.a < 0.001) { gl_FragColor = source; return; }
  vec3 c = source.rgb / source.a;
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  // Deep tones receive the ambient occlusion: they take the stage's shadow colour and are deepened, so no hue is rotated.
  float shade = 1.0 - smoothstep(0.05, 0.7, lum);
  c *= mix(vec3(1.0), uShadow, shade);
  c *= 1.0 - uOcclusion * shade;
  c *= uExposure;
  // Flame light only warms the lit surfaces.
  c += vec3(1.0, 0.62, 0.3) * uWarmth * lum * lum * 0.35;
  gl_FragColor = vec4(min(c, vec3(1.0)) * source.a, source.a);
}`;

export interface StageLightPipeline { exposure: number; shadow: readonly [number, number, number]; occlusion: number; warmth: number }

export function registerCharacterPalette(scene: Phaser.Scene): void {
  if (scene.game?.renderer?.type === Phaser.WEBGL) {
    class CharacterPalettePipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
      palette = 0;
      constructor(game: Phaser.Game) { super({ game, fragShader: fragment }); }
      onDraw(target: Phaser.Renderer.WebGL.RenderTarget): void {
        this.set1f('uPalette', this.palette);
        this.bindAndDraw(target);
      }
    }
    class StageLightPostPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline implements StageLightPipeline {
      exposure = 1; shadow: readonly [number, number, number] = [1, 1, 1]; occlusion = 0; warmth = 0;
      constructor(game: Phaser.Game) { super({ game, fragShader: lightFragment }); }
      onDraw(target: Phaser.Renderer.WebGL.RenderTarget): void {
        this.set1f('uExposure', this.exposure);
        this.set3f('uShadow', this.shadow[0], this.shadow[1], this.shadow[2]);
        this.set1f('uOcclusion', this.occlusion);
        this.set1f('uWarmth', this.warmth);
        this.bindAndDraw(target);
      }
    }
    const pipelines = (scene.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer).pipelines;
    pipelines.addPostPipeline('character-palette', CharacterPalettePipeline);
    pipelines.addPostPipeline('stage-light', StageLightPostPipeline);
  }
}
