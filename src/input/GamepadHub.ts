import { getGamepadLayout, PAD } from './gamepadControls';
import type { AttackButton, Direction, FrameInput } from './types';

type PadSource = () => readonly (Gamepad | null)[];
/** Menu meaning of a press: the d-pad or stick moves, A/✕ confirms, B/○ goes back, Start and Select keep their own roles. */
export type PadAction = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'back' | 'start' | 'select';
/** A press of the controller playing as `player`: its menu meaning, if it has one, and the raw button (absent for the stick). */
export interface PadPress { player: 0 | 1; action?: PadAction; button?: number }
export type PadListener = (press: PadPress) => void;

const STICK_THRESHOLD = .5;
/** A held direction repeats in menus after this delay, then at this interval. */
const REPEAT_DELAY_MS = 350, REPEAT_EVERY_MS = 110;
/** Two taps toward the same side within this time are a dash, as on the keyboard. */
const DASH_WINDOW_MS = 200;
const BUTTON_ACTIONS: Readonly<Record<number, PadAction>> = {
  [PAD.south]: 'confirm', [PAD.east]: 'back', [PAD.start]: 'start', [PAD.select]: 'select',
  [PAD.up]: 'up', [PAD.down]: 'down', [PAD.left]: 'left', [PAD.right]: 'right',
};
const DIRECTION_BUTTONS = new Set<number>([PAD.up, PAD.down, PAD.left, PAD.right]);

/**
 * Browsers show `:focus-visible` only after keyboard use, so focus moved by a controller would stay invisible. After a
 * controller press this class marks the page and the styles treat `.pad-navigation :focus` like `:focus-visible`;
 * the mouse or the keyboard take it back.
 */
const PAD_NAVIGATION = 'pad-navigation';
if (typeof window !== 'undefined') for (const event of ['pointerdown', 'keydown']) {
  window.addEventListener(event, () => document.documentElement.classList.remove(PAD_NAVIGATION), true);
}

const browserPads: PadSource = () => (typeof navigator !== 'undefined' && navigator.getGamepads ? [...navigator.getGamepads()] : []);
const pressed = (pad: Gamepad, button: number): boolean => Boolean(pad.buttons[button]?.pressed);
type Side = 'up' | 'down' | 'left' | 'right';
/** The side the left stick points to, the stronger axis winning on a diagonal. */
function stickDirection(pad: Gamepad): Side | undefined {
  const [x = 0, y = 0] = pad.axes;
  if (Math.max(Math.abs(x), Math.abs(y)) < STICK_THRESHOLD) return undefined;
  return Math.abs(x) >= Math.abs(y) ? (x < 0 ? 'left' : 'right') : (y < 0 ? 'up' : 'down');
}
/** Screen directions held on the d-pad or the left stick. */
function heldDirections(pad: Gamepad): Record<Side, boolean> {
  const [x = 0, y = 0] = pad.axes;
  return {
    left: pressed(pad, PAD.left) || x <= -STICK_THRESHOLD, right: pressed(pad, PAD.right) || x >= STICK_THRESHOLD,
    up: pressed(pad, PAD.up) || y <= -STICK_THRESHOLD, down: pressed(pad, PAD.down) || y >= STICK_THRESHOLD,
  };
}

/**
 * Every connected controller, in connection order: the first plays as P1 and the second as P2; others are ignored.
 * Screens subscribe to presses, and only the most recent subscriber hears them, so a dialog over a menu takes the
 * controller and gives it back when it closes.
 */
export class GamepadHub {
  private readonly listeners: PadListener[] = [];
  private readonly held = new Map<number, Set<number>>();
  private readonly stick = new Map<number, Side | undefined>();
  private readonly repeat = new Map<number, { action: PadAction; next: number }>();
  private frame?: number;

  constructor(private readonly source: PadSource = browserPads, private readonly now: () => number = () => performance.now()) {}

  /** The controller playing as `player`, if one is connected. */
  pad(player: 0 | 1): Gamepad | undefined {
    return this.source().filter((pad): pad is Gamepad => Boolean(pad?.connected)).sort((a, b) => a.index - b.index)[player];
  }

  subscribe(listener: PadListener): () => void {
    this.listeners.push(listener);
    // Buttons already down (the one that opened this screen) do not count as new presses.
    this.held.clear(); this.stick.clear(); this.repeat.clear(); this.poll(true);
    if (this.frame === undefined && typeof requestAnimationFrame !== 'undefined') this.frame = requestAnimationFrame(this.loop);
    return () => {
      const index = this.listeners.lastIndexOf(listener);
      if (index >= 0) this.listeners.splice(index, 1);
      this.held.clear(); this.stick.clear(); this.repeat.clear(); this.poll(true);
    };
  }

  private readonly loop = (): void => {
    this.frame = undefined;
    if (!this.listeners.length) return;
    this.poll();
    this.frame = requestAnimationFrame(this.loop);
  };

