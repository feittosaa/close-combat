import { expect, it, vi } from 'vitest';
vi.mock('phaser',()=>({default:{Scene:class {},Game:vi.fn(),Scale:{FIT:0,CENTER_BOTH:0},Textures:{FilterMode:{LINEAR:0}},
  Loader:{FileTypes:{ImageFile:class {},JSONFile:class {}},MultiFile:class {},FileTypesManager:{register:vi.fn()}}}}));
const victoryScreens: unknown[][] = [];
vi.mock('../ui/VictoryScreen', () => ({ VictoryScreen: class { constructor(...args: unknown[]) { victoryScreens.push(args.slice(1)); } destroy(): void {} } }));
import { BootScene } from '../scenes/BootScene';
import { FightScene } from '../scenes/FightScene';
import { stages, stageTextureKey } from '../rendering/stages/stageCatalog';
import { Simulation, type SimulationSnapshot } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { shoto } from '../engine/data/fighters/shoto';

it('keeps the available wallpaper on the loading screen and removes it afterwards', () => {
  vi.useFakeTimers();
  const screen = {className:'', textContent:'', style:{setProperty:vi.fn()}, setAttribute:vi.fn(), remove:vi.fn()};
  const document = {createElement:vi.fn(() => screen), body:{appendChild:vi.fn()}};
  const sessionStorage = {setItem:vi.fn()};
  vi.stubGlobal('document', document);
  vi.stubGlobal('window', {setInterval, clearInterval});
  vi.stubGlobal('sessionStorage', sessionStorage);
  try {
    const camera={setOrigin:vi.fn(),setZoom:vi.fn(),setScroll:vi.fn()};
    Object.values(camera).forEach(method=>method.mockReturnValue(camera));
    const load={image:vi.fn(),atlas:vi.fn(),spritesheet:vi.fn(),audio:vi.fn()};
    const boot=new BootScene();
    Object.assign(boot,{cameras:{main:camera},scale:{width:1920,height:1080},load,
      textures:{exists:()=>false},cache:{audio:{exists:()=>false}},scene:{start:vi.fn()}});
    boot.preload();
    const first = screen.style.setProperty.mock.calls[0][1];
    expect(screen.className).toBe('loading-screen wallpaper-left');
    vi.advanceTimersByTime(20000);
    expect(screen.style.setProperty.mock.calls[1][1]).not.toBe(first);
    expect(screen.className).toBe('loading-screen wallpaper-right');
    expect(sessionStorage.setItem).toHaveBeenCalledTimes(2);
    boot.create();
    expect(screen.remove).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    vi.unstubAllGlobals(); vi.useRealTimers();
  }
});

it.each([['KeyS','KeyJ',undefined],['ArrowDown','Numpad1','player-2']] as const)('lets either player return both to character selection, the winner then choosing the stage: %s', (down, confirm, winner) => {
  const nav = {className:'',style:{},setAttribute:vi.fn(),replaceChildren:vi.fn(),remove:vi.fn()};
  const buttons: {textContent:string;className:string;onclick?:()=>void}[] = [];
  const document = {createElement:vi.fn((tag:string) => {
    if (tag === 'nav') return nav;
    const button = {textContent:'',className:'',onclick:undefined}; buttons.push(button); return button;
  }),body:{appendChild:vi.fn()}};
  const listeners = new Map<string, EventListener>();
  vi.stubGlobal('document',document);
  vi.stubGlobal('window',{addEventListener:(name:string, listener:EventListener)=>listeners.set(name,listener),removeEventListener:vi.fn()});
  try {
    const fight = new FightScene();
    const start=vi.fn();
    Object.assign(fight,{scene:{start,restart:vi.fn()},game:{canvas:{getBoundingClientRect:()=>({left:0,top:0,width:1024,height:576})}}});
    fight.init({mode:'versus',fighterId:'shoto',opponentId:'cowboy'});
    const snapshot = new Simulation(createGameConfig(1024,576)).snapshot();
    snapshot.phase='match-over'; snapshot.matchWinnerId=winner;
    (fight as unknown as {showResultMenu:(snapshot:SimulationSnapshot)=>void}).showResultMenu(snapshot);
    expect(buttons.slice(0,3).map(button=>button.textContent)).toEqual(['REVANCHE','TROCAR PERSONAGEM','MENU PRINCIPAL']);
    const send=(code:string)=>listeners.get('keydown')!({code,repeat:false,preventDefault:vi.fn(),stopImmediatePropagation:vi.fn()} as unknown as Event);
    send(down); send(confirm);
    expect(start).toHaveBeenCalledWith('MenuScene',{fighterId:'shoto',selectVersus:true,...(winner ? {stageChooser:1} : {})});
  } finally { vi.unstubAllGlobals(); }
});

