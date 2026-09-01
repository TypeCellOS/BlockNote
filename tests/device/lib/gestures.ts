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
import type { DeviceSession } from "./session.js";

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
  // Android taps reliably through elementClick (real clicks on
  // BrowserStack, genuine OS taps in the local backend). iOS — every kind —
  // needs the native-tap chrome-offset ladder: web-layer clicks are
  // synthetic there and never move focus or open the keyboard.
  if (session.platform !== "ios") {
    await session.elementClick(css);
    await session.waitFor(
      `tap on ${css}`,
      options.verify,
      options.verifyTimeoutMs ?? 10_000,
    );
    return;
  }

  if (!session.nativeTap) {
    throw new Error(
      `tapElement: the ${session.kind} backend has no native tap channel`,
    );
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
    if (session.pressImeActionKey) {
      // The real thing: tap Gboard's on-screen Enter key. In the editor's
      // contenteditable this takes the true IME route — keydown 229 +
      // `beforeinput` (insertParagraph) — exactly where #3001-class bugs
      // live. No key-event channel can produce that sequence.
      await session.pressImeActionKey(verify);
      return;
    }
    // Fallback for backends without an on-screen-keyboard channel: a key
    // event converges on the same handling — prosemirror-view ignores Enter
    // keydowns on Android Chrome, so processing still goes through the
    // `beforeinput` the browser emits for the trusted key.
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

  if (!session.nativeTap) {
    throw new Error(
      `pressSoftKeyboardEnter: the ${session.kind} backend has no native tap channel`,
    );
  }
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
