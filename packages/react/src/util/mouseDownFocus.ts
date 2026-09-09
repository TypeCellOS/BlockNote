import { isSafari, isTouchDevice } from "@blocknote/core";
import type { MouseEvent } from "react";

/**
 * `onMouseDown` for a UI element that must not take focus from a tap: toolbar
 * buttons, dropdown triggers, menu items and select options.
 *
 * On touch, cancels the default action so a tap does not move focus off the
 * editor, which would close the on-screen keyboard; the click still fires.
 * `mousedown` is the compat event that moves focus. Cancelling `pointerdown`
 * instead would suppress the synthesized click on iOS WebKit, so a button that
 * opens a popover would never toggle it.
 *
 * On Safari, focuses the button, which Safari alone does not do on mousedown,
 * so focus behaves as in the other browsers.
 *
 * Possible follow-up: always cancel the default, on every device and browser,
 * so a pointer never focuses these elements and both branches above go away;
 * see the last section of `editor/focus-management.md`.
 *
 * A UI library that injects its own `onMouseDown` into a trigger still needs
 * its event (Base UI's menu trigger opens on it): spread the library's props
 * first and forward to its handler after this one, unconditionally. Cancelling
 * the default only cancels the focus move.
 */
export function preventFocusOnTap(event: MouseEvent<HTMLElement>) {
  // How-to-test: without the touch branch, every tap on a toolbar button or dropdown trigger focuses it and closes the keyboard (covered by 13 skinFocus cases, android, all skins).
  if (isTouchDevice()) {
    event.preventDefault();
    return;
  }

  if (isSafari()) {
    event.currentTarget.focus();
  }
}
