import Phaser from 'phaser';
import { CHARACTER_COLOR_PIPELINE, IDENTITY_CORRECTION, outlineTrim, sheetCorrection, type CharacterColorData, type SheetCorrection } from './characterColor';

/**
 * Phaser's multi-texture sprite shader with the uniform outline width, the sheet correction, the palette and the stage
 * light applied to each sampled texel, in that order. One program serves every coloured sprite:
 * no sprite compiles a shader or allocates a framebuffer when it first appears.
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
uniform float uCorrected;
uniform mat3 uCorrection;
uniform vec3 uOffset;
// Texels of outline to trim from the outside (negative: to grow outward), the frame's uv rectangle and the size of one
// texel, so neighbours are read from the same drawing only.
uniform float uTrim;
uniform vec4 uFrame;
uniform vec2 uTexel;
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
// Which pixels a palette recolours is read from the colour as drawn, before the sheet correction, since the ranges
// were tuned on it; the colour they take comes from the corrected one, so every sheet recolours the same areas.
vec3 palette(vec3 color, vec3 drawn) {
  if (uPalette < 0.5) return color;
  if (uPalette > 3.5 && uPalette < 4.5) return color * vec3(0.72, 0.5, 1.0);
  vec3 v = hsv(color);
  vec3 d = hsv(drawn);
  if (uPalette > 4.5) {
    // Only the neon orange and amber of the suit (fully saturated, unlike leather and skin) turn cyan, keeping light and shade.
    float weight = smoothstep(0.8, 0.86, d.y) * smoothstep(8.0, 14.0, d.x) * (1.0 - smoothstep(48.0, 58.0, d.x));
    return mix(color, rgb(vec3(190.0 + (v.x - 30.0) * 0.5, v.y, v.z)), weight);
  }
  if (uPalette < 1.5) {
    // The olive shirt, its shadows and the tie reach greener, duller tones in some sheets than in the idle.
    if (d.x >= 27.0 && d.x <= 90.0 && d.y >= (d.x > 56.0 ? 0.3 : 0.38) && d.z < 0.745 && d.z > 0.078) {
      // Saturated orange at the low hue edge is blond hair or straw, not shirt: fade it out instead of cutting; the
      // green edge fades out too.
      float shirt = max(smoothstep(30.0, 35.0, d.x), 1.0 - smoothstep(0.6, 0.72, d.y)) * (1.0 - smoothstep(80.0, 90.0, d.x));
      vec3 red = rgb(vec3(mod(355.0 + (v.x - 40.0) * 0.35, 360.0), max(v.y, 0.9), min(v.z * 1.15, 1.0)));
      return mix(color, red, shirt);
    }
    return color;
  }
  if (uPalette > 2.5) {
    // The spectral blue turns gold; the violet and pink specks that mixed into it turn orange.
    if (d.x < 160.0 || d.x > 345.0 || d.y < 0.1) return color;
    float gold = 45.0 + (v.x - 200.0) * 0.3;
    return rgb(vec3(mix(gold, 25.0, smoothstep(240.0, 270.0, d.x)), v.y, v.z));
  }
  // Only the red (poncho, hat band, fringe) turns blue, keeping its light and shade; leather, skin and gold stay. Read
  // from the corrected color, which the sheet correction aligns with the idle's materials. Red and leather overlap in
  // hue, so the boundary is a line in hue and saturation fitted to the sheets: the redder the hue, the less saturation it takes.
  float hue = v.x > 180.0 ? v.x - 360.0 : v.x;
  float weight = smoothstep(-0.05, 0.05, v.y - (0.48 + 0.0115 * hue)) * smoothstep(0.3, 0.45, v.y) *
    smoothstep(-90.0, -70.0, hue) * (1.0 - smoothstep(35.0, 60.0, hue));
  return mix(color, rgb(vec3(215.0 + hue * 0.5, v.y, v.z)), weight);
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
vec4 sampleTexture(vec2 uv) {
  %sample%
}
// Outline ink: dark and neutral. Thin lines are softened into dark greys; dark clothing shades keep their colour.
bool ink(vec3 c) {
  float high = max(c.r, max(c.g, c.b));
  return high < 120.0 / 255.0 && high - min(c.r, min(c.g, c.b)) < 45.0 / 255.0;
}
// Trims the outer black outline from the outside in (uTrim > 0) or grows it outward (uTrim < 0) by uTrim texels, so
// every frame shows the fighter's outline width: eight rays find the distance to the outside of the silhouette (trim)
// or to the nearest outline ink (grow). The faint fringe outside the silhouette, a light halo left by resizing the
// drawings, goes with the trimmed ink and under the grown ink. Interior pixels, line work away from the edge and edges
// without outline (smears) never change.
bool solidInk(vec2 uv) {
  if (uv.x < uFrame.x || uv.y < uFrame.y || uv.x > uFrame.z || uv.y > uFrame.w) return false;
  vec4 texel = sampleTexture(uv);
  return texel.a >= 0.5 && ink(texel.rgb / texel.a);
}
vec4 outlined(vec4 color) {
  bool inked = color.a >= 0.5 && ink(color.rgb / color.a);
  if (!inked) {
    // The fringe touches both the outline ink and the outside; drawing next to the outline only touches the ink.
    bool touching = false, outside = false;
    for (int ray = 0; ray < 8; ray++) {
      vec2 uv = outTexCoord + vec2(cos(float(ray) * 0.7854), sin(float(ray) * 0.7854)) * uTexel;
      bool inside = uv.x >= uFrame.x && uv.y >= uFrame.y && uv.x <= uFrame.z && uv.y <= uFrame.w;
      vec4 neighbour = inside ? sampleTexture(uv) : vec4(0.0);
      if (neighbour.a < 0.5) outside = true;
      if (neighbour.a >= 0.1 && ink(neighbour.rgb / neighbour.a)) touching = true;
    }
    if (color.a >= 0.5 && !(touching && outside)) return color;
    // Trimming: the fringe fades with the ink it touches; soft smears away from the outline stay.
    if (uTrim > 0.0) return touching ? color * clamp(1.0 - uTrim, 0.0, 1.0) : color;
  } else if (uTrim < 0.0) return color + vec4(vec3(0.04), 1.0) * (1.0 - color.a); // the ink's soft edge is filled in
  float reach = abs(uTrim) + 1.0;
  float nearest = reach + 1.0;
  for (int ray = 0; ray < 8; ray++) {
    vec2 direction = vec2(cos(float(ray) * 0.7854), sin(float(ray) * 0.7854)) * uTexel;
    for (int hop = 1; hop <= 12; hop++) {
      float travelled = float(hop);
      if (travelled > reach || travelled >= nearest) break;
      vec2 uv = outTexCoord + direction * travelled;
      bool inside = uv.x >= uFrame.x && uv.y >= uFrame.y && uv.x <= uFrame.z && uv.y <= uFrame.w;
      bool found = uTrim > 0.0 ? !inside || sampleTexture(uv).a < 0.5 : solidInk(uv);
      if (found) { nearest = travelled; break; }
    }
  }
  if (uTrim > 0.0) return color * clamp(nearest - uTrim, 0.0, 1.0);
  float cover = clamp(1.0 - uTrim - nearest, 0.0, 1.0);
  return vec4(vec3(0.04) * cover, cover) + color * (1.0 - cover);
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
  if (uTrim != 0.0 || uCorrected > 0.5 || uPalette > 0.5 || uLit > 0.5) {
    // Same steps as the drawn sprite going through the outline, the correction, the palette and then the light: each reads the stored pixel.
    color = stored(color);
    if (uTrim != 0.0) color = stored(outlined(color));
    vec4 drawn = color;
    if (uCorrected > 0.5 && color.a >= 0.001) color = stored(vec4(clamp(uCorrection * (color.rgb / color.a) + uOffset, 0.0, 1.0) * color.a, color.a));
    if (uPalette > 0.5 && color.a >= 0.001) color = stored(vec4(palette(color.rgb / color.a, drawn.rgb / drawn.a) * color.a, color.a));
    if (uLit > 0.5 && color.a >= 0.001) color = vec4(light(color.rgb / color.a) * color.a, color.a);
  }
  gl_FragColor = color;
}`;

const sameColor = (a: CharacterColorData, b: CharacterColorData): boolean => a.palette === b.palette && a.lit === b.lit &&
  a.exposure === b.exposure && a.occlusion === b.occlusion && a.warmth === b.warmth && a.shadow.every((channel, index) => channel === b.shadow[index]);
const neutral: CharacterColorData = { palette: 0, lit: false, exposure: 1, shadow: [1, 1, 1], occlusion: 0, warmth: 0 };

/** Below this many texels the outline is left as drawn. */
const MIN_TRIM = .15;
/**
 * Outline uniforms of a sprite: the texels to trim from its frame's outline (the sprite's scale is world pixels per
 * texel), the frame's uv rectangle and the texel size; all zero when the frame needs no change.
 */
