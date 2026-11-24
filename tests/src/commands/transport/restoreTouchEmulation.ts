import type { BrowserCommand } from "vite-plus/test/node";

/**
 * Re-applies the touch emulation the android instance's Playwright
 * `contextOptions` established. Chromium drops `Emulation.setTouchEmulationEnabled`
 * whenever `Page.captureScreenshot` runs with `captureBeyondViewport: true`
 * (reproduced over raw CDP, Chromium 148; the repro is in the issue below).
 * Playwright sends that flag for every capture that does not fit the
 * viewport, so `fullPage` and tall elements everywhere, and on an `isMobile`
 * context every element screenshot; it sets touch emulation once per session
 * and never re-arms it, so `maxTouchPoints` stays 0 for every later test
 * (microsoft/playwright#42607). `vitestSetup.browser.ts` checks for this
 * before each test on the android instance.
 *
 * The CDP session is deliberately cached and never detached:
 * Emulation-domain overrides revert when the session that set them
 * detaches (learned the hard way — a detaching version of this command
 * *caused* the exact poison it was meant to heal).
 */
const sessions = new WeakMap<object, Promise<unknown>>();

/**
 * Restores Chromium touch capability after a screenshot disables it. Use only in
 * a Chromium context configured with touch support (the Android-emulated project),
 * not to turn a desktop test into a mobile test. Shared setup restores touch
 * if needed before each Android test; call explicitly only if the same test takes a
 * screenshot and then needs to continue exercising touch-dependent behavior.
 *
 * Does not reset the viewport, user agent, or input state. The CDP session stays
 * attached because detaching it would undo the emulation override.
 *
 * @example
 * // In an Android-emulated test, after a screenshot:
 * await restoreTouchEmulation();
 * expect(navigator.maxTouchPoints).toBeGreaterThan(0);
 */
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
