import type { StageDefinition } from '../rendering/stages/StageDefinition';
import { getStageLayerUrl } from '../rendering/stages/stageCatalog';

interface StageSelectionOptions {
  stages: readonly StageDefinition[];
  selected: number;
  select: (index: number) => void;
  confirm: () => void;
  back: () => void;
}

/** A composed stage preview uses the same sources and layer order as the fight. */
function stageImage(stage: StageDefinition): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${stage.referenceSize.width} ${stage.referenceSize.height}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  svg.setAttribute('aria-hidden', 'true');
  for (const layer of [...stage.layers].sort((a, b) => a.depth - b.depth)) {
    const image = document.createElementNS(ns, 'image');
    const scale = layer.contentScale ?? 1;
    const origin = layer.scaleOrigin ?? { x: 0, y: 0 };
    image.setAttribute('href', getStageLayerUrl(stage, layer));
    image.setAttribute('x', String(layer.x + origin.x * (1 - scale)));
    image.setAttribute('y', String(layer.y + origin.y * (1 - scale)));
    image.setAttribute('width', String(stage.referenceSize.width * scale));
    image.setAttribute('height', String(stage.referenceSize.height * scale));
    svg.append(image);
  }
  return svg;
}

export function updateStageSelection(root: HTMLElement, stage: StageDefinition, selected: number): void {
  root.querySelector('.arena-stage-preview')?.replaceChildren(stageImage(stage));
  const name = root.querySelector('.arena-stage-name');
  if (name) name.textContent = stage.name;
  root.querySelectorAll<HTMLButtonElement>('.arena-stage-tile').forEach((tile, index) => {
    tile.setAttribute('aria-pressed', String(index === selected));
  });
}

export function renderStageSelection(root: HTMLElement, options: StageSelectionOptions): void {
  const node = (tag: string, className: string, text = ''): HTMLElement => {
    const element = document.createElement(tag); element.className = className; element.textContent = text; return element;
  };
  const preview = node('div', 'arena-stage-preview'); preview.setAttribute('aria-hidden', 'true');
  const panel = node('div', 'arena-selection arena-stage-selection');
  const name = node('h2', 'arena-stage-name'); name.setAttribute('aria-live', 'polite');
  panel.append(node('span', 'arena-eyebrow', 'ESCOLHA O LOCAL DA LUTA'), name);
  const grid = node('div', 'arena-roster'); grid.setAttribute('role', 'group'); grid.setAttribute('aria-label', 'Cenários disponíveis');
  options.stages.forEach((stage, index) => {
    const tile = document.createElement('button'); tile.className = 'arena-portrait arena-stage-tile';
    tile.setAttribute('aria-label', stage.name);
    tile.append(stageImage(stage));
    tile.addEventListener('pointerenter', () => options.select(index));
    tile.addEventListener('focus', () => options.select(index));
    tile.addEventListener('click', () => options.select(index));
    grid.append(tile);
  });
  for (let index = options.stages.length; index < 9; index++) {
    const empty = node('div', 'arena-empty'); empty.setAttribute('aria-hidden', 'true'); grid.append(empty);
  }
  const actions = node('div', 'arena-stage-actions');
  const confirm = document.createElement('button'); confirm.className = 'arena-confirm'; confirm.textContent = 'COMEÇAR LUTA →'; confirm.onclick = options.confirm;
  const back = document.createElement('button'); back.className = 'arena-back'; back.textContent = '← VOLTAR'; back.onclick = options.back;
  actions.append(confirm, back); panel.append(grid, actions);
  const footer = node('footer', 'arena-footer', '← →  CENÁRIO     ENTER  COMEÇAR     ESC  VOLTAR');
  root.append(preview, panel, footer);
  updateStageSelection(root, options.stages[options.selected], options.selected);
}
