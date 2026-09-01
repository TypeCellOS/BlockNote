import type { BrowserCommand } from "vite-plus/test/node";

/**
 * Re-applies the touch emulation the android instance's Playwright
 * `contextOptions` established. Chromium's beyond-viewport screenshot
 * capture (`Page.captureScreenshot` with `captureBeyondViewport: true`,
 * which Playwright sends for any element taller than the viewport) can
 * silently drop the context's emulation overrides — `maxTouchPoints`
 * becomes 0 for every later test. `vitestSetup.browser.ts` calls this
 * before each file on the android instance.
 *
 * The CDP session is deliberately cached and never detached:
 * Emulation-domain overrides revert when the session that set them
 * detaches (learned the hard way — a detaching version of this command
 * *caused* the exact poison it was meant to heal).
 */
const sessions = new WeakMap<object, Promise<unknown>>();

export const restoreTouchEmulation: BrowserCommand<[]> = async (ctx) => {
  let session = sessions.get(ctx.page);
  if (session === undefined) {
    session = ctx.context.newCDPSession(ctx.page);
    sessions.set(ctx.page, session);
  }
  const cdp = (await session) as {
    send(method: string, params: object): Promise<unknown>;
  };
  // Exactly what Playwright sends for `hasTouch: true` — and nothing more.
  // In particular NOT `Emulation.setEmitTouchEventsForMouse`: that converts
  // real mouse events into touch events, which breaks every userEvent click
  // (learned the hard way; Playwright never enables it).
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true });
};
