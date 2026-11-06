import type { StageDefinition } from '../rendering/stages/StageDefinition';
import { getStageLayerUrl } from '../rendering/stages/stageCatalog';
import { nameOf, t } from '../i18n/i18n';

import type { StageGroup } from '../rendering/stages/stageGroups';
import { getStageById } from '../rendering/stages/stageCatalog';

export interface StageSelectionOptions {
  groups: readonly StageGroup[];
  /** One highlighted tile per choosing player (P1, then P2 when both choose): a group index, or `groups.length` for the random tile. */
  cursors: readonly (number | undefined)[];
  /** Whose cursor drives the preview and the name. */
  focus: number;
  ready: readonly boolean[];
  /** Variation currently shown for each group. */
  variants: Readonly<Record<string, string>>;
  /** Player whose variation plate is open, if any. */
  plateFor?: number;
  /** Status line above the name ("P1 pronto · P2 escolhendo"). */
  heading: string;
  /** Key hints shown under the panel. */
  controls: string;
  select: (index: number) => void;
  choose: (index: number) => void;
  chooseVariant: (stageId: string) => void;
  closeVariants: () => void;
  confirm: () => void;
  back: () => void;
}

const SLOTS = 9;
const groupLabel = (group: StageGroup) => group.variants.length > 1 ? t(`stage.group.${group.id}` as 'stage.group.saloon') : stageName(getStageById(group.variants[0])!);
const variantLabel = (stageId: string) => t(`stage.variant.${stageId}` as 'stage.variant.saloon');

/** A composed stage preview uses the same sources and layer order as the fight. */
function stageImage(stage: StageDefinition): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${stage.referenceSize.width} ${stage.referenceSize.height}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  svg.setAttribute('aria-hidden', 'true');
  for (const layer of [...stage.layers].sort((a, b) => a.depth - b.depth)) {
    if (layer.crop) continue;
    const image = document.createElementNS(ns, 'image');
    const scale = layer.contentScale ?? 1;
    const origin = layer.scaleOrigin ?? { x: 0, y: 0 };
    image.setAttribute('href', getStageLayerUrl(stage, layer));
    image.setAttribute('x', String(layer.x + origin.x * (1 - scale)));
    image.setAttribute('y', String(layer.y + origin.y * (1 - scale)));
    image.setAttribute('width', String((layer.size?.width ?? stage.referenceSize.width) * scale));
    image.setAttribute('height', String((layer.size?.height ?? stage.referenceSize.height) * scale));
    if (layer.size) image.setAttribute('preserveAspectRatio', 'none');
    svg.append(image);
  }
  return svg;
}

const stageName = (stage: StageDefinition) => nameOf(`stage.${stage.id}`, stage.name);


export function renderStageSelection(root: HTMLElement, options: StageSelectionOptions): void {
  const node = (tag: string, className: string, text = ''): HTMLElement => {
    const element = document.createElement(tag); element.className = className; element.textContent = text; return element;
  };
  const randomIndex = options.groups.length;
  const focused = options.cursors[options.focus] ?? 0;
  const shown = focused < randomIndex ? options.groups[focused] : options.groups[0];
  const badges = (index: number) => { const row = node('div', 'arena-cursors'); options.cursors.forEach((cursor, player) => { if (cursor === index) row.append(node('b', `cursor-p${player + 1}${options.ready[player] ? ' ready' : ''}`, `P${player + 1}`)); }); return row; };
  const preview = node('div', 'arena-stage-preview'); preview.setAttribute('aria-hidden', 'true');
  preview.append(stageImage(getStageById(options.variants[shown.id] ?? shown.variants[0])!));
  const panel = node('div', 'arena-selection arena-stage-selection');
  const name = node('h2', 'arena-stage-name', focused === randomIndex ? t('stage.random') : groupLabel(shown)); name.setAttribute('aria-live', 'polite');
  panel.append(node('span', 'arena-eyebrow', options.heading), name);
  const grid = node('div', 'arena-roster'); grid.setAttribute('role', 'group'); grid.setAttribute('aria-label', t('stage.roster'));
  options.groups.forEach((group, index) => {
    const tile = document.createElement('button'); tile.className = 'arena-portrait arena-stage-tile';
    tile.setAttribute('aria-label', groupLabel(group)); tile.setAttribute('aria-pressed', String(options.cursors.includes(index)));
    tile.append(stageImage(getStageById(options.variants[group.id] ?? group.variants[0])!), badges(index));
    tile.addEventListener('pointerenter', () => options.select(index));
    tile.addEventListener('focus', () => options.select(index));
    tile.addEventListener('click', () => options.choose(index));
    grid.append(tile);
  });
  for (let index = options.groups.length; index < SLOTS; index++) { const empty = node('div', 'arena-empty'); empty.setAttribute('aria-hidden', 'true'); grid.append(empty); }
  const random = document.createElement('button'); random.className = 'arena-random'; random.textContent = '?';
  random.setAttribute('aria-label', t('stage.random')); random.setAttribute('aria-pressed', String(options.cursors.includes(randomIndex)));
  random.addEventListener('pointerenter', () => options.select(randomIndex)); random.addEventListener('click', () => options.choose(randomIndex));
  random.append(badges(randomIndex)); grid.append(random);
  const actions = node('div', 'arena-stage-actions');
  const confirm = document.createElement('button'); confirm.className = 'arena-confirm'; confirm.textContent = t('stage.confirm'); confirm.onclick = options.confirm;
  const back = document.createElement('button'); back.className = 'arena-back'; back.textContent = t('common.backArrow'); back.onclick = options.back;
  actions.append(confirm, back); panel.append(grid, actions);
  root.append(preview, panel, node('footer', 'arena-footer', options.controls));
  if (options.plateFor !== undefined) root.append(variantPlate(shown, options));
}

