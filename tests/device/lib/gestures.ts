/**
 * Platform input layer: every quirk of delivering *genuine* user input on real
 * devices lives here, so tests and page helpers stay declarative.
 *
 * The hard-won iOS facts this module encodes:
 * - Safari ignores WebDriver element clicks (synthetic events) and even
 *   trusted injected W3C touch events for focus/keyboard purposes. Only the
 *   Appium native-layer tap works.
 * - Native taps take screen points = CSS position plus Safari's top chrome,
 *   which is ~100pt with the keyboard closed (URL bar visible) and ~45-50pt
 *   with it open (chrome minimized). `getBoundingClientRect()` values are
 *   already visually correct — do NOT subtract `visualViewport.offsetTop`.
 * - A tap that lands ~50pt below a target near the keyboard hits the keyboard
 *   accessory bar (its "Done" button dismisses the keyboard and collapses the
 *   whole editing state), so mis-taps must be assumed and recovered from.
 */
import type { DeviceSession } from "./webdriver.js";

/** Candidate Safari top-chrome offsets (screen pt), most likely first. */
const IOS_CHROME_OFFSETS = {
  keyboardClosed: [100, 90, 110, 80],
  keyboardOpen: [50, 45, 55, 100],
} as const;

export type KeyboardState = "open" | "closed";

/**
 * Taps an element. Android uses a plain element click (reliable there); iOS
 * walks the chrome-offset ladder with a native tap per candidate, using
 * `verify` (a page script returning `{ ok: boolean }`) to detect a hit.
 * On iOS a `verify` script is required — without one a mis-aimed tap cannot
 * be detected.
 */
export async function tapElement(
  session: DeviceSession,
  css: string,
  options: {
    keyboard: KeyboardState;
    verify: string;
    verifyTimeoutMs?: number;
  },
): Promise<void> {
  if (session.platform === "android") {
    await session.elementClick(css);
    await session.waitFor(
      `tap on ${css}`,
      options.verify,
      options.verifyTimeoutMs ?? 10_000,
    );
    return;
  }

  const offsets =
    IOS_CHROME_OFFSETS[
      options.keyboard === "open" ? "keyboardOpen" : "keyboardClosed"
    ];
  for (const offset of offsets) {
    const point = await session.exec<{ x: number; y: number }>(
      `const b = document.querySelector(arguments[0]).getBoundingClientRect();
       return { x: b.x + Math.min(40, b.width / 2), y: b.y + b.height / 2 };`,
      [css],
    );
    await session.nativeTap(point.x, point.y + offset);
    try {
      await session.waitFor(
        `tap on ${css} (chrome offset ${offset})`,
        options.verify,
        options.verifyTimeoutMs ?? 6_000,
      );
      return;
    } catch {
      // Mis-aimed; the caller's flow may need to recover editing state, which
      // `verify` scripts typically encode. Try the next offset.
    }
  }
  throw new Error(`No chrome offset produced a verified tap on ${css}`);
}

/**
 * Position of the iOS keyboard's return key, as fractions of the full screen
 * (measured on iPhone 16e; return stays bottom-right across iPhones). Android
 * doesn't need coordinates — see the key-event convergence note in
 * `pressSoftKeyboardEnter`. Override per-run with SOFT_ENTER_X / SOFT_ENTER_Y
 * when adding an exotic device.
 */
const RETURN_KEY_RATIOS = {
  ios: [
    { x: 0.88, y: 0.88 },
    { x: 0.9, y: 0.91 },
    { x: 0.88, y: 0.85 },
  ],
};

/**
 * Presses Enter/return on the *on-screen keyboard* with a native tap.
 *
 * This is deliberately not a WebDriver key event: soft-keyboard Enter goes
 * through the IME (keyCode 229 + `beforeinput` on Android), which is exactly
 * the path that breaks in bugs like TypeCellOS/BlockNote#3001 while synthetic
 * key events keep working. `verify` receives the page state after each tap
 * attempt; return `{ ok: true }` once the expected mutation is observed.
 *
 * The keyboard must be open when calling this.
 */
export async function pressSoftKeyboardEnter(
  session: DeviceSession,
  verify: string,
): Promise<void> {
  if (session.platform === "android") {
    // A WebDriver Enter key event converges on the same production code path
    // as the soft keyboard's Enter here: prosemirror-view ignores Enter
    // keydowns on Android Chrome entirely, so handling proceeds through the
    // `beforeinput` (insertParagraph) the browser emits — the exact path the
    // IME takes and where #3001-class bugs live. (BrowserStack blocks the
    // higher-fidelity options: `mobile: shell` needs an insecure-feature
    // opt-in and `clickGesture` isn't allowlisted.)
    await session.typeKeys("\uE007");
    await session.waitFor("soft Enter effect", verify, 8_000);
    return;
  }
  const override =
    process.env.SOFT_ENTER_X && process.env.SOFT_ENTER_Y
      ? [
          {
            x: Number(process.env.SOFT_ENTER_X),
            y: Number(process.env.SOFT_ENTER_Y),
          },
        ]
      : undefined;
  const candidates = override ?? RETURN_KEY_RATIOS.ios;

  // iOS native taps take screen points (CSS px scale).
  const metrics = await session.exec<{ width: number; height: number }>(
    `return { width: screen.width, height: screen.height };`,
  );

  let lastError: Error | undefined;
  for (const ratio of candidates) {
    await session.nativeTap(metrics.width * ratio.x, metrics.height * ratio.y);
    try {
      await session.waitFor("soft Enter effect", verify, 5_000);
      return;
    } catch (error) {
      lastError = error as Error;
    }
  }
  throw new Error(
    `Soft Enter was not observed to take effect: ${lastError?.message}`,
  );
}

/**
 * Types into an input and submits it. Android's value endpoint commits the
 * field's action implicitly; iOS gets a dispatched Enter keydown, which React
 * handlers process. See `DeviceSession.elementValue` for the fidelity caveat;
 * use this for setup steps, not for asserting IME behavior.
 */
/**
 * Types plain text into the editor's contenteditable. Android's value endpoint
 * handles contenteditables; iOS Safari's does not, but protocol key events do.
 */
export async function typeText(
  session: DeviceSession,
  editorCss: string,
  text: string,
): Promise<void> {
  if (session.platform === "android") {
    await session.elementValue(editorCss, text);
  } else {
    await session.typeKeys(text);
  }
}

export async function typeAndSubmit(
  session: DeviceSession,
  css: string,
  text: string,
): Promise<void> {
  await session.elementValue(css, text);
  // Submit with a dispatched Enter keydown on both platforms: Android's value
  // endpoint *sometimes* commits the field's action implicitly and iOS never
  // does, so relying on the implicit commit is nondeterministic. React's
  // handlers process the dispatched event either way.
  await session.exec(
    `const el = document.querySelector(arguments[0]);
     if (el) {
       el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
     }`,
    [css],
  );
}
