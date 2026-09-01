/**
 * The transport-agnostic session contract every device/OS target implements.
 *
 * Two backends exist:
 * - `localAndroid.ts` — a local Android emulator via Playwright's `_android`
 *   (page) + `adb shell input` (genuine OS events — including the on-screen
 *   keyboard itself, which no cloud channel can press)
 * - `localIos.ts` — a local iOS simulator via Appium/XCUITest (the actual
 *   iOS build and Safari; WebDriverAgent owns the HID stack, so it works
 *   headless)
 *
 * Tests and page helpers speak only this interface; per-target quirks live in
 * the backends and in `gestures.ts`.
 */

export type Platform = "android" | "ios";

export type TargetKind = "local-android" | "local-ios";

export interface DeviceSession {
  readonly platform: Platform;
  readonly kind: TargetKind;

  navigate(url: string): Promise<void>;

  /** Runs a script in the page. The script body may use `arguments`. */
  exec<T>(script: string, args?: unknown[]): Promise<T>;

  /**
   * Polls a page script until it returns `{ ok: true, ... }`. Returns the
   * final result; throws with the last observed value on timeout so failures
   * carry the page state they timed out on.
   */
  waitFor<T extends { ok: boolean }>(
    label: string,
    script: string,
    timeoutMs?: number,
  ): Promise<T>;

  /**
   * Element click through the backend's input pipeline. On iOS the resulting
   * events are synthetic at the WebKit layer and never move focus or open
   * the keyboard — the gesture layer's tap ladders apply there.
   */
  elementClick(css: string): Promise<void>;

  /** Types into an element via the backend's value/sendKeys channel. */
  elementValue(css: string, text: string): Promise<void>;

  /**
   * OS-level tap at screen coordinates. Reaches outside the page — the
   * on-screen keyboard included.
   */
  nativeTap(x: number, y: number): Promise<void>;

  /** Protocol-level key events to the focused element (U+E007 = Enter). */
  typeKeys(text: string): Promise<void>;

  /**
   * Presses the on-screen keyboard's bottom-right key — the IME action key
   * in a form field (Gboard's arrow / checkmark), Enter in an editor — where
   * the backend can reach it. `verify` is a page script returning
   * `{ ok: boolean }` observing the effect.
   */
  pressImeActionKey?(verify: string): Promise<void>;

  /** Saves a PNG screenshot under tests/device/.artifacts; returns the path. */
  screenshot(name: string): Promise<string>;

  close(): Promise<void>;
}

/** Shared implementation of {@link DeviceSession.waitFor}. */
export async function waitForOk<T extends { ok: boolean }>(
  session: Pick<DeviceSession, "exec">,
  label: string,
  script: string,
  timeoutMs = 20_000,
): Promise<T> {
  const start = Date.now();
  let last: T | undefined;
  while (Date.now() - start < timeoutMs) {
    last = await session.exec<T>(script);
    if (last && last.ok) {
      return last;
    }
    await new Promise((resolve) => setTimeout(resolve, 700));
  }
  throw new Error(
    `Timed out at "${label}": ${JSON.stringify(last).slice(0, 300)}`,
  );
}
