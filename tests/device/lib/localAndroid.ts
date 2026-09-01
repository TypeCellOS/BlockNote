/**
 * A local Android emulator via Playwright's (experimental, first-party)
 * Android support: real Chrome driven as a Playwright page over CDP, plus the
 * native input layer (`device.input`, `device.shell`) that reaches outside
 * the page — including the on-screen keyboard, which no cloud channel can
 * press. That native reach is what makes the IME action key testable here.
 *
 * Element taps deliberately go through `adb shell input` (OS-level, exactly
 * what a finger does) rather than Playwright's CDP-injected touches. Page
 * coordinates are converted to screen coordinates using a one-time calibration
 * tap, so the browser-chrome offset never has to be guessed.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { AndroidDevice, BrowserContext, Page } from "playwright-core";
import { _android } from "playwright-core";

import { type DeviceSession, waitForOk } from "./session.js";
import { saveScreenshot } from "./artifacts.js";

const execFileAsync = promisify(execFile);

/** The dev-server port the emulator reaches via `adb reverse`. */
function targetPort(): string {
  const target = process.env.DEVICE_TEST_TARGET ?? "http://127.0.0.1:5173";
  return new URL(target).port || "80";
}

/** True when adb can see a running emulator/device. */
export async function localAndroidAvailable(): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync("adb", ["get-state"], {
      timeout: 5_000,
    });
    return stdout.trim() === "device";
  } catch {
    return false;
  }
}

export class LocalAndroidSession implements DeviceSession {
  readonly kind = "local-android";
  readonly platform = "android";

  private constructor(
    private readonly device: AndroidDevice,
    private readonly context: BrowserContext,
    private readonly page: Page,
    public readonly sessionId: string,
    private readonly screen: { width: number; height: number },
  ) {}

  /**
   * CSS-to-screen mapping, measured lazily on the first OS tap. It cannot be
   * measured on Chrome's initial page: pages without a viewport meta render
   * in the 980px virtual viewport, so both the scale and the observed touch
   * position would describe the wrong coordinate space. By the first tap the
   * tests have navigated to an app page (`width=device-width`), where the
   * mapping is stable.
   */
  private mapping: {
    scale: number;
    origin: { x: number; y: number };
  } | null = null;

  static async create(): Promise<LocalAndroidSession> {
    const [device] = await _android.devices();
    if (!device) {
      throw new Error(
        "No Android device visible to adb. Boot an emulator first " +
          "(see tests/device/README.md).",
      );
    }
    const port = targetPort();
    await execFileAsync("adb", ["reverse", `tcp:${port}`, `tcp:${port}`]);

    // Chrome 124+ opens a native "notifications make things easier" modal on
    // first run, which swallows every tap until dismissed. Granting the
    // permission up front means the promo never appears.
    await device
      .shell(
        "pm grant com.android.chrome android.permission.POST_NOTIFICATIONS",
      )
      .catch(() => {
        // Older images have no such permission.
      });

    const context = await device.launchBrowser();
    // launchBrowser reuses Chrome's profile, so tabs accumulate across runs —
    // and physical taps land on the *foreground* tab, so driving any other
    // page sends every OS tap to the wrong document. Keep exactly one page
    // (`newPage` is not supported on Android) and make sure it is frontmost.
    if (context.pages().length === 0) {
      await context.waitForEvent("page", { timeout: 15_000 });
    }
    const pages = context.pages();
    const page = pages[pages.length - 1];
    for (const stale of pages.slice(0, -1)) {
      await stale.close().catch(() => {});
    }
    await page.bringToFront();

    const { width, height } = await sizeOf(device);

    return new LocalAndroidSession(device, context, page, device.serial(), {
      width,
      height,
    });
  }

  /**
   * Measures where the page's CSS origin sits on the physical screen by
   * tapping a known screen point and reading where the page observed the
   * touch. Removes all guessing about status-bar and browser-chrome heights.
   */
  private async ensureCalibrated(): Promise<{
    scale: number;
    origin: { x: number; y: number };
  }> {
    if (this.mapping) {
      return this.mapping;
    }
    await this.page.bringToFront();
    const scale =
      this.screen.width / (await this.page.evaluate(() => window.innerWidth));
    const probe = this.page.evaluate(
      () =>
        new Promise<{ x: number; y: number }>((resolve) => {
          const handler = (event: TouchEvent) => {
            resolve({
              x: event.touches[0].clientX,
              y: event.touches[0].clientY,
            });
          };
          window.addEventListener("touchstart", handler, {
            once: true,
            capture: true,
          });
        }),
    );
    const tapX = Math.round(this.screen.width / 2);
    const tapY = Math.round(this.screen.height / 2);
    await new Promise((resolve) => setTimeout(resolve, 300));
    await this.osTap(tapX, tapY);
    const seen = await probe;
    this.mapping = {
      scale,
      origin: {
        x: tapX - Math.round(seen.x * scale),
        y: tapY - Math.round(seen.y * scale),
      },
    };
    return this.mapping;
  }