const postMatch = (mode: 'versus' | 'arcade', winner: string | undefined, arcadeIndex = 0) => {
  const nav = {className:'',style:{},setAttribute:vi.fn(),replaceChildren:vi.fn(),remove:vi.fn()};
  const buttons: {textContent:string;className:string;onclick?:()=>void}[] = [];
  vi.stubGlobal('document',{createElement:(tag:string) => {
    if (tag === 'nav') return nav;
    const button = {textContent:'',className:'',onclick:undefined}; buttons.push(button); return button;
  },body:{appendChild:vi.fn()}});
  vi.stubGlobal('window',{addEventListener:vi.fn(),removeEventListener:vi.fn()});
  const fight = new FightScene();
  const start=vi.fn(), restart=vi.fn();
  Object.assign(fight,{scene:{start,restart},game:{canvas:{getBoundingClientRect:()=>({left:0,top:0,width:1024,height:576})}}});
  fight.init({mode,fighterId:'shoto',opponentId:'cowboy',arcadeIndex});
  const snapshot = new Simulation(createGameConfig(1024,576)).snapshot();
  snapshot.phase='match-over'; snapshot.matchWinnerId=winner;
  (fight as unknown as {showResultMenu:(snapshot:SimulationSnapshot)=>void}).showResultMenu(snapshot);
  return { buttons: buttons.map(button => button.textContent), click: (index: number) => buttons[index].onclick!(), start, restart, last: fight as unknown as { arcadeRun: { opponents: string[] } } };
};

it('versus offers rematch, character swap and main menu', () => {
  try {
    const menu = postMatch('versus', 'player-2');
    expect(menu.buttons).toEqual(['REVANCHE','TROCAR PERSONAGEM','MENU PRINCIPAL']);
    menu.click(0); expect(menu.restart).toHaveBeenCalledOnce();
    menu.click(2); expect(menu.start).toHaveBeenCalledWith('MenuScene',{fighterId:'shoto'});
  } finally { vi.unstubAllGlobals(); }
});

it('arcade after a loss offers only a rematch or giving up, never a character swap', () => {
  try {
    const menu = postMatch('arcade', 'player-2');
    expect(menu.buttons).toEqual(['REVANCHE','DESISTIR E VOLTAR AO MENU']);
    menu.click(0); expect(menu.restart.mock.calls[0][0]).toMatchObject({ arcadeIndex: 0 });
    menu.click(1); expect(menu.start).toHaveBeenCalledWith('MenuScene',{fighterId:'shoto'});
  } finally { vi.unstubAllGlobals(); }
});

it('arcade after a win offers to continue or give up, and after the last opponent only the main menu', () => {
  try {
    const next = postMatch('arcade', 'player-1');
    expect(next.buttons).toEqual(['CONTINUAR','DESISTIR E VOLTAR AO MENU']);
    next.click(0); expect(next.restart.mock.calls[0][0]).toMatchObject({ arcadeIndex: 1 });
  } finally { vi.unstubAllGlobals(); }
  try {
    const count = postMatch('arcade', 'player-2').last.arcadeRun.opponents.length;
    vi.unstubAllGlobals();
    const final = postMatch('arcade', 'player-1', count - 1);
    expect(final.buttons).toEqual(['MENU PRINCIPAL']);
  } finally { vi.unstubAllGlobals(); }
});

it('runs two real seconds of slow motion after a fatal hit before continuing the round', () => {
  const fighter = {...shoto,maxHealth:20};
  const simulation = new Simulation(createGameConfig(1024,576),[fighter,fighter],{initialDistance:64});
  const fight = new FightScene();
  const neutral = {direction:'N' as const,buttons:new Set<'1'>()};
  let first = true;
  Object.assign(fight,{simulation,scale:{width:1024,height:576},stagePresentation:{update:()=>false},syncViewsAndHud:()=>{},
    readInputs:()=>{ const input = first ? {direction:'N' as const,buttons:new Set(['1' as const])} : neutral; first=false; return [input,neutral]; }});
  for(let i=0;i<120 && simulation.snapshot().knockoutStartedAt === undefined;i++) fight.update(0,1000/60);
  const fatal = simulation.snapshot();
  expect(fatal.knockoutStartedAt).toBeDefined();
  for(let i=0;i<100;i++) fight.update(0,1000/60);
  const slowed = simulation.snapshot();
  expect(slowed.elapsedFrames-fatal.elapsedFrames).toBeGreaterThanOrEqual(24);
  expect(slowed.elapsedFrames-fatal.elapsedFrames).toBeLessThanOrEqual(26);
  expect(slowed.phase).toBe('fight');
  for(let i=0;i<150 && simulation.snapshot().phase === 'fight';i++) fight.update(0,1000/60);
  expect(simulation.snapshot().phase).toBe('round-over');
});

