import { expect, it, vi } from 'vitest';
vi.mock('phaser',()=>({default:{Scene:class {},Game:vi.fn(),Scale:{FIT:0,CENTER_BOTH:0},Textures:{FilterMode:{LINEAR:0}}}}));
import { BootScene } from '../scenes/BootScene';
import { FightScene } from '../scenes/FightScene';
import { stages, stageTextureKey } from '../rendering/stages/stageCatalog';
import type { MatchMode } from '../scenes/matchSetup';

it('keeps the available wallpaper on the loading screen and removes it afterwards', () => {
  vi.useFakeTimers();
  const screen = {className:'', textContent:'', style:{backgroundImage:''}, setAttribute:vi.fn(), remove:vi.fn()};
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
    const first = screen.style.backgroundImage;
    vi.advanceTimersByTime(3500);
    expect(screen.style.backgroundImage).toBe(first);
    expect(sessionStorage.setItem).toHaveBeenCalledTimes(2);
    boot.create();
    expect(screen.remove).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    vi.unstubAllGlobals(); vi.useRealTimers();
  }
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
  expect(queued.has('cowboy-idle')).toBe(true);
  expect(queued.has('cowboy-idle-special')).toBe(true);
  expect(queued.has('cowboy-victory')).toBe(true);
  expect(queued.has('cowboy-defeat')).toBe(true);
  expect(queued.has('cowboy-effect-shot')).toBe(true);
  expect(queued.has('sfx-perfect_block_1')).toBe(true);
  expect([...queued].some(key => key.startsWith('shoto-'))).toBe(false);
  for (const fighter of ['shoto','cowboy','grappler','puppet']) expect(queued.has(`fighter-icon-${fighter}`)).toBe(true);
  expect(load.atlas).toHaveBeenCalled();
  for(const key of queued)textures.set(key,{});queued.clear();
  boot.create();
  const start=(boot as unknown as {scene:{start:ReturnType<typeof vi.fn>}}).scene.start;
  expect(start).toHaveBeenCalledWith('MenuScene');
  load.image.mockClear();load.atlas.mockClear();
  for(const mode of ['training','tutorial','combo-tutorial','versus','arcade'] as MatchMode[]) {
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
