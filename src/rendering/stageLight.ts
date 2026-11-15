/** How light each stage is behind the fighters, measured per column by `scripts/measure-stage-light.py`. */
const maps = import.meta.glob<{ luma: readonly number[] }>('../assets/scenes/*/lightmap.json', { eager: true, import: 'default' });
const profiles = new Map(Object.entries(maps).map(([path, map]) => [path.split('/')[path.split('/').length - 2], map.luma]));

const clamp = (value: number, limit: number): number => Math.max(-limit, Math.min(limit, value));
/** Half the distance over which the slope of the light is read, as a fraction of the stage's width. */
const SLOPE_SPAN = 1 / 16;

export interface StageLight {
  /** Brightness relative to the stage average, which scales a fighter's exposure. */
  exposure: number;
  /** Which side is lighter, from -1 (left) to 1 (right), for the figure's lateral gradient. */
  side: number;
}

/** The light a fighter stands in at `position`, a fraction of the stage's width. A stage without a map is evenly lit. */
export function stageLight(stageId: string, position: number): StageLight {
  const luma = profiles.get(stageId);
  if (!luma) return { exposure: 1, side: 0 };
  const at = (fraction: number): number => {
    const column = Math.max(0, Math.min(luma.length - 1, fraction * luma.length - .5)), low = Math.floor(column);
    return luma[low] + (luma[Math.min(luma.length - 1, low + 1)] - luma[low]) * (column - low);
  };
  const mean = Math.max(.05, luma.reduce((sum, value) => sum + value, 0) / luma.length);
  return {
    exposure: 1 + clamp((at(position) - mean) / mean * .2, .08),
    side: clamp((at(position + SLOPE_SPAN) - at(position - SLOPE_SPAN)) / mean * .35, .3),
  };
}
