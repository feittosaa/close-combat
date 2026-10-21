export interface StageLayer {
  id: string;
  file: string;
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
}

export interface StageDefinition {
  id: string;
  name: string;
  referenceSize: { width: number; height: number };
  /** Linha dos pés na imagem de referência; é alinhada ao floorY da simulação. */
  groundY: number;
  minimumScale: number;
  layers: readonly StageLayer[];
}

export function validateStage(stage: StageDefinition): void {
  const { width, height } = stage.referenceSize;
  if (!stage.id || !stage.name || !Number.isFinite(width) || width <= 0 ||
      !Number.isFinite(height) || height <= 0 || !Number.isFinite(stage.groundY) ||
      stage.groundY <= 0 || stage.groundY >= height || !Number.isFinite(stage.minimumScale) ||
      stage.minimumScale <= 0 || !stage.layers.length) {
    throw new Error(`Cenário inválido: ${stage.id}`);
  }
  const ids = new Set<string>();
  stage.layers.forEach((layer) => {
    if (!layer.id || ids.has(layer.id) || !/^layers\/[\w-]+\.png$/.test(layer.file) ||
        ![layer.depth, layer.parallax, layer.x, layer.y].every(Number.isFinite) ||
        layer.parallax < 0 || layer.parallax > 1 ||
        (layer.contentScale !== undefined && (!Number.isFinite(layer.contentScale) || layer.contentScale <= 0)) ||
        (layer.scaleOrigin !== undefined && ![layer.scaleOrigin.x, layer.scaleOrigin.y].every(Number.isFinite))) {
      throw new Error(`Camada inválida em ${stage.id}: ${layer.id}`);
    }
    ids.add(layer.id);
  });
}
