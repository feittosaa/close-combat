import { afterEach, expect, it, vi } from 'vitest';
import { applyFrameCrops, frameAdjustments, framePlacement } from '../rendering/animations/frameAdjustments';

afterEach(() => frameAdjustments.clear());

/** A frame of a 640-pixel grid whose drawn part is the 200 × 400 rectangle at (100, 50) of the grid. */
function packedFrame() {
  const frame = { cutX: 10, cutY: 20, cutWidth: 200, cutHeight: 400, x: 100, y: 50, realWidth: 640, realHeight: 640, setSize: vi.fn(), setTrim: vi.fn() };
  frame.setSize.mockReturnValue(frame);
  return frame;
}
const texturesOf = (frame: ReturnType<typeof packedFrame>) => ({ exists: () => true, get: () => ({ getFrameNames: () => ['3'], get: () => frame }) }) as never;

it('desloca um desenho em frações do quadro, só enquanto o ajuste existe', () => {
  expect(framePlacement('texas', 'idle', 3)).toEqual({ x: 0, y: 0 });
  frameAdjustments.set('texas:idle:3', { x: .05, y: -.02 });
  expect(framePlacement('texas', 'idle', 3)).toEqual({ x: .05, y: -.02 });
});

it('corta só os pixels desenhados e volta ao original quando o corte sai', () => {
  const frame = packedFrame();
  frameAdjustments.set('texas:idle:3', { crop: { left: .25, top: 0, right: .25, bottom: 0 } });
  applyFrameCrops(texturesOf(frame), 'texas-idle');
  // The crop keeps x 160..480 of the grid; the drawing spans 100..300, so 160..300 stays.
  expect(frame.setSize).toHaveBeenLastCalledWith(140, 400, 70, 20);
  expect(frame.setTrim).toHaveBeenLastCalledWith(640, 640, 160, 50, 140, 400);
  frameAdjustments.clear();
  applyFrameCrops(texturesOf(frame), 'texas-idle');
  expect(frame.setSize).toHaveBeenLastCalledWith(200, 400, 10, 20);
  expect(frame.setTrim).toHaveBeenLastCalledWith(640, 640, 100, 50, 200, 400);
});

it('não mexe em quadros que nunca foram cortados', () => {
  const frame = packedFrame();
  applyFrameCrops(texturesOf(frame), 'texas-idle');
  expect(frame.setSize).not.toHaveBeenCalled();
});
