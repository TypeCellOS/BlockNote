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
