import { describe, expect, it } from 'vitest';
import { GamepadHub, GamepadInput, mergeInputs, type PadPress } from '../input/GamepadHub';
import { defaultGamepadLayouts, PAD, validateGamepadLayouts } from '../input/gamepadControls';

type FakePad = { index: number; id: string; connected: boolean; buttons: { pressed: boolean }[]; axes: number[] };
const fakePad = (index: number): FakePad => ({ index, id: `pad ${index}`, connected: true, buttons: Array.from({ length: 17 }, () => ({ pressed: false })), axes: [0, 0] });
const press = (pad: FakePad, button: number, down = true) => { pad.buttons[button] = { pressed: down }; };
const setup = (count = 1) => {
  const pads = Array.from({ length: count }, (_, index) => fakePad(index));
  let time = 0;
  const hub = new GamepadHub(() => pads as unknown as Gamepad[], () => time);
  return { pads, hub, advance: (ms: number) => { time += ms; }, clock: () => time };
};

describe('controle', () => {
  it('mapeamento padrão: socos nos botões de cima, chutes nos de baixo; botões repetidos ou reservados são recusados', () => {
    const [layout] = defaultGamepadLayouts();
    expect(layout.buttons).toEqual({ '1': PAD.west, '2': PAD.north, '3': PAD.south, '4': PAD.east });
    expect(validateGamepadLayouts(defaultGamepadLayouts())).toBe(true);
    const repeated = defaultGamepadLayouts(); repeated[0].ultimate = repeated[0].buttons['1'];
    expect(validateGamepadLayouts(repeated)).toBe(false);
    const reserved = defaultGamepadLayouts(); reserved[1].taunt = PAD.start;
    expect(validateGamepadLayouts(reserved)).toBe(false);
  });

  it('o primeiro controle joga como P1 e o segundo como P2, na ordem de conexão', () => {
    const { pads, hub } = setup(2);
    pads.reverse();
    expect(hub.pad(0)?.id).toBe('pad 0');
    expect(hub.pad(1)?.id).toBe('pad 1');
    pads[1].connected = false;
    expect(hub.pad(0)?.id).toBe('pad 1');
    expect(hub.pad(1)).toBeUndefined();
  });

  it('na luta lê direções relativas ao adversário, botões do mapeamento e o analógico', () => {
    const { pads, hub } = setup();
    const input = new GamepadInput(0, hub, () => 0);
    press(pads[0], PAD.left); press(pads[0], PAD.west); press(pads[0], PAD.rightTrigger);
    expect(input.read('right')).toMatchObject({ direction: 'B', ultimate: true });
    expect([...input.read('left').buttons]).toEqual(['1']);
    expect(input.read('left').direction).toBe('F');
    press(pads[0], PAD.left, false); pads[0].axes = [.9, .8];
    expect(input.read('right').direction).toBe('DF');
  });

  it('dois toques rápidos para o mesmo lado fazem dash, e botões segurados num reset só voltam a valer depois de soltos', () => {
    const { pads, hub, advance, clock } = setup();
    const input = new GamepadInput(0, hub, clock);
    press(pads[0], PAD.right); input.read('right');
    press(pads[0], PAD.right, false); input.read('right'); advance(120);
    press(pads[0], PAD.right);
    expect(input.read('right').dash).toBe('F');
    press(pads[0], PAD.south); input.clear();
    expect(input.read('right').buttons.size).toBe(0);
    press(pads[0], PAD.south, false); input.read('right'); press(pads[0], PAD.south);
    expect([...input.read('right').buttons]).toEqual(['3']);
  });

  it('nos menus cada aperto conta uma vez, a direção segurada repete e só a tela mais recente recebe', () => {
    const { pads, hub, advance } = setup();
    const menu: PadPress[] = [], dialog: PadPress[] = [];
    hub.subscribe(entry => menu.push(entry));
    press(pads[0], PAD.south); hub.poll(); hub.poll();
    expect(menu).toEqual([{ player: 0, button: PAD.south, action: 'confirm' }]);
    const close = hub.subscribe(entry => dialog.push(entry));
    hub.poll();
    expect(dialog).toEqual([]);
    press(pads[0], PAD.south, false); press(pads[0], PAD.down); hub.poll();
    advance(349); hub.poll(); advance(1); hub.poll(); advance(110); hub.poll();
    expect(dialog.map(entry => entry.action)).toEqual(['down', 'down', 'down']);
    close(); press(pads[0], PAD.down, false); pads[0].axes = [-1, 0]; hub.poll();
    expect(menu.slice(1).map(entry => entry.action)).toEqual(['left']);
  });

  it('teclado e controle do mesmo jogador se somam', () => {
    const merged = mergeInputs({ direction: 'N', buttons: new Set(['1']) }, { direction: 'DF', buttons: new Set(['3']), rageAction: true });
    expect(merged).toMatchObject({ direction: 'DF', rageAction: true });
    expect([...merged.buttons]).toEqual(['1', '3']);
  });
});
