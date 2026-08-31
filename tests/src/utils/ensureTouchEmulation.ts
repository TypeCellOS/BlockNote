/**
 * Restores touch *detection* for the android instance if a previously run
 * test dropped the real emulation.
 *
 * Playwright's element-screenshot path for **iframe elements** (what
 * `screenshotFull` captures for export previews) rewrites the device-metrics
 * override and permanently drops the context's touch emulation —
 * `navigator.maxTouchPoints` becomes 0 for every later test file, turning
 * `isTouchDevice()` (and with it the mobile formatting toolbar) off. Plain
 * element screenshots and `page.viewport()` calls are fine; only
 * iframe-element captures trip it. The android instance therefore keeps such
 * suites out of its include, and touch-dependent tests call this in
 * `beforeEach` as a self-healing guard in case that ever regresses.
 *
 * Property stubs rather than CDP: re-arming the emulation over CDP only
 * affects future documents — `navigator.maxTouchPoints` is fixed at document
 * creation, so the already-created tester iframe wouldn't see it. The stubs
 * restore exactly what `isTouchDevice()` reads.
 */
export function ensureTouchEmulation() {
  if (navigator.maxTouchPoints === 0) {
    Object.defineProperty(navigator, "maxTouchPoints", {
      value: 1,
      configurable: true,
    });
  }
  if (!window.matchMedia("(pointer: coarse)").matches) {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) =>
      query.includes("pointer: coarse")
        ? ({
            matches: true,
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
          } as unknown as MediaQueryList)
        : original(query)) as typeof window.matchMedia;
  }
}
