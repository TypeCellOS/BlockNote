/**
 * A local iOS simulator via Appium's XCUITest driver — the sanctioned
 * full-fidelity automation stack for iOS (WebDriverAgent), driven with
 * `selenium-webdriver` like the BrowserStack backend. The simulator runs the
 * actual iOS build and the actual Safari, headless (XCUITest owns the HID
 * stack, so the software keyboard appears without the Simulator GUI), and
 * shares the host's network — `127.0.0.1` reaches the dev server, no tunnel.
 *
 * Findings that shaped this backend, the hard way:
 * - Apple's safaridriver cannot do this: its input is synthetic at the WebKit
 *   layer, which never summons the software keyboard, and injecting real HID
 *   (idb) during its session trips Safari's "stop the current automated test
 *   session?" guardrail.
 * - Appium's web-context element clicks are synthetic too (nativeWebTap
 *   included, on current iOS). Real interaction goes through `mobile: tap` at
 *   screen points — exactly the channel the BrowserStack iOS backend uses, so
 *   the gesture layer's chrome-offset ladders apply here unchanged.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Builder, By, type WebDriver } from "selenium-webdriver";

import { type DeviceSession, waitForOk } from "./session.js";
import { saveScreenshot } from "./artifacts.js";

const execFileAsync = promisify(execFile);

export const APPIUM_PORT = 47632;

/** True on macOS with the simulator toolchain present. */
export async function localIosAvailable(): Promise<boolean> {
  if (process.platform !== "darwin") {
    return false;
  }
  try {
    await execFileAsync("xcrun", ["simctl", "help"], { timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}

export class LocalIosSession implements DeviceSession {
  readonly kind = "local-ios";
  readonly platform = "ios";

  private constructor(
    private readonly driver: WebDriver,
    public readonly sessionId: string,
  ) {}

  static async create(): Promise<LocalIosSession> {
    // The suite's setup (lib/tunnel.ts) boots a simulator; discover it here
    // rather than passing state across processes — vitest's global setup and
    // its workers don't share an environment.
    let udid: string | undefined;
    const deadline = Date.now() + 30_000;
    while (!udid) {
      const { stdout } = await execFileAsync("xcrun", [
        "simctl",
        "list",
        "devices",
        "available",
      ]);
      udid = stdout.match(/([0-9A-F-]{36})\) \(Booted\)/)?.[1];
      if (!udid && Date.now() > deadline) {
        throw new Error(
          "No booted iOS simulator found — the device-suite setup should " +
            "have booted one (see lib/tunnel.ts).",
        );
      }
      if (!udid) {
        await new Promise((resolve) => setTimeout(resolve, 2_000));
      }
    }
    const driver = await new Builder()
      .usingServer(`http://127.0.0.1:${APPIUM_PORT}`)
      .withCapabilities({
        platformName: "iOS",
        browserName: "Safari",
        "appium:automationName": "XCUITest",
        "appium:udid": udid,
        // WebDriverAgent's first build on a fresh machine takes minutes.
        "appium:wdaLaunchTimeout": 240_000,
      })
      .build();
    const sessionId = (await driver.getSession()).getId();
    return new LocalIosSession(driver, sessionId);
  }

  async navigate(url: string): Promise<void> {
    await this.driver.get(url);
  }

  async exec<T>(script: string, args: unknown[] = []): Promise<T> {
    return (await this.driver.executeScript(
      script,
      ...(args as (string | number | boolean | object | null)[]),
    )) as T;
  }

  waitFor<T extends { ok: boolean }>(
    label: string,
    script: string,
    timeoutMs?: number,
  ): Promise<T> {
    return waitForOk(this, label, script, timeoutMs);
  }

  /**
   * Synthetic at the WebKit layer — never moves focus or opens the keyboard
   * on iOS. The gesture layer's ladders use `nativeTap` instead.
   */
  async elementClick(css: string): Promise<void> {
    await this.driver.findElement(By.css(css)).click();
  }

  async elementValue(css: string, text: string): Promise<void> {
    await this.driver.findElement(By.css(css)).sendKeys(text);
  }

  /** Real HID tap through WebDriverAgent. Screen points (CSS px scale). */
  async nativeTap(x: number, y: number): Promise<void> {
    await this.exec("mobile: tap", [{ x: Math.round(x), y: Math.round(y) }]);
  }

  async typeKeys(text: string): Promise<void> {
    await this.driver.actions().sendKeys(text).perform();
    await this.driver
      .actions()
      .clear()
      .catch(() => {});
  }

  async screenshot(name: string): Promise<string> {
    return saveScreenshot(
      `local-ios-${name}`,
      await this.driver.takeScreenshot(),
    );
  }

  async annotate(): Promise<void> {
    // No dashboard locally.
  }

  async close(): Promise<void> {
    await this.driver.quit().catch(() => {});
  }
}
