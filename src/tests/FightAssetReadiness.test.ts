import { expect, it, vi } from 'vitest';
vi.mock('phaser',()=>({default:{Scene:class {},Game:vi.fn(),Scale:{FIT:0,CENTER_BOTH:0},Textures:{FilterMode:{LINEAR:0}}}}));
vi.mock('../rendering/animations/prepareShotoPalette',()=>({prepareShotoPalette:vi.fn()}));
import { BootScene } from '../scenes/BootScene';
import { FightScene } from '../scenes/FightScene';
import { prepareShotoPalette } from '../rendering/animations/prepareShotoPalette';
import { stages, stageTextureKey } from '../rendering/stages/stageCatalog';
import type { MatchMode } from '../scenes/matchSetup';

it('prepares every match resource before releasing the menu; every mode starts with an empty loader queue',()=>{
  const textures=new Map<string,object>();
  const queued=new Set<string>();
  const load={image:vi.fn((key:string)=>queued.add(key)),atlas:vi.fn((key:string)=>queued.add(key))};
  const text={setOrigin:vi.fn()};
  const camera={setOrigin:vi.fn(),setZoom:vi.fn(),setScroll:vi.fn()};
  Object.values(camera).forEach(method=>method.mockReturnValue(camera));
  const shared={textures:{exists:(key:string)=>textures.has(key)},load};
  const boot=new BootScene();
  Object.assign(boot,shared,{cameras:{main:camera},scale:{width:1920,height:1080},add:{text:()=>text},scene:{start:vi.fn()}});
  boot.preload();
  for(const stage of stages)for(const layer of stage.layers)expect(queued.has(stageTextureKey(stage,layer))).toBe(true);
  expect(queued.has('menu-solar')).toBe(true);
  expect(load.atlas).toHaveBeenCalledTimes(23);
  for(const key of queued)textures.set(key,{});queued.clear();
  vi.mocked(prepareShotoPalette).mockClear();
  boot.create();
  expect(prepareShotoPalette).toHaveBeenCalledWith(boot,expect.arrayContaining(['shoto-idle','shoto-jump','shoto-ultimate-drink']));
  const start=(boot as unknown as {scene:{start:ReturnType<typeof vi.fn>}}).scene.start;
  expect(start).toHaveBeenCalledWith('MenuScene');
  expect(vi.mocked(prepareShotoPalette).mock.invocationCallOrder[0]).toBeLessThan(start.mock.invocationCallOrder[0]);
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