/** Variation choice, centred on the screen and styled like the colour plate of the character select. */
function variantPlate(group: StageGroup, options: StageSelectionOptions): HTMLElement {
  const plate = document.createElement('div'); plate.className = 'arena-variants'; plate.setAttribute('role', 'dialog'); plate.setAttribute('aria-label', t('stage.variants'));
  const title = document.createElement('span'); title.className = 'arena-eyebrow'; title.textContent = `P${(options.plateFor ?? 0) + 1} · ${t('stage.variants')}`; plate.append(title);
  const row = document.createElement('div'); row.className = 'arena-variant-row';
  for (const stageId of group.variants) {
    const choice = document.createElement('button'); choice.className = 'arena-variant'; choice.setAttribute('aria-pressed', String(stageId === (options.variants[group.id] ?? group.variants[0])));
    const picture = document.createElement('span'); picture.className = 'arena-variant-picture'; picture.append(stageImage(getStageById(stageId)!));
    const label = document.createElement('strong'); label.textContent = variantLabel(stageId);
    choice.append(picture, label); choice.onclick = () => options.chooseVariant(stageId);
    row.append(choice);
  }
  const close = document.createElement('button'); close.className = 'arena-back'; close.textContent = t('common.backArrow'); close.onclick = options.closeVariants;
  plate.append(row, close);
  return plate;
}

/** Coin-flip animation between the two picked sceneries; resolves on the winner. */
export function renderStageDraw(root: HTMLElement, candidates: readonly [string, string], winner: 0 | 1, instant: boolean, done: () => void): void {
  const plate = document.createElement('div'); plate.className = 'arena-draw'; plate.setAttribute('role', 'status');
  const title = document.createElement('span'); title.className = 'arena-eyebrow'; title.textContent = t('stage.draw'); plate.append(title);
  const row = document.createElement('div'); row.className = 'arena-variant-row';
  const cards = candidates.map((stageId, index) => {
    const card = document.createElement('div'); card.className = 'arena-variant';
    const picture = document.createElement('span'); picture.className = 'arena-variant-picture'; picture.append(stageImage(getStageById(stageId)!));
    const label = document.createElement('strong'); label.textContent = stageLabelOf(stageId);
    card.append(picture, label); row.append(card); card.dataset.side = String(index); return card;
  });
  plate.append(row); root.append(plate);
  const light = (side: number, final = false) => cards.forEach((card, index) => { card.classList.toggle('lit', index === side); card.classList.toggle('won', final && index === side); });
  if (instant) { light(winner, true); done(); return; }
  // The highlight bounces between the two cards, slowing down until it stops on the winner.
  const delays = [70, 70, 70, 80, 90, 110, 140, 180, 230, 300, 380, 480];
  const steps = delays.length % 2 === winner ? delays.length : delays.length + 1;
  let step = 0;
  const tick = () => {
    light(step % 2, step === steps);
    if (step === steps) { window.setTimeout(done, 900); return; }
    window.setTimeout(tick, delays[Math.min(step, delays.length - 1)]); step++;
  };
  tick();
}
const stageLabelOf = (stageId: string): string => {
  const stage = getStageById(stageId)!;
  return stageId.startsWith('saloon') ? `${t('stage.group.saloon')} · ${variantLabel(stageId)}` : stageName(stage);
};
