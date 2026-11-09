export interface StageLayer {
  id: string;
  file: string;
  highFile?: string;
  /** Reuse an existing stage's layer without duplicating its source images. */
  sourceStage?: string;
  frames?: readonly string[];
  frameDuration?: number;
  /** Ordem de desenho: negativos ficam atrás dos lutadores, que usam depth 0. */
  depth: number;
  /** Fração do movimento horizontal da câmera: 0 fixa, 1 acompanha o chão. */
  parallax: number;
  /** Deslocamento na resolução de referência, antes da escala comum. */
  x: number;
  y: number;
  /** Ajuste uniforme do conteúdo, preservando o ponto de apoio da camada. */
  contentScale?: number;
  scaleOrigin?: { x: number; y: number };
  /** Dimensions of an independently sized decorative image in stage pixels. */
  size?: { width: number; height: number };
  /** Slow looping movement in stage pixels, independent of the combat simulation. */
  motion?: { axis: 'x' | 'y'; amplitude: number; period: number; mode?: 'linear' | 'oscillate' };
  /** Repeat without reflecting the texture at the panorama edges. */
  repeatWithoutFlip?: boolean;
  /** Display only a technical crop of a shared source image. */
  crop?: { x:number; y:number; width:number; height:number };
}

export interface StageDefinition {
  id: string;
  name: string;
  referenceSize: { width: number; height: number };
  /** Linha dos pés na imagem de referência; é alinhada ao floorY da simulação. */
  groundY: number;
  /** Extra source pixels above the original composition; do not magnify the scenery. */
  topExtension?: number;
  minimumScale: number;
  layers: readonly StageLayer[];
}

export function validateStage(stage: StageDefinition): void {
  const { width, height } = stage.referenceSize;
  if (!stage.id || !stage.name || !Number.isFinite(width) || width <= 0 ||
      !Number.isFinite(height) || height <= 0 || width / height < 16 / 9 || !Number.isFinite(stage.groundY) ||
      stage.groundY <= 0 || stage.groundY >= height || !Number.isFinite(stage.minimumScale) ||
      stage.minimumScale <= 0 || !stage.layers.length ||
      (stage.topExtension !== undefined && (!Number.isFinite(stage.topExtension) || stage.topExtension < 0 || stage.topExtension >= stage.groundY))) {
    throw new Error(`Cenário inválido: ${stage.id}`);
  }
  const ids = new Set<string>();
  stage.layers.forEach((layer) => {
    if (!layer.id || ids.has(layer.id) || (layer.sourceStage !== undefined && !/^[\w-]+$/.test(layer.sourceStage)) || !/^layers\/[\w-]+\.png$/.test(layer.file) ||
        (layer.highFile !== undefined && !/^layers\/[\w-]+\.png$/.test(layer.highFile)) ||
        (layer.frames !== undefined && (!layer.frames.length || layer.frames.some(file => !/^layers\/[\w-]+\.png$/.test(file)) || !Number.isInteger(layer.frameDuration) || layer.frameDuration! <= 0)) ||
        ![layer.depth, layer.parallax, layer.x, layer.y].every(Number.isFinite) ||
        layer.parallax < 0 || layer.parallax > 1 ||
        (layer.contentScale !== undefined && (!Number.isFinite(layer.contentScale) || layer.contentScale <= 0)) ||
        (layer.scaleOrigin !== undefined && ![layer.scaleOrigin.x, layer.scaleOrigin.y].every(Number.isFinite)) ||
        (layer.size !== undefined && (![layer.size.width, layer.size.height].every(Number.isFinite) || layer.size.width <= 0 || layer.size.height <= 0)) ||
        (layer.motion !== undefined && (!['x','y'].includes(layer.motion.axis) || (layer.motion.mode !== undefined && !['linear','oscillate'].includes(layer.motion.mode)) || !Number.isFinite(layer.motion.amplitude) || !Number.isFinite(layer.motion.period) || layer.motion.period <= 0)) ||
        (layer.crop !== undefined && (![layer.crop.x,layer.crop.y,layer.crop.width,layer.crop.height].every(Number.isFinite) || layer.crop.x < 0 || layer.crop.y < 0 || layer.crop.width <= 0 || layer.crop.height <= 0))) {
      throw new Error(`Camada inválida em ${stage.id}: ${layer.id}`);
    }
    ids.add(layer.id);
  });
}
