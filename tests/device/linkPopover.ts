/**
 * Helpers for the create-link flow on real devices — next to the tests that
 * use them, since only the link tests speak these concepts.
 */
import { MOBILE_TOOLBAR, PARAGRAPH, startEditing } from "./lib/editorPage.js";
import { pressSoftKeyboardEnter, tapElement } from "./lib/gestures.js";
import type { DeviceSession } from "./lib/session.js";

export const LINK_BUTTON = `${MOBILE_TOOLBAR} [data-test="createLink"]`;
export const LINK_POPOVER = ".bn-form-popover";

/**
 * Selects the first word of the first paragraph via a DOM range (ProseMirror
 * syncs its selection from `selectionchange`, so no editor handle is needed).
 * iOS intermittently collapses programmatic selections, so the wait re-applies
 * the range on every poll until the toolbar's link button confirms the editor
 * sees a non-empty selection.
 */
export async function selectFirstWord(session: DeviceSession): Promise<void> {
  const applyAndCheck = `
    if (getSelection().isCollapsed) {
      const p = document.querySelector(${JSON.stringify(PARAGRAPH)});
      const textNode = [...p.childNodes].find((n) => n.nodeType === 3) || p.firstChild;
      const range = document.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, Math.min(7, textNode.textContent.length));
      const selection = getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
    return {
      ok: !getSelection().isCollapsed
        && !!document.querySelector(${JSON.stringify(LINK_BUTTON)}),
    };`;
  await session.waitFor("selection + link button", applyAndCheck, 25_000);
}

/**
 * Opens the create-link popover from the mobile toolbar and waits for its URL
 * input to hold focus. A mis-aimed tap (iOS chrome-offset guessing) can hit
 * the keyboard's accessory bar and collapse the whole editing state, so each
 * attempt rebuilds editing + selection from scratch before tapping.
 */
export async function openLinkPopover(session: DeviceSession): Promise<void> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt < 4; attempt++) {
    await startEditing(session);
    await selectFirstWord(session);
    await session.exec(`
      const toolbar = document.querySelector(${JSON.stringify(MOBILE_TOOLBAR)});
      toolbar.querySelectorAll('*').forEach((el) => {
        if (el.scrollWidth > el.clientWidth + 5) el.scrollLeft = el.scrollWidth;
      });`);
    try {
      await tapElement(session, LINK_BUTTON, {
        keyboard: "open",
        verify: `
          const active = document.activeElement;
          return {
            ok: !!document.querySelector(${JSON.stringify(LINK_POPOVER)})
              && active && active.tagName === 'INPUT'
              && active.getAttribute('name') === 'url',
          };`,
      });
      return;
    } catch (error) {
      lastError = error as Error;
    }
  }
  throw new Error(`Could not open the link popover: ${lastError?.message}`);
}

/**
 * Types into a popover field and submits it by pressing the Enter key.
 *
 * On iOS that is a native tap on the on-screen keyboard's actual return key
 * (the real user gesture — see `pressSoftKeyboardEnter`'s offset ladder). On
 * Android, where BrowserStack blocks native taps, it is a W3C protocol Enter:
 * trusted input, so the browser still runs its default action and the real
 * submission path is exercised (key press -> implicit form submission -> the
 * popover's `submit` handling). Only Gboard's own choice of *which* action
 * its key performs stays out of reach, and on the manual release checklist.
 *
 * `verify` is a page script returning `{ ok: boolean }` observing the
 * submission's effect — the iOS tap ladder needs it to know a tap landed.
 */
export async function typeAndSubmit(
  session: DeviceSession,
  css: string,
  text: string,
  verify: string,
): Promise<void> {
  await session.elementValue(css, text);
  await pressSoftKeyboardEnter(session, verify);
}
