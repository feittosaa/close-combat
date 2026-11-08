import type { PadAction } from '../input/GamepadHub';

const FOCUSABLE = 'button:not([disabled]), select, input:not([type="hidden"])';

/**
 * Controller navigation of a dialog: up/down walk through its controls in order, left/right change a list or slider
 * (and otherwise walk too), confirm clicks the focused control. Returns whether the press was used.
 */
export function navigateFocus(root: HTMLElement, action: PadAction): boolean {
  const controls = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(node => node.getClientRects().length > 0);
  if (!controls.length) return false;
  const focused = document.activeElement instanceof HTMLElement && root.contains(document.activeElement) ? document.activeElement : undefined;
  if ((action === 'left' || action === 'right') && focused && adjust(focused, action === 'left' ? -1 : 1)) return true;
  if (action === 'up' || action === 'down' || action === 'left' || action === 'right') {
    const index = focused ? controls.indexOf(focused) : -1, step = action === 'up' || action === 'left' ? -1 : 1;
    controls[index < 0 ? 0 : (index + step + controls.length) % controls.length].focus();
    return true;
  }
  if (action === 'confirm' && focused) { focused.click(); return true; }
  return false;
}

/** Steps a list's option or a slider's value, firing the same events as a user change. */
function adjust(control: HTMLElement, step: -1 | 1): boolean {
  if (control instanceof HTMLSelectElement) {
    const index = Math.min(control.options.length - 1, Math.max(0, control.selectedIndex + step));
    if (index !== control.selectedIndex) { control.selectedIndex = index; control.dispatchEvent(new Event('change')); }
    return true;
  }
  if (control instanceof HTMLInputElement && control.type === 'range') {
    if (step > 0) control.stepUp(); else control.stepDown();
    control.dispatchEvent(new Event('input'));
    return true;
  }
  return false;
}
