/**
 * A local iOS simulator via Apple's safaridriver — real iOS Safari (the
 * simulator runs the actual OS build), driven over plain W3C WebDriver with
 * `selenium-webdriver`, the same client the BrowserStack backend uses.
 *
 * safaridriver's element clicks genuinely move focus and bring up the
 * software keyboard here, so none of the native-tap offset ladders the
 * BrowserStack iOS backend needs apply. The simulator also shares the host's
 * network — `127.0.0.1` reaches the dev server with no tunnel.
 *
 * Prerequisites (handled by setup.ts): safaridriver running on
 * SAFARIDRIVER_PORT, a booted simulator, and the Simulator's
 * "Connect Hardware Keyboard" setting off — with it on, focusing a field
 * never shows the software keyboard, and keyboard-gated UI (the mobile
 * toolbar) never appears.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Builder, By, type WebDriver } from "selenium-webdriver";

import { type DeviceSession, waitForOk } from "./session.js";
import { saveScreenshot } from "./artifacts.js";

const execFileAsync = promisify(execFile);

export const SAFARIDRIVER_PORT = 47632;

/** True on macOS with safaridriver present. */
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
    const driver = await new Builder()
      .usingServer(`http://127.0.0.1:${SAFARIDRIVER_PORT}`)
      .withCapabilities({
        browserName: "Safari",
        platformName: "iOS",
        "safari:useSimulator": true,
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

  async elementClick(css: string): Promise<void> {
    await this.driver.findElement(By.css(css)).click();
  }

  async elementValue(css: string, text: string): Promise<void> {
    const element = this.driver.findElement(By.css(css));
    await element.click();
    await element.sendKeys(text);
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
