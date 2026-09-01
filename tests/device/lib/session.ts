/**
 * The transport-agnostic session contract every device/OS target implements.
 *
 * Three backends exist:
 * - `browserstack.ts` — real hardware via BrowserStack's hub (selenium-webdriver)
 * - `localAndroid.ts` — a local Android emulator via adb + Chrome's DevTools
 *   protocol (real Chrome, real Gboard — including the on-screen IME action
 *   key, which no cloud channel can press)
 * - `localIos.ts` — a local iOS simulator via Apple's safaridriver (real iOS
 *   Safari; element clicks genuinely move focus there, unlike cloud iOS)
 *
 * Tests and page helpers speak only this interface; per-target quirks live in
 * the backends and in `gestures.ts`.
 */

export type Platform = "android" | "ios";

export type TargetKind = "browserstack" | "local-android" | "local-ios";

export interface DeviceSession {
  readonly platform: Platform;
  readonly kind: TargetKind;
  /** Backend session identifier, for artifacts and dashboards. */
  readonly sessionId: string;

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
   * Element click through the backend's input pipeline. Trusted input on
   * every backend; on BrowserStack iOS the resulting events never move focus
   * (use the gesture layer's tap ladders there).
   */
  elementClick(css: string): Promise<void>;

  /** Types into an element via the backend's value/sendKeys channel. */
  elementValue(css: string, text: string): Promise<void>;

  /**
   * OS-level tap at screen coordinates, when the backend has one. Reaches
   * outside the page — the on-screen keyboard included.
   */
  nativeTap?(x: number, y: number): Promise<void>;

  /** Protocol-level key events to the focused element ("" = Enter). */
  typeKeys(text: string): Promise<void>;

  /**
   * Presses the on-screen keyboard's IME action key (the Gboard arrow /
   * checkmark), where the backend can reach it. Only the local Android
   * emulator can today; cloud channels cannot press it at all. `verify` is a
   * page script returning `{ ok: boolean }` observing the action's effect.
   */
  pressImeActionKey?(verify: string): Promise<void>;

  /** Saves a PNG screenshot under tests/device/.artifacts; returns the path. */
  screenshot(name: string): Promise<string>;

  /** Marks the session passed/failed where the backend has a dashboard. */
  annotate(status: "passed" | "failed", reason: string): Promise<void>;

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
