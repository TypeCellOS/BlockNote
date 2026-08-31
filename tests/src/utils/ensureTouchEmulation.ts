/**
 * Asserts that the android instance's touch emulation is still in effect.
 *
 * The emulation itself is configured per instance in vite.config.browser.ts
 * (the playwright provider's contextOptions) — this cannot re-create it, only
 * detect its loss. Loss has one known cause: Playwright's element-screenshot
 * path for **iframe elements** (what `screenshotFull` captures for export
 * previews) rewrites the device-metrics override and permanently drops the
 * context's touch emulation — `navigator.maxTouchPoints` becomes 0 for every
 * later test file. The android instance therefore keeps such suites out of
 * its include; touch-dependent tests call this in `beforeEach` so that if the
 * include ever regresses, the run fails naming the cause instead of silently
 * testing a desktop context that merely claims to be mobile.
 */
export function ensureTouchEmulation() {
  if (
    navigator.maxTouchPoints === 0 ||
    !window.matchMedia("(pointer: coarse)").matches
  ) {
    throw new Error(
      "Touch emulation has been dropped for this browser context. A " +
        "previously run test file took an iframe-element screenshot " +
        "(screenshotFull), which permanently disables the context's touch " +
        "emulation — keep such suites out of the android instance's include " +
        "in vite.config.browser.ts.",
    );
  }
}
