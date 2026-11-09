import type { AttackButton, Direction, FrameInput } from '../input/types';

/**
 * One press of a route: `wait` simulation frames after the previous press (or the start),
 * `command` in the universal notation (`1`, `d+1`, `1+2`, `d,df,f,2`) or `uf` for a forward jump.
 */
export interface RouteStep { wait: number; command: string }
/** Inputs found by `scripts/find-combo-routes.ts` and checked in the real simulation. */
export interface ComboRoute { steps: readonly RouteStep[]; hits: number; damage: number; moveIds: readonly string[] }
export interface AdvancedRoute extends ComboRoute { notation: string; difficulty: number }
export interface FighterRoutes { lessons: Readonly<Record<string, ComboRoute>>; advanced: readonly AdvancedRoute[] }

const DIRECTIONS: Readonly<Record<string, Direction>> = { f: 'F', b: 'B', u: 'U', d: 'D', df: 'DF', fd: 'DF', db: 'DB', bd: 'DB', uf: 'UF', ub: 'UB' };
const isButton = (value: string): value is AttackButton => ['1', '2', '3', '4'].includes(value);

export interface ParsedCommand { motion: readonly Direction[]; direction: Direction; buttons: readonly AttackButton[]; hold: Direction }
/** Motion directions take one frame each before the press; a crouching press keeps down held until the next press. */
export function parseCommand(command: string): ParsedCommand {
  const parts = command.split(',');
  const last = parts.pop()!;
  const motion = parts.map(part => DIRECTIONS[part]);
  if (motion.some(direction => !direction)) throw new Error(`Invalid command: ${command}`);
  if (DIRECTIONS[last]) return { motion, direction: DIRECTIONS[last], buttons: [], hold: 'N' };
  const crouching = last.startsWith('d+');
  const buttons = (crouching ? last.slice(2) : last).split('+');
  if (!buttons.every(isButton)) throw new Error(`Invalid command: ${command}`);
  return { motion, direction: crouching ? 'D' : motion[motion.length - 1] ?? 'N', buttons, hold: crouching ? 'D' : 'N' };
}

/** Frame-by-frame inputs for player one, relative to the opponent, followed by `tail` neutral frames. */
export function routeInputs(steps: readonly RouteStep[], tail = 0): FrameInput[] {
  const frames: FrameInput[] = [];
  let hold: Direction = 'N';
  for (const step of steps) {
    const command = parseCommand(step.command);
    const idle = step.wait - command.motion.length - 1;
    if (idle < (frames.length ? 1 : 0)) throw new Error(`Wait too short for ${step.command}: ${step.wait}`);
    for (let frame = 0; frame < idle; frame++) frames.push({ direction: hold, buttons: new Set() });
    for (const direction of command.motion) frames.push({ direction, buttons: new Set() });
    frames.push({ direction: command.direction, buttons: new Set(command.buttons) });
    hold = command.hold;
  }
  for (let frame = 0; frame < tail; frame++) frames.push({ direction: hold, buttons: new Set() });
  return frames;
}

/** Minimum `wait` for a command: its motion plus one released frame after the previous press. */
export const minimumWait = (command: string, first: boolean): number => parseCommand(command).motion.length + (first ? 1 : 2);