  /**
   * OS-level input via `adb shell input` — what a finger/keyboard does, with
   * no companion APK (Playwright's `device.input` needs its Android driver
   * installed; `shell` is plain adb).
   */
  private async osTap(x: number, y: number): Promise<void> {
    await this.device.shell(`input tap ${x} ${y}`);
  }

  private async osType(text: string): Promise<void> {
    // `input text` treats space specially; our flows type URLs (ASCII, no
    // spaces), and anything else is escaped the way adb expects.
    await this.device.shell(`input text ${text.replaceAll(" ", "%s")}`);
  }

  private async toScreen(
    cssX: number,
    cssY: number,
  ): Promise<{ x: number; y: number }> {
    const { scale, origin } = await this.ensureCalibrated();
    return {
      x: Math.round(cssX * scale + origin.x),
      y: Math.round(cssY * scale + origin.y),
    };
  }

  async navigate(url: string): Promise<void> {
    await this.page.goto(url, { timeout: 60_000 });
  }

  /**
   * The suite's scripts follow WebDriver's `execute` contract — a function
   * *body* that may use `arguments`. `new Function` gives them identical
   * semantics under Playwright's evaluate.
   */
  async exec<T>(script: string, args: unknown[] = []): Promise<T> {
    return (await this.page.evaluate(
      ([body, fnArgs]) =>
        // eslint-disable-next-line no-implied-eval -- WebDriver-contract scripts are function bodies; this is the adapter
        new Function(body as string)(...(fnArgs as unknown[])),
      [script, args] as const,
    )) as T;
  }

  waitFor<T extends { ok: boolean }>(
    label: string,
    script: string,
    timeoutMs?: number,
  ): Promise<T> {
    return waitForOk(this, label, script, timeoutMs);
  }

  /** OS-level tap on the element's center — what a finger does. */
  async elementClick(css: string): Promise<void> {
    const rect = await this.exec<{ x: number; y: number } | null>(
      `const el = document.querySelector(arguments[0]);
       if (!el) return null;
       const b = el.getBoundingClientRect();
       return { x: b.x + b.width / 2, y: b.y + b.height / 2 };`,
      [css],
    );
    if (!rect) {
      throw new Error(`elementClick: no element for ${css}`);
    }
    const { x, y } = await this.toScreen(rect.x, rect.y);
    await this.osTap(x, y);
  }

  /**
   * Types via the OS input pipeline into the focused element. The element is
   * OS-tapped first so focus (and the keyboard) come up the way they would
   * for a user.
   */
  async elementValue(css: string, text: string): Promise<void> {
    await this.elementClick(css);
    await new Promise((resolve) => setTimeout(resolve, 800));
    await this.osType(text);
  }

  async nativeTap(x: number, y: number): Promise<void> {
    await this.osTap(Math.round(x), Math.round(y));
  }

  async typeKeys(text: string): Promise<void> {
    if (text === "\uE007") {
      // WebDriver's Enter keycode, delivered as a genuine OS key event.
      await this.device.shell("input keyevent 66");
      return;
    }
    await this.osType(text);
  }

  /**
   * Presses the on-screen keyboard's IME action key (Gboard's arrow /
   * checkmark, bottom-right). The key's exact position varies by keyboard
   * build, so candidate positions are tried with `verify` between attempts —
   * the same ladder pattern the BrowserStack iOS taps use.
   */
  async pressImeActionKey(verify: string): Promise<void> {
    const { width, height } = this.screen;
    const candidates = [
      { x: 0.918, y: 0.906 },
      { x: 0.92, y: 0.93 },
      { x: 0.9, y: 0.88 },
    ];
    let lastError: Error | undefined;
    for (const ratio of candidates) {
      await this.osTap(
        Math.round(width * ratio.x),
        Math.round(height * ratio.y),
      );
      try {
        await this.waitFor("IME action effect", verify, 5_000);
        return;
      } catch (error) {
        lastError = error as Error;
      }
    }
    throw new Error(
      `The IME action key press was not observed to take effect: ${lastError?.message}`,
    );
  }

  async screenshot(name: string): Promise<string> {
    return saveScreenshot(
      `local-android-${name}`,
      await this.device.screenshot(),
    );
  }

  async annotate(): Promise<void> {
    // No dashboard locally.
  }

  async close(): Promise<void> {
    await this.context.close().catch(() => {});
    await this.device.close().catch(() => {});
  }
}

async function sizeOf(
  device: AndroidDevice,
): Promise<{ width: number; height: number }> {
  const out = (await device.shell("wm size")).toString();
  const match = out.match(/(\d+)x(\d+)/);
  if (!match) {
    throw new Error(`Could not read screen size from: ${out}`);
  }
  return { width: Number(match[1]), height: Number(match[2]) };
}
