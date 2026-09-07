import type { FocusEvent } from "react";

/**
 * Props for a Base UI Menu / Select popup that make `preventFocusOnOpen` hold.
 *
 * Base UI always moves focus into these popups when they open (floating-ui's
 * `FloatingFocusManager`; `initialFocus` exists on Popover and Dialog only).
 * That is upstream's position, not a gap: a menu "is supposed to only contain
 * menu items", so focus belongs in it
 * (https://github.com/mui/base-ui/issues/2143#issuecomment-2993226778), and on touch
 * "focus should always go to the Popup element" to keep the virtual keyboard
 * closed (https://github.com/mui/base-ui/issues/714). Our mobile toolbar
 * starts from the opposite situation, the keyboard is open and must stay open.
 * On the mobile toolbar the library's focus move is fatal:
 * Android hides the on-screen keyboard as soon as a non-editable element has
 * focus, the toolbar hides with the keyboard, and the popup, a child of the
 * toolbar, is gone about 150 ms after it opened.
 *
 * So focus arriving from outside the popup (the editor) goes straight back
 * where it came from, in the same task, before the keyboard reacts. The focus
 * manager does not read that as "focus left": it ignores a `focusout` whose
 * target is the element that was focused before the popup opened.
 */
export function preventFocusOnOpenProps(enabled: boolean) {
  if (!enabled) {
    return {};
  }
  return {
    onFocusCapture(event: FocusEvent<HTMLElement>) {
      const from = event.relatedTarget;
      if (from instanceof HTMLElement && !event.currentTarget.contains(from)) {
        from.focus({ preventScroll: true });
      }
    },
  };
}