it('discards held keys and buffered commands when the intro ends, so only presses after Fight count', () => {
  const simulation = new Simulation(createGameConfig(1024,576),[shoto,shoto],{initialDistance:64});
  const fight = new FightScene();
  const keyboard = {clear:vi.fn(),read:()=>({direction:'N' as const,buttons:new Set<'1'>()})}, buffer = {clear:vi.fn(),push:vi.fn()};
  let intro = true;
  Object.assign(fight,{simulation,scale:{width:1024,height:576},stagePresentation:{update:()=>intro},syncViewsAndHud:()=>{},fightSounds:undefined,
    keyboardInputs:[keyboard,keyboard],commandBuffers:[buffer,buffer]});
  fight.update(0,16); fight.update(0,16);
  expect(keyboard.clear).not.toHaveBeenCalled();
  intro = false; fight.update(0,16); fight.update(0,16);
  expect(keyboard.clear).toHaveBeenCalledTimes(2);
  expect(buffer.clear).toHaveBeenCalledTimes(2);
});

it('boots with shared assets only; each match loads its own fighters, stage and titles and releases the others',()=>{
  const textures=new Map<string,object>();
  const queued=new Set<string>(), removed:string[]=[];
  const queue=(key:string)=>{queued.add(key);};
  const load={image:vi.fn(queue),packedAtlas:vi.fn(queue),spritesheet:vi.fn(queue),audio:vi.fn(queue),list:{get size(){return queued.size;}}};
  const camera={setOrigin:vi.fn(),setZoom:vi.fn(),setScroll:vi.fn()};
  Object.values(camera).forEach(method=>method.mockReturnValue(camera));
  const shared={textures:{exists:(key:string)=>textures.has(key),getTextureKeys:()=>[...textures.keys()],remove:(key:string)=>{textures.delete(key);removed.push(key);}},
    cache:{audio:{exists:(key:string)=>textures.has(key)}},load};
  const finishLoading=()=>{for(const key of queued)textures.set(key,{});queued.clear();};
  const matchKeys=/^(stage:|presentation:|cowboy-|shoto-)/;
  const boot=new BootScene();
  Object.assign(boot,shared,{cameras:{main:camera},scale:{width:1920,height:1080},scene:{start:vi.fn()}});
  boot.preload();
  for (const key of ['menu-solar','sfx-perfect_block_1','contact-hit-light','wall-bounce']) expect(queued.has(key),key).toBe(true);
  for (const fighter of ['shoto','cowboy','grappler','puppet']) expect(queued.has(`fighter-icon-${fighter}`)).toBe(true);
  expect([...queued].filter(key=>matchKeys.test(key))).toEqual([]);
  finishLoading();
  boot.create();
  expect((boot as unknown as {scene:{start:ReturnType<typeof vi.fn>}}).scene.start).toHaveBeenCalledWith('MenuScene');
  const match=(fighterId:string,opponentId:string,stageId:string)=>{
    const fight=new FightScene();Object.assign(fight,shared);
    fight.init({mode:'versus',fighterId,opponentId,stageId});fight.preload();
    const loaded=[...queued];finishLoading();return loaded;
  };
  const farm=stages.find(stage=>stage.id==='fazenda')!, saloon=stages.find(stage=>stage.id==='saloon-dia')!;
  const first=match('shoto','shoto','fazenda');
  expect(first).toContain('shoto-idle');expect(first.some(key=>key.startsWith('cowboy-'))).toBe(false);
  for(const layer of farm.layers)expect(first).toContain(stageTextureKey(farm,layer));
  expect(first).toContain('presentation:fazenda:ko');
  expect(first.filter(key=>/^(stage|presentation):/.test(key)&&!/^(stage|presentation):fazenda:/.test(key))).toEqual([]);
  expect(match('shoto','shoto','fazenda'),'a rematch reuses what is loaded').toEqual([]);
  const second=match('cowboy','shoto','saloon-dia');
  expect(second).toContain('cowboy-idle');expect(second.some(key=>key.startsWith('shoto-'))).toBe(false);
  for(const layer of saloon.layers)expect(second).toContain(stageTextureKey(saloon,layer));
  expect(second).toContain('presentation:saloon:ko');
  expect(removed.length).toBeGreaterThan(0);
  expect(removed.every(key=>/^(stage|presentation):fazenda:/.test(key)),'only the farm leaves memory').toBe(true);
  expect([...textures.keys()].filter(key=>/^(stage|presentation):fazenda:/.test(key))).toEqual([]);
});

