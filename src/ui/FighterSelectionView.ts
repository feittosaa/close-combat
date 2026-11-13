import selectionInk from '../assets/art/selection/comic-ink.png';
import { fighterArt, holdSelectionArt } from './fighterArt';
import { preloadSelectionMask, selectionCharacterAt } from './selectionHitTest';
import { t } from '../i18n/i18n';
import type { CharacterDefinition } from '../engine/data/characters';
import type { FighterSelection, SelectionPlayer } from './FighterSelection';

interface SelectionViewOptions {
  fighters: readonly CharacterDefinition[]; selection: FighterSelection; opponent: CharacterDefinition;
  versus: boolean; selectOpponent: boolean; solo: boolean; modeTitle: string;
  preview: readonly (string | undefined)[]; point: (player: SelectionPlayer, id: string) => void;
  refresh: () => void; random: (player: SelectionPlayer) => void; confirm: () => void; back: () => void;
}

const images = import.meta.glob<string>('../assets/art/selection/selection_*.png', { eager:true, query:'?url', import:'default' });
const imageFor = (id:string) => images[`../assets/art/selection/selection_${id}.png`];
const colors:Record<string,readonly [string, string]> = {
  shoto:['#f6b900','#75401b'], grappler:['#f46308','#40501b'], rushdown:['#d82e4f','#6b1428'],
  setplay:['#25b768','#182e26'], gimmick:['#502bd2','#d51a24'], stance:['#ffc000','#b15a00'],
  mrapple:['#e32a15','#211216'], mixup:['#2054d5','#ad201b'], texas:['#e41c27','#16aee4'],
};
const angles:Record<string,string> = { shoto:'135deg', grappler:'45deg', rushdown:'160deg', setplay:'25deg', gimmick:'115deg', stance:'70deg', mrapple:'175deg', mixup:'215deg', texas:'145deg' };
// Back-to-front layering follows screen_selection.png; coordinates live in menu.css.
export const selectionRoster = ['setplay','shoto','rushdown','gimmick','grappler','texas','mixup','stance','mrapple'];

