import { describe, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { stages } from '../rendering/stages/stageCatalog';
import { StageView } from '../rendering/stages/StageView';
import { createStageLayout, getFightCameraFrame, getStageArenaBounds } from '../rendering/stages/stageLayout';
import { createGameConfig } from '../engine/data/gameConfig';

// StageView only needs the Scene surface below; keep the Node test independent of browser APIs.
vi.mock('phaser', () => ({ default: {} }));

// Uses the real catalog: every newly registered stage must satisfy this contract.
describe.each(stages)('camera and ground contract: $id', stage => {
  it.each([[640, 360], [1024, 576], [1280, 720], [1920, 1080]])('preserves the floor and image bounds at %ix%i', (width, height) => {
    const config = createGameConfig(width, height);
    const layout = createStageLayout(stage, width, height, config.arena.floorY);
    const { left, right } = getStageArenaBounds(layout);

    for (let fraction = 0; fraction <= 20; fraction++) {
      const span = (right - left) * fraction / 20;
      const center = (left + right) / 2;
      const frame = getFightCameraFrame(layout, [center - span / 2, center + span / 2]);
      const projectY = (y: number) => height / 2 + (y - frame.scrollY - height / 2) * frame.zoom;
      expect(projectY(config.arena.floorY)).toBeCloseTo(config.arena.floorY, 8);
      expect(projectY(layout.originY + stage.groundY * layout.scale)).toBeCloseTo(config.arena.floorY, 8);
      expect(projectY(layout.originY)).toBeLessThanOrEqual(1e-7);
      expect(projectY(layout.originY + stage.referenceSize.height * layout.scale)).toBeGreaterThanOrEqual(height - 1e-7);
      expect(frame.zoom).toBe(1.6);
    }
    for (const positions of [[left, left + 40], [left, left + config.arena.maxSeparation!], [right - 40, right], [right, right - config.arena.maxSeparation!]]) {
      const frame = getFightCameraFrame(layout, positions);
      const visibleLeft = frame.scrollX + width / 2 - width / (2 * frame.zoom);
      const visibleRight = visibleLeft + width / frame.zoom;
      expect(visibleLeft).toBeGreaterThanOrEqual(-1e-7);
      expect(visibleRight).toBeLessThanOrEqual(layout.worldWidth + 1e-7);
      for (const x of positions) expect(x).toBeGreaterThanOrEqual(visibleLeft);
      for (const x of positions) expect(x).toBeLessThanOrEqual(visibleRight);
    }
  });

  it('applies equal X/Y zoom and the same vertical scroll to scenery and fighters', () => {
    const camera = { removeBounds: vi.fn(), setOrigin: vi.fn(), setZoom: vi.fn(), setScroll: vi.fn() };
    const layers = stage.layers.flatMap(() => Array.from({length: 3}, () => {
      const image = { setOrigin: vi.fn(), setScale: vi.fn(), setDepth: vi.fn(), setScrollFactor: vi.fn(), setFlipX: vi.fn(), setPosition: vi.fn(), width: stage.referenceSize.width, height: stage.referenceSize.height, destroy: vi.fn() };
      Object.values(image).forEach(fn => { if (typeof fn === 'function') fn.mockReturnValue(image); });
      return image;
    }));
    const backdrop = { ...layers[0] };
    let index = 0;
    const scene = {
      textures: { get: () => ({ getSourceImage: () => stage.referenceSize }) },
      add: { image: () => layers[index++] ?? backdrop }, cameras: { main: camera },
    } as unknown as Phaser.Scene;
    const layout = createStageLayout(stage, 1024, 576, 488);
    const view = new StageView(scene, stage, layout);
    for (const positions of [[744, 840], [304, 1280]]) {
      view.sync(positions);
      const [zoomX, zoomY = zoomX] = camera.setZoom.mock.lastCall!;
      expect(zoomX).toBe(zoomY);
      const [, scrollY] = camera.setScroll.mock.lastCall!;
      const projectedFeet = 288 + (488 - scrollY - 288) * zoomY;
      expect(projectedFeet).toBeCloseTo(488, 8);
    }
    expect(camera.removeBounds).toHaveBeenCalled();
    stage.layers.forEach((layer, i) => expect(layers[i * 3 + 1].setScrollFactor).toHaveBeenCalledWith(layer.parallax, 1));
    view.destroy();
    expect(camera.setZoom).toHaveBeenLastCalledWith(1);
    expect(camera.setScroll).toHaveBeenLastCalledWith(0, 0);
  });
});

it.each(stages)('tracks the highest fighter and preserves scenery scale and coverage: $id', stage => {
  const layout=createStageLayout(stage,1024,576,488);
  const extension = stage.topExtension ?? 0;
  const oldLayout=createStageLayout({...stage,topExtension:0,groundY:stage.groundY-extension,referenceSize:{width:stage.referenceSize.width,height:stage.referenceSize.height-extension}},1024,576,488);
  expect(layout.scale).toBe(oldLayout.scale);
  expect(layout.worldWidth).toBe(oldLayout.worldWidth);
  const grounded=getFightCameraFrame(layout,[400,500],[488,488]);
  const high=getFightCameraFrame(layout,[400,500],[388,450]);
  expect(high).toEqual(getFightCameraFrame(layout,[400,500],[450,388]));
  expect(high.scrollX).toBe(grounded.scrollX);
  expect(high.zoom).toBe(grounded.zoom);
  expect(high.scrollY).toBeLessThan(grounded.scrollY);
  const falling=getFightCameraFrame(layout,[400,500],[438,488]);
  expect(grounded.scrollY-falling.scrollY).toBeCloseTo(30);
  expect(falling.scrollY).toBeGreaterThan(high.scrollY);
  expect(falling.scrollY).toBeLessThan(grounded.scrollY);
  expect(getFightCameraFrame(layout,[400,500],[488,488])).toEqual(grounded);
  for(const rise of [0,50,100,300]){
    const frame=getFightCameraFrame(layout,[400,500],[488-rise,488]);
    const project=(y:number)=>288+(y-frame.scrollY-288)*frame.zoom;
    expect(project(layout.originY)).toBeLessThanOrEqual(0);
    expect(project(layout.originY+stage.referenceSize.height*layout.scale)).toBeGreaterThanOrEqual(576);
    expect(project(488)).toBeLessThanOrEqual(560);
  }
});
