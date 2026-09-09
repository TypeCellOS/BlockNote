/**
 * Asserts that the android instance's touch emulation is still in effect.
 *
 * The emulation itself is configured per instance in vite.config.browser.ts
 * (the playwright provider's contextOptions) — this cannot re-create it, only
 * detect its loss. Loss has one known cause: Chromium drops the touch
 * emulation after any screenshot captured beyond the viewport (on this
 * mobile context, every element screenshot) and Playwright never re-arms it
 * (microsoft/playwright#42607; mechanism and repro in
 * `restoreTouchEmulation.ts`). The setup re-arms it before every test and
 * then calls this, so a run fails naming the cause instead of silently
 * testing a desktop context that merely claims to be mobile.
 */
export function ensureTouchEmulation() {
  if (
    navigator.maxTouchPoints === 0 ||
    !window.matchMedia("(pointer: coarse)").matches
  ) {
    throw new Error(
      "Touch emulation has been dropped for this browser context: Chromium " +
        "drops it after a screenshot captured beyond the viewport (any element " +
        "screenshot on a mobile context) and Playwright never re-arms it " +
        "(microsoft/playwright#42607). restoreTouchEmulation in " +
        "vitestSetup.browser.ts should have re-armed it before this test; " +
        "check that the setup and the provider's contextOptions still apply.",
    );
  }
}