it('starts the preparation scene before exposing any menu or fighter selection',async()=>{
  const {default:Phaser}=await import('phaser');
  const {MenuScene}=await import('../scenes/MenuScene');
  await import('../main');
  expect(Phaser.Game).toHaveBeenCalledWith(expect.objectContaining({scene:[BootScene,MenuScene,FightScene]}));
});

it.each([
  ['PvP com vencedor', 'versus', 'player-2', 0, [['cowboy', 'Texas', 2]]],
  ['PvP empatado', 'versus', undefined, 0, []],
  ['Arcade: vitória sobre o último adversário', 'arcade', 'player-1', -1, [['shoto', 'Bob', undefined]]],
  ['Arcade: vitória no meio da jornada', 'arcade', 'player-1', 0, []],
  ['Arcade: derrota', 'arcade', 'player-2', -1, []],
] as const)('tela de vitória: %s', (_name, mode, winner, arcadeIndex, expected) => {
  victoryScreens.length = 0;
  const nav = {className:'',style:{},setAttribute:vi.fn(),replaceChildren:vi.fn(),remove:vi.fn()};
  vi.stubGlobal('document',{createElement:(tag:string) => tag === 'nav' ? nav : ({textContent:'',className:'',onclick:undefined}),body:{appendChild:vi.fn()}});
  vi.stubGlobal('window',{addEventListener:vi.fn(),removeEventListener:vi.fn()});
  try {
    const fight = new FightScene();
    Object.assign(fight,{scene:{start:vi.fn(),restart:vi.fn()},game:{canvas:{getBoundingClientRect:()=>({left:0,top:0,width:1024,height:576})}}});
    fight.init({mode,fighterId:'shoto',opponentId:'cowboy',arcadeIndex:Math.max(0,arcadeIndex)});
    if (arcadeIndex < 0) arcadeIndex = (fight as unknown as {arcadeRun:{opponents:string[]}}).arcadeRun.opponents.length - 1;
    if (mode === 'arcade') fight.init({mode,fighterId:'shoto',arcadeIndex:Math.max(0,arcadeIndex),arcadeRun:(fight as unknown as {arcadeRun:object}).arcadeRun as never});
    const snapshot = new Simulation(createGameConfig(1024,576)).snapshot();
    snapshot.phase='match-over'; snapshot.matchWinnerId=winner;
    (fight as unknown as {showResultMenu:(snapshot:SimulationSnapshot)=>void}).showResultMenu(snapshot);
    expect(victoryScreens.map(([, id, name, , player]) => [id, name, player])).toEqual(expected);
  } finally { vi.unstubAllGlobals(); }
});

it('draws every loaded texture once, through both sprite shaders, and waits for the GPU before READY', async () => {
  const { primeMatchTextures } = await import('../rendering/matchAssets');
  const drawn: string[] = [], removed: string[] = [];
  const target = { beginDraw: vi.fn(), batchDrawFrame: vi.fn((key: string) => { drawn.push(key); }), batchDraw: vi.fn(), endDraw: vi.fn() };
  const image = { setPipeline: vi.fn(() => image), destroy: vi.fn() };
  const finish = vi.fn(), addDynamicTexture = vi.fn(() => target);
  const scene = { game: { renderer: { gl: { finish } } }, make: { image: () => image },
    textures: { getTextureKeys: () => ['__DEFAULT', 'shoto-idle', 'stage:fazenda:fundo', 'presentation:fazenda:ready', 'contact-hit-light'],
      addDynamicTexture, remove: (key: string) => { removed.push(key); } } };
  primeMatchTextures(scene as never);
  expect(drawn).toEqual(['shoto-idle', 'stage:fazenda:fundo', 'presentation:fazenda:ready', 'contact-hit-light']);
  expect(image.setPipeline).toHaveBeenCalledWith('character-color', expect.objectContaining({ palette: 1, lit: true }));
  expect(target.batchDraw).toHaveBeenCalledWith(image, 0, 0);
  expect(target.endDraw).toHaveBeenCalledOnce();
  expect(finish).toHaveBeenCalledOnce();
  expect(removed).toEqual(['__match-prime']);
  expect(addDynamicTexture).toHaveBeenCalledWith('__match-prime', 3, 3);
});
