import { expect, it, vi } from 'vitest';
vi.mock('phaser',()=>({default:{Scene:class {},Game:vi.fn(),Scale:{FIT:0,CENTER_BOTH:0},Textures:{FilterMode:{LINEAR:0}}}}));
import { BootScene } from '../scenes/BootScene';
import { FightScene } from '../scenes/FightScene';
import { stages, stageTextureKey } from '../rendering/stages/stageCatalog';
import type { MatchMode } from '../scenes/matchSetup';
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

it('prepares every match resource before releasing the menu; every mode starts with an empty loader queue',()=>{
  const textures=new Map<string,object>();
  const queued=new Set<string>();
  const load={image:vi.fn((key:string)=>queued.add(key)),atlas:vi.fn((key:string)=>queued.add(key)),spritesheet:vi.fn((key:string)=>queued.add(key)),audio:vi.fn((key:string)=>queued.add(key))};
  const text={setOrigin:vi.fn()};
  const camera={setOrigin:vi.fn(),setZoom:vi.fn(),setScroll:vi.fn()};
  Object.values(camera).forEach(method=>method.mockReturnValue(camera));
  const shared={textures:{exists:(key:string)=>textures.has(key)},cache:{audio:{exists:(key:string)=>textures.has(key)}},load};
  const boot=new BootScene();
  Object.assign(boot,shared,{cameras:{main:camera},scale:{width:1920,height:1080},add:{text:()=>text},scene:{start:vi.fn()}});
  boot.preload();
  for(const stage of stages)for(const layer of stage.layers)expect(queued.has(stageTextureKey(stage,layer))).toBe(true);
  expect(queued.has('menu-solar')).toBe(true);
  for (const theme of ['saloon','fazenda','sala-treino']) expect(queued.has(`presentation:${theme}:ko`)).toBe(true);
  expect(queued.has('cowboy-idle')).toBe(true);
  expect(queued.has('cowboy-idle-special')).toBe(true);
  expect(queued.has('cowboy-victory')).toBe(true);
  expect(queued.has('cowboy-defeat')).toBe(true);
  expect(queued.has('cowboy-effect-shot')).toBe(true);
  expect(queued.has('sfx-perfect_block_1')).toBe(true);
  expect(queued.has('shoto-idle')).toBe(true);
  for (const fighter of ['shoto','cowboy','grappler','puppet']) expect(queued.has(`fighter-icon-${fighter}`)).toBe(true);
  expect(load.atlas).toHaveBeenCalled();
  for(const key of queued)textures.set(key,{});queued.clear();
  boot.create();
  const start=(boot as unknown as {scene:{start:ReturnType<typeof vi.fn>}}).scene.start;
  expect(start).toHaveBeenCalledWith('MenuScene');
  load.image.mockClear();load.atlas.mockClear();
  for(const mode of ['training','tutorial','versus','arcade'] as MatchMode[]) {
    for(const stage of stages) {
      const fight=new FightScene();Object.assign(fight,shared);
      fight.init({mode,stageId:stage.id,fighterId:'shoto'});fight.preload();
      expect([...queued],`${mode}/${stage.id} must not load after character confirmation`).toEqual([]);
    }
  }
  expect(load.image).not.toHaveBeenCalled();expect(load.atlas).not.toHaveBeenCalled();
});

it('starts the preparation scene before exposing any menu or fighter selection',async()=>{
  const {default:Phaser}=await import('phaser');
  const {MenuScene}=await import('../scenes/MenuScene');
  await import('../main');
  expect(Phaser.Game).toHaveBeenCalledWith(expect.objectContaining({scene:[BootScene,MenuScene,FightScene]}));
});
