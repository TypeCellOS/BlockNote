/**
 * BlockNote page helpers for device tests: everything here speaks in editor
 * concepts (blocks, toolbar, popovers) and hides the gesture mechanics.
 *
 * The pages under test are the playground examples, reached through the
 * tunnel (`bs-local.com`, resolved on-device by BrowserStackLocal).
 */
import { tapElement } from "./gestures.js";
import type { DeviceSession } from "./webdriver.js";

/**
 * Where the *device* loads the app from: the same port the host-side target
 * serves on, reached through `bs-local.com` — which BrowserStackLocal
 * resolves on the device back to this machine.
 */
function deviceOrigin(): string {
  const target = process.env.DEVICE_TEST_TARGET ?? "http://127.0.0.1:5173";
  return `http://bs-local.com:${new URL(target).port || "80"}`;
}

export const EDITOR = ".bn-editor";
export const PARAGRAPH = ".bn-editor .bn-inline-content";
export const MOBILE_TOOLBAR = ".bn-mobile-formatting-toolbar";
export const LINK_BUTTON = `${MOBILE_TOOLBAR} [data-test="createLink"]`;
export const LINK_POPOVER = ".bn-form-popover";
export const BLOCK = '.bn-editor [data-node-type="blockContainer"]';

export async function openExample(
  session: DeviceSession,
  route: string,
): Promise<void> {
  // Cold dev-server transforms through the tunnel can stall a first load;
  // one reload recovers it.
  for (let attempt = 0; attempt < 2; attempt++) {
    await session.navigate(`${deviceOrigin()}${route}`);
    try {
      await session.waitFor(
        "editor rendered",
        `return { ok: !!document.querySelector(${JSON.stringify(PARAGRAPH)}) };`,
        60_000,
      );
      return;
    } catch (error) {
      if (attempt === 1) {
        throw error;
      }
    }
  }
}

export type DocState = {
  blockCount: number;
  text: string;
  links: string[];
};

/** Snapshot of the first editor's document, for before/after assertions. */
export async function docState(session: DeviceSession): Promise<DocState> {
  return await session.exec<DocState>(`
    const editor = document.querySelector(${JSON.stringify(EDITOR)});
    return {
      blockCount: editor.querySelectorAll('[data-node-type="blockContainer"]').length,
      text: editor.textContent,
      links: [...editor.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')),
    };`);
}

/** Viewport height; a drop of >150 CSS px from baseline = keyboard open. */
export async function viewportHeight(session: DeviceSession): Promise<number> {
  return await session.exec<number>(
    `return Math.round(visualViewport.height);`,
  );
}

/**
 * Taps into the editor so the on-screen keyboard opens and the mobile toolbar
 * appears. Safe to call when already editing.
 */
export async function startEditing(session: DeviceSession): Promise<void> {
  const already = await session.exec<boolean>(
    `return !!document.querySelector(${JSON.stringify(MOBILE_TOOLBAR)});`,
  );
  if (already) {
    return;
  }
  await session.exec(
    `document.querySelector(${JSON.stringify(PARAGRAPH)}).scrollIntoView({ block: 'center' });`,
  );
  await tapElement(session, PARAGRAPH, {
    keyboard: "closed",
    verify: `return { ok: !!document.querySelector(${JSON.stringify(MOBILE_TOOLBAR)}) };`,
    verifyTimeoutMs: 15_000,
  });
}

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