function outlineUniforms(sprite: Phaser.GameObjects.Image): number[] {
  const frame = sprite.frame, trim = frame ? outlineTrim(sprite.texture.key, frame.name, frame.realHeight, Math.abs(sprite.scaleX)) : 0;
  if (Math.abs(trim) < MIN_TRIM) return [0, 0, 0, 0, 0, 0, 0];
  const source = frame.source;
  return [trim, Math.min(frame.u0, frame.u1), Math.min(frame.v0, frame.v1), Math.max(frame.u0, frame.u1), Math.max(frame.v0, frame.v1),
    1 / source.width, 1 / source.height];
}

/** Registers the shared colour pipeline once per game; compiling it here keeps that cost out of the fight. */
export function registerCharacterColor(scene: Phaser.Scene): void {
  const renderer = scene.game?.renderer;
  if (renderer?.type !== Phaser.WEBGL) return;
  const pipelines = (renderer as Phaser.Renderer.WebGL.WebGLRenderer).pipelines;
  if (pipelines.has(CHARACTER_COLOR_PIPELINE)) return;
  class CharacterColorPipeline extends Phaser.Renderer.WebGL.Pipelines.MultiPipeline {
    private current?: CharacterColorData;
    private correction?: SheetCorrection;
    /** Outline uniforms of the sprites being batched, joined into one string to compare. */
    private outline?: string;
    constructor(game: Phaser.Game, textures: number) {
      // Neighbours are read from the sampler the texel came from, chosen the way Phaser chooses it.
      const choose = Array.from({ length: textures }, (_, index) => `if (outTexId < ${index}.5) return texture2D(uMainSampler[${index}], uv);`);
      super({ game, fragShader: fragment.replace('%sample%', [...choose, 'return vec4(0.0);'].join('\n  ')) });
    }
    override batchSprite(sprite: Phaser.GameObjects.Image, camera: Phaser.Cameras.Scene2D.Camera, parent?: Phaser.GameObjects.Components.TransformMatrix): void {
      const data = { ...neutral, ...sprite.pipelineData } as CharacterColorData;
      const correction = sheetCorrection(sprite.texture?.key) ?? IDENTITY_CORRECTION;
      const outline = outlineUniforms(sprite);
      if (!this.current || !sameColor(this.current, data) || correction !== this.correction || outline.join() !== this.outline) {
        // Sprites already batched keep the colour they were queued with.
        this.flush();
        this.set1f('uPalette', data.palette);
        this.set1f('uLit', data.lit ? 1 : 0);
        this.set1f('uExposure', data.exposure);
        this.set3f('uShadow', data.shadow[0], data.shadow[1], data.shadow[2]);
        this.set1f('uOcclusion', data.occlusion);
        this.set1f('uWarmth', data.warmth);
        this.set1f('uCorrected', correction === IDENTITY_CORRECTION ? 0 : 1);
        // GLSL matrices are column-major; the correction is stored by rows, each followed by its offset.
        this.setMatrix3fv('uCorrection', false, new Float32Array([0, 1, 2].flatMap(column => [0, 1, 2].map(row => correction[row * 4 + column]))));
        this.set3f('uOffset', correction[3], correction[7], correction[11]);
        const [trim, u0, v0, u1, v1, texelU, texelV] = outline;
        this.set1f('uTrim', trim);
        this.set4f('uFrame', u0, v0, u1, v1);
        this.set2f('uTexel', texelU, texelV);
        this.current = data;
        this.correction = correction;
        this.outline = outline.join();
      }
      super.batchSprite(sprite, camera, parent);
    }
    override onBind(): void { this.current = undefined; this.correction = undefined; this.outline = undefined; }
  }
  pipelines.add(CHARACTER_COLOR_PIPELINE, new CharacterColorPipeline(scene.game, (renderer as Phaser.Renderer.WebGL.WebGLRenderer).maxTextures));
}
