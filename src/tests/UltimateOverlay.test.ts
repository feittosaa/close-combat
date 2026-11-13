import { expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { UltimateOverlay } from '../ui/UltimateOverlay';

it.each(['saloon', 'saloon-dia', 'saloon-noite', 'fazenda', 'sala-treino'])('renders the %s ultimate above the stage and below fighters', stage => {
  const image = { width:1600, height:900, setScrollFactor:vi.fn(), setDepth:vi.fn(), setVisible:vi.fn(),
    setPosition:vi.fn(), setOrigin:vi.fn(), setSize:vi.fn(), setScale:vi.fn(), setDisplaySize:vi.fn(), setRotation:vi.fn(), setAlpha:vi.fn(), destroy:vi.fn() };
  for (const value of Object.values(image)) if (typeof value === 'function') value.mockReturnValue(image);
  const scene = { add: { image: vi.fn(() => image), rectangle: vi.fn(() => image) }, cameras: { main: { zoom:2 } }, scale: { width:1920, height:1080 } };
  const overlay = new UltimateOverlay(scene as unknown as Phaser.Scene, stage);
  const theme = stage.startsWith('saloon') ? 'saloon' : stage;
  expect(scene.add.image).toHaveBeenCalledWith(0, 0, `presentation:${theme}:ultimate`);
  expect(image.setDepth).toHaveBeenCalledWith(0);
  overlay.update(true, 350);
  expect(image.setAlpha).toHaveBeenLastCalledWith(.9);
  expect(image.setVisible).toHaveBeenLastCalledWith(true);
  overlay.update(false, 0);
  expect(image.setVisible).toHaveBeenLastCalledWith(false);
  overlay.destroy(); expect(image.destroy).toHaveBeenCalled();
});

it.each([[1920,1080], [2560,1080], [720,1280]])('aligns the frame with all edges of a %i×%i viewport', (width,height) => {
  const object = {width:1600,height:900,setScrollFactor:vi.fn(),setDepth:vi.fn(),setVisible:vi.fn(),
    setPosition:vi.fn(),setSize:vi.fn(),setDisplaySize:vi.fn(),setAlpha:vi.fn(),destroy:vi.fn()};
  Object.values(object).forEach(value=>{if(typeof value==='function')value.mockReturnValue(object);});
  const scene={add:{image:()=>object,rectangle:()=>object},cameras:{main:{zoom:2}},scale:{width,height}};
  const overlay=new UltimateOverlay(scene as unknown as Phaser.Scene,'fazenda');
  overlay.update(true,350);
  expect(object.setPosition).toHaveBeenLastCalledWith(width/2,height/2);
  expect(object.setDisplaySize).toHaveBeenLastCalledWith(width/2,height/2);
  overlay.destroy();
});

it('dims the stage behind the transparent ultimate frame and restores it afterwards', () => {
  const makeObject = () => {
    const object = {setScrollFactor:vi.fn(),setDepth:vi.fn(),setVisible:vi.fn(),setPosition:vi.fn(),setSize:vi.fn(),setDisplaySize:vi.fn(),setAlpha:vi.fn(),destroy:vi.fn()};
    Object.values(object).forEach(method => method.mockReturnValue(object));
    return object;
  };
  const dimmer = makeObject(), image = makeObject();
  const scene = {add:{rectangle:vi.fn(() => dimmer),image:vi.fn(() => image)},cameras:{main:{zoom:2}},scale:{width:1920,height:1080}};
  const overlay = new UltimateOverlay(scene as unknown as Phaser.Scene, 'fazenda');
  expect(dimmer.setDepth).toHaveBeenCalledWith(-0.1);
  overlay.update(true, 350);
  expect(dimmer.setSize).toHaveBeenLastCalledWith(960, 540);
  expect(dimmer.setAlpha).toHaveBeenLastCalledWith(.9);
  expect(dimmer.setVisible).toHaveBeenLastCalledWith(true);
  overlay.update(false, 0);
  expect(dimmer.setVisible).toHaveBeenLastCalledWith(false);
  overlay.destroy();
  expect(dimmer.destroy).toHaveBeenCalled();
});