export function renderFighterSelection(root: HTMLElement, options: SelectionViewOptions): void {
  const { fighters, selection, selectOpponent, versus } = options;
  holdSelectionArt();
  const node = (tag:string, className:string, text=''):HTMLElement => { const e=document.createElement(tag); e.className=className; e.textContent=text; return e; };
  const button = (label:string, className:string, action:()=>void):HTMLButtonElement => { const e=document.createElement('button'); e.className=className; e.textContent=label; e.onclick=action; return e; };
  const active = fighters[selection.indices[selection.activePlayer]];
  const left = options.preview[0] ?? fighters[selection.indices[0]].id;
  const right = selectOpponent ? options.preview[1] ?? fighters[selection.indices[1]].id : options.opponent.id;
  const rightFighter = options.solo ? (options.preview[0] ?? active.id) : right;
  const leftColors = colors[left] ?? ['#333', '#111'];
  const rightColors = colors[rightFighter] ?? ['#333', '#111'];
  root.style.setProperty('--roster-left', leftColors[0]);
  root.style.setProperty('--roster-left-accent', leftColors[1]);
  root.style.setProperty('--roster-right', rightColors[0]);
  root.style.setProperty('--roster-right-accent', rightColors[1]);
  root.style.setProperty('--roster-left-angle', angles[left] ?? '135deg');
  root.style.setProperty('--roster-right-angle', angles[rightFighter] ?? '135deg');
  const background = node('div','selection-background'); background.setAttribute('aria-hidden','true');
  const filter = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  filter.setAttribute('class', 'selection-ink-filter');
  filter.innerHTML = '<filter id="selection-ink-filter" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -0.5 0 -0.5 0 1"/></filter>';
  const leftGradient = node('div','selection-gradient left'); background.append(leftGradient);
  if (selectOpponent) background.append(node('div','selection-gradient right'));
  const ink = document.createElement('img'); ink.className = 'selection-ink'; ink.src = selectionInk; ink.alt = '';
  background.append(filter, ink); root.append(background);
  const collage = node('div','selection-collage'); collage.setAttribute('role','group'); collage.setAttribute('aria-label',t('fighter.roster'));
  for (const id of selectionRoster) {
    const index=fighters.findIndex(fighter=>fighter.id===id), art=fighterArt[id];
    const chosen = ([0,1] as const).filter(player => (player===0 || selectOpponent) && !selection.random[player] && (options.preview[player] ?? fighters[selection.indices[player]].id)===id);
    const tile = button('', `selection-character character-${id}${index<0 ? ' unavailable' : ''}${chosen.length ? ' selected' : ''}${chosen.length > 1 ? ' shared' : ''}${versus && chosen.includes(0) ? ' player-one' : ''}${versus && chosen.includes(1) ? ' player-two' : ''}`, () => {
      if(index<0) return;
      if(options.preview[selection.activePlayer]!==id) options.point(selection.activePlayer,id);
      else options.confirm();
    });
    tile.setAttribute('aria-label', index<0 ? t('fighter.inDevelopmentLabel',{name:art.name}) : art.name);
    tile.setAttribute('aria-pressed',String(chosen.includes(selection.activePlayer)));
    if(index<0) tile.setAttribute('aria-disabled','true');
    tile.dataset.fighter = id;
    const img=document.createElement('img'); img.src=imageFor(id); img.alt=''; img.draggable=false; tile.append(img);
    preloadSelectionMask(img.src);
    if(chosen.length) tile.append(node('span','selection-player-label',chosen.map(player=>`P${player+1}`).join(' / ')));
    collage.append(tile);
  }
  collage.onpointermove = event => {
    const id = selectionCharacterAt(collage, event.clientX, event.clientY);
    collage.style.cursor = id ? 'pointer' : 'default';
    if (id && !selection.choosingColor[selection.activePlayer] && options.preview[selection.activePlayer] !== id) options.point(selection.activePlayer, id);
  };
  collage.onclick = event => {
    const id = selectionCharacterAt(collage, event.clientX, event.clientY);
    if (!id || !fighters.some(fighter => fighter.id === id)) return;
    if (options.preview[selection.activePlayer] !== id) options.point(selection.activePlayer, id);
    else options.confirm();
  };
  root.append(collage);
  const controls=node('div','selection-controls');
  controls.append(node('span','arena-eyebrow',options.modeTitle));
  for(const player of (options.solo ? [0] : [0,1]) as readonly SelectionPlayer[]) {
    const entry=player===1&&!selectOpponent ? options.opponent : fighters[selection.indices[player]];
    const displayName = options.preview[player] ? fighterArt[options.preview[player]!]?.name ?? entry.name : entry.name;
    const section=node('div',`selection-player player-${player+1}`);
    section.append(node('strong','',`${player===1&&!versus?t('fighter.opponent'):`P${player+1}`} · ${selection.random[player]?t('fighter.randomName'):displayName}`));
    if(selectOpponent) section.append(button(t(selection.ready[player]?'fighter.ready':'fighter.choose',{who:`P${player+1}`}), 'arena-player-switch',()=>{selection.activePlayer=player;options.refresh();}));
    if((player===0||selectOpponent) && selection.choosingColor[player]) {
      const palette=node('div','arena-palettes'); palette.setAttribute('role','group'); palette.setAttribute('aria-label',t('fighter.colorsOf',{name:entry.name,player:player+1}));
      const choices = entry.id==='texas' ? [['#b72b36','#f5bd35','#328bde'],['#2c5eac','#f5bd35','#f2a53a']] : entry.id==='grappler' ? [['#7c402c','#f85d03','#f89a04'],['#7c402c','#03bff8','#04d9f8']] : [['#50683b','#e4b34e','#714a2d'],['#d22529','#e4b34e','#714a2d']];
      choices.forEach((color,index)=>{ const swatch=button('','arena-palette',()=>{selection.selectPalette(player,index as 0|1);options.refresh();}); swatch.setAttribute('aria-label',t(index===0?'fighter.originalColor':'fighter.alternateColor')); swatch.setAttribute('aria-pressed',String(selection.palettes[player]===index)); swatch.disabled=selection.isPaletteLocked(player,index as 0|1); swatch.style.setProperty('--palette-main',color[0]); swatch.style.setProperty('--palette-accent',color[1]); swatch.style.setProperty('--palette-detail',color[2]); palette.append(swatch); });
      section.append(palette);
    }
    controls.append(section);
  }
  const random=button('?', 'arena-random',()=>options.random(selection.activePlayer));
  random.setAttribute('aria-label',t('fighter.random')); random.setAttribute('aria-pressed',String(selection.random[selection.activePlayer]));
  controls.append(random,button(selection.choosingColor[selection.activePlayer]?t('fighter.confirmColor'):t('fighter.confirmFighter'),'arena-confirm',options.confirm),button(t('common.backArrow'),'arena-back',options.back));
  root.append(controls);
}
