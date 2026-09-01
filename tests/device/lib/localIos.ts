/**
 * A local iOS simulator via Appium's XCUITest driver — the sanctioned
 * full-fidelity automation stack for iOS (WebDriverAgent), driven with
 * `selenium-webdriver` as a plain W3C client. The simulator runs the
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
 *   screen points — which is why the gesture layer keeps chrome-offset
 *   ladders for iOS.
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Builder, By, type WebDriver } from "selenium-webdriver";

import { type DeviceSession, waitForOk } from "./session.js";
import { saveScreenshot } from "./artifacts.js";

export const APPIUM_PORT = 47632;

/** Where the suite setup records the booted simulator for the workers. */
export const SIM_UDID_FILE = join(
  import.meta.dirname,
  "..",
  ".artifacts",
  ".booted-simulator",
);

/**
 * True on macOS with the simulator toolchain present.
 *
 * The probe holds no stdio pipes: a cold `xcrun` on a fresh CI runner can be
 * slow, and when a piped probe times out, the orphaned child keeps the pipe
 * open and wedges the whole process at exit (a 45-minute CI hang, learned the
 * hard way). Exit code is all this needs. The timeout is generous for the
 * same cold-start reason; the CI workflow also warms `xcrun` beforehand.
 */
export function localIosAvailable(): Promise<boolean> {
  if (process.platform !== "darwin") {
    return Promise.resolve(false);
  }
  return new Promise((resolve) => {
    const probe = spawn("xcrun", ["simctl", "help"], { stdio: "ignore" });
    const timer = setTimeout(() => {
      probe.kill("SIGKILL");
      resolve(false);
    }, 60_000);
    probe.on("error", () => {
      clearTimeout(timer);
      resolve(false);
    });
    probe.on("exit", (code) => {
      clearTimeout(timer);
      resolve(code === 0);
    });
  });
}

export class LocalIosSession implements DeviceSession {
  readonly kind = "local-ios";
  readonly platform = "ios";

  private constructor(private readonly driver: WebDriver) {}

  static async create(): Promise<LocalIosSession> {
    // The suite's setup (lib/tunnel.ts) boots a simulator; discover it here
    // rather than passing state across processes — vitest's global setup and
    // its workers don't share an environment.
    // Written by the suite setup (lib/tunnel.ts), which boots the device.
    let udid: string;
    try {
      udid = readFileSync(SIM_UDID_FILE, "utf8").trim();
    } catch {
      throw new Error(
        "No simulator recorded — the device-suite setup should have booted " +
          "one and written " +
          SIM_UDID_FILE +
          " (see lib/tunnel.ts).",
      );
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
    return new LocalIosSession(driver);
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

  async close(): Promise<void> {
    await this.driver.quit().catch(() => {});
  }
}