  /** Reads every controller once and sends new presses (and repeats of held directions) to the newest subscriber. */
  poll(silent = false): void {
    const time = this.now();
    for (const player of [0, 1] as const) {
      const pad = this.pad(player);
      const before = this.held.get(player) ?? new Set<number>(), buttons = new Set<number>();
      pad?.buttons.forEach((button, index) => { if (button.pressed) buttons.add(index); });
      const stick = pad && stickDirection(pad), stickBefore = this.stick.get(player);
      this.held.set(player, buttons); this.stick.set(player, stick);
      if (silent) continue;
      const startRepeat = (action: PadAction) => this.repeat.set(player, { action, next: time + REPEAT_DELAY_MS });
      for (const button of buttons) if (!before.has(button)) {
        const action = BUTTON_ACTIONS[button];
        this.emit({ player, button, ...(action ? { action } : {}) });
        if (DIRECTION_BUTTONS.has(button)) startRepeat(action!);
      }
      // The stick moves menus like the d-pad: one step when it leaves the centre or turns, then the same repeat.
      if (stick && stick !== stickBefore && ![...buttons].some(button => DIRECTION_BUTTONS.has(button))) { this.emit({ player, action: stick }); startRepeat(stick); }
      const repeating = this.repeat.get(player), directions = pad && heldDirections(pad);
      if (repeating && !directions?.[repeating.action as Side]) this.repeat.delete(player);
      else if (repeating && time >= repeating.next) { this.emit({ player, action: repeating.action }); repeating.next = time + REPEAT_EVERY_MS; }
    }
  }

  private emit(press: PadPress): void {
    if (typeof document !== 'undefined') document.documentElement.classList.add(PAD_NAVIGATION);
    this.listeners[this.listeners.length - 1]?.(press);
  }
}

export const gamepads = new GamepadHub();

/**
 * Fight input of one controller, read once per simulation step like `KeyboardInput`: directions relative to the
 * opponent, the player's remappable buttons and a dash on two quick taps toward the same side.
 */
export class GamepadInput {
  private readonly waitingForRelease = new Set<number>();
  private lastSide?: 'left' | 'right';
  private lastTap?: { side: 'left' | 'right'; time: number };

  constructor(private readonly player: 0 | 1, private readonly hub: GamepadHub = gamepads, private readonly now: () => number = () => performance.now()) {}

  read(facing: 'left' | 'right' = 'right'): FrameInput {
    const pad = this.hub.pad(this.player);
    if (!pad) { this.lastSide = undefined; return { direction: 'N', buttons: new Set() }; }
    const layout = getGamepadLayout(this.player);
    const held = (button: number) => pressed(pad, button) && !this.waitingForRelease.has(button);
    for (const button of this.waitingForRelease) if (!pressed(pad, button)) this.waitingForRelease.delete(button);
    const { left, right, up, down } = heldDirections(pad);
    const side = left === right ? undefined : left ? 'left' : 'right';
    let dash: 'F' | 'B' | undefined;
    if (side && side !== this.lastSide) {
      const time = this.now();
      if (this.lastTap?.side === side && time - this.lastTap.time <= DASH_WINDOW_MS) { dash = (side === 'right') === (facing === 'right') ? 'F' : 'B'; this.lastTap = undefined; }
      else this.lastTap = { side, time };
    }
    this.lastSide = side;
    const toward = facing === 'right' ? right : left, away = facing === 'right' ? left : right;
    const horizontal = toward === away ? '' : toward ? 'F' : 'B', vertical = up === down ? '' : up ? 'U' : 'D';
    const direction = (vertical && horizontal ? `${vertical}${horizontal}` : vertical || horizontal || 'N') as Direction;
    const buttons = new Set<AttackButton>((['1', '2', '3', '4'] as const).filter(button => held(layout.buttons[button])));
    return { direction, buttons, ...(dash ? { dash } : {}), ...(held(layout.ultimate) ? { ultimate: true } : {}),
      ...(held(layout.taunt) ? { taunt: true } : {}), ...(held(layout.rageAction) ? { rageAction: true } : {}) };
  }

  /** Buttons held through a reset, pause or round start must be released before they count again. */
  clear(): void {
    const pad = this.hub.pad(this.player);
    pad?.buttons.forEach((button, index) => { if (button.pressed) this.waitingForRelease.add(index); });
    this.lastTap = undefined;
  }
}

/** One player's keyboard and controller together: either can move, and buttons of both count. */
export function mergeInputs(keyboard: FrameInput, pad: FrameInput): FrameInput {
  const dash = keyboard.dash ?? pad.dash;
  return {
    direction: keyboard.direction !== 'N' ? keyboard.direction : pad.direction,
    buttons: new Set([...keyboard.buttons, ...pad.buttons]),
    ...(dash ? { dash } : {}),
    ...(keyboard.ultimate || pad.ultimate ? { ultimate: true } : {}),
    ...(keyboard.taunt || pad.taunt ? { taunt: true } : {}),
    ...(keyboard.rageAction || pad.rageAction ? { rageAction: true } : {}),
  };
}
