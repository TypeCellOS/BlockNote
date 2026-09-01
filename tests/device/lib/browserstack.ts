/**
 * Real-hardware sessions via BrowserStack's hub, backed by `selenium-webdriver`
 * — the client BrowserStack's Node.js documentation and samples use for
 * Automate (https://www.browserstack.com/docs/automate/selenium/getting-started/nodejs).
 * Auth travels inside the capabilities' `bstack:options`, per those docs; see
 * targets.ts.
 */
import { Builder, By, type WebDriver } from "selenium-webdriver";

import { type DeviceSession, type Platform, waitForOk } from "./session.js";
import { saveScreenshot } from "./artifacts.js";

const HUB = "https://hub-cloud.browserstack.com/wd/hub";

export function browserStackCredentials():
  | { userName: string; accessKey: string }
  | undefined {
  const userName = process.env.BROWSERSTACK_USERNAME;
  const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;
  return userName && accessKey ? { userName, accessKey } : undefined;
}

export class BrowserStackSession implements DeviceSession {
  readonly kind = "browserstack";

  private constructor(
    private readonly driver: WebDriver,
    public readonly sessionId: string,
    public readonly platform: Platform,
    private readonly auth: { userName: string; accessKey: string },
  ) {}

  static async create(
    platform: Platform,
    capabilities: Record<string, unknown>,
  ): Promise<BrowserStackSession> {
    const auth = browserStackCredentials();
    if (!auth) {
      throw new Error(
        "BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY must be set " +
          "(exported, or in the repo root .env — see .env.sample)",
      );
    }
    // Device allocation occasionally hiccups; one retry absorbs it.
    for (let attempt = 0; ; attempt++) {
      try {
        const driver = await new Builder()
          .usingServer(HUB)
          .withCapabilities(capabilities)
          .build();
        const sessionId = (await driver.getSession()).getId();
        return new BrowserStackSession(driver, sessionId, platform, auth);
      } catch (error) {
        if (attempt === 1) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 10_000));
      }
    }
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
   * On iOS the resulting events are synthetic and never move focus or open
   * the keyboard — the gesture layer uses `nativeTap` ladders there instead.
   */
  async elementClick(css: string): Promise<void> {
    await this.driver.findElement(By.css(css)).click();
  }

  async elementValue(css: string, text: string): Promise<void> {
    await this.driver.findElement(By.css(css)).sendKeys(text);
  }

  /**
   * OS-level tap through the Appium driver — the only input that BrowserStack
   * iOS honors for focus/keyboard purposes. Coordinates are screen points on
   * iOS (CSS px scale) and physical pixels on Android.
   */
  async nativeTap(x: number, y: number): Promise<void> {
    const command =
      this.platform === "ios" ? "mobile: tap" : "mobile: clickGesture";
    await this.exec(command, [{ x: Math.round(x), y: Math.round(y) }]);
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
      `${this.platform}-${name}`,
      await this.driver.takeScreenshot(),
    );
  }

  /** Marks the session passed/failed on the BrowserStack dashboard. */
  async annotate(status: "passed" | "failed", reason: string): Promise<void> {
    await fetch(
      `https://api.browserstack.com/automate/sessions/${this.sessionId}.json`,
      {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          authorization:
            "Basic " +
            Buffer.from(
              `${this.auth.userName}:${this.auth.accessKey}`,
            ).toString("base64"),
        },
        body: JSON.stringify({ status, reason: reason.slice(0, 250) }),
      },
    ).catch(() => {
      // Annotation is cosmetic; never fail a test run over it.
    });
  }

  async close(): Promise<void> {
    await this.driver.quit().catch(() => {
      // The session may already have timed out server-side.
    });
  }
}
