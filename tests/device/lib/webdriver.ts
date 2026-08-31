/**
 * Dependency-free WebDriver REST client for BrowserStack real-device sessions.
 *
 * Deliberately not WebdriverIO/Appium-client based: the handful of endpoints
 * we need (session, execute, element, actions, screenshot) are stable W3C
 * WebDriver routes, and a plain `fetch` client keeps the device suite free of
 * its own dependency tree.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type Platform = "android" | "ios";

const HUB = "https://hub-cloud.browserstack.com/wd/hub";
const ARTIFACTS_DIR = join(import.meta.dirname, "..", ".artifacts");

export function browserStackCredentials():
  | { userName: string; accessKey: string }
  | undefined {
  const userName = process.env.BROWSERSTACK_USERNAME;
  const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;
  return userName && accessKey ? { userName, accessKey } : undefined;
}

export class DeviceSession {
  private constructor(
    public readonly sessionId: string,
    public readonly platform: Platform,
    private readonly auth: { userName: string; accessKey: string },
  ) {}

  static async create(
    platform: Platform,
    capabilities: Record<string, unknown>,
  ): Promise<DeviceSession> {
    const auth = browserStackCredentials();
    if (!auth) {
      throw new Error(
        "BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY must be set " +
          "(exported, or in the repo root .env — see .env.sample)",
      );
    }
    // Device allocation occasionally hiccups; one retry absorbs it.
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(`${HUB}/session`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ capabilities: { alwaysMatch: capabilities } }),
      });
      const json = (await res.json()) as {
        value: { sessionId: string; error?: string; message?: string };
      };
      if (res.ok) {
        return new DeviceSession(json.value.sessionId, platform, auth);
      }
      if (attempt === 1) {
        throw new Error(
          `BrowserStack session creation failed: ${JSON.stringify(json).slice(0, 400)}`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 10_000));
    }
  }

  private async request(method: string, path: string, body?: unknown) {
    const res = await fetch(`${HUB}/session/${this.sessionId}${path}`, {
      method,
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as { value?: unknown };
    if (!res.ok) {
      throw new Error(
        `${method} ${path} -> ${res.status}: ${JSON.stringify(json).slice(0, 300)}`,
      );
    }
    return json.value;
  }

  async navigate(url: string): Promise<void> {
    await this.request("POST", "/url", { url });
  }

  /** Runs a script in the page. The script body may use `arguments`. */
  async exec<T>(script: string, args: unknown[] = []): Promise<T> {
    return (await this.request("POST", "/execute/sync", {
      script,
      args,
    })) as T;
  }

  /**
   * Polls a page script until it returns `{ ok: true, ... }`. Returns the
   * final result; throws with the last observed value on timeout so failures
   * carry the page state they timed out on.
   */
  async waitFor<T extends { ok: boolean }>(
    label: string,
    script: string,
    timeoutMs = 20_000,
  ): Promise<T> {
    const start = Date.now();
    let last: T | undefined;
    while (Date.now() - start < timeoutMs) {
      last = await this.exec<T>(script);
      if (last && last.ok) {
        return last;
      }
      await new Promise((resolve) => setTimeout(resolve, 700));
    }
    throw new Error(
      `Timed out at "${label}": ${JSON.stringify(last).slice(0, 300)}`,
    );
  }

  private async findElement(css: string): Promise<string> {
    const el = (await this.request("POST", "/element", {
      using: "css selector",
      value: css,
    })) as Record<string, string>;
    return Object.values(el)[0];
  }

  /**
   * WebDriver element click. Sufficient on Android; on iOS Safari the
   * resulting events are synthetic and never move focus or open the keyboard —
   * use `nativeTap` (via the gestures module) there instead.
   */
  async elementClick(css: string): Promise<void> {
    await this.request("POST", `/element/${await this.findElement(css)}/click`);
  }

  /**
   * Types into an element via the WebDriver value endpoint. Fidelity caveat:
   * this inserts text through the automation layer, not by tapping keys on the
   * on-screen keyboard, so IME-specific behavior (autocorrect, composition,
   * the soft Enter key) is not exercised. On Android it also commits the
   * field's action, on iOS it does not.
   */
  async elementValue(css: string, text: string): Promise<void> {
    await this.request(
      "POST",
      `/element/${await this.findElement(css)}/value`,
      { text },
    );
  }

  /**
   * OS-level tap through the Appium driver — the only input that iOS Safari
   * honors for focus/keyboard purposes, and the only way to press keys on the
   * on-screen keyboard on either platform.
   *
   * Coordinates are screen points on iOS (CSS px scale) and physical pixels on
   * Android.
   */
  async nativeTap(x: number, y: number): Promise<void> {
    const command =
      this.platform === "ios" ? "mobile: tap" : "mobile: clickGesture";
    await this.exec(command, [{ x: Math.round(x), y: Math.round(y) }]);
  }

  /** Sends W3C key actions (protocol-level key events) to the focused element. */
  async typeKeys(text: string): Promise<void> {
    const actions: { type: string; value: string }[] = [];
    for (const character of text) {
      actions.push({ type: "keyDown", value: character });
      actions.push({ type: "keyUp", value: character });
    }
    await this.request("POST", "/actions", {
      actions: [{ type: "key", id: "keyboard", actions }],
    });
    await this.request("DELETE", "/actions").catch(() => {});
  }

  /** Saves a PNG screenshot under tests/device/.artifacts. */
  async screenshot(name: string): Promise<string> {
    const b64 = (await this.request("GET", "/screenshot")) as string;
    mkdirSync(ARTIFACTS_DIR, { recursive: true });
    const file = join(ARTIFACTS_DIR, `${this.platform}-${name}.png`);
    writeFileSync(file, Buffer.from(b64, "base64"));
    return file;
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
    await this.request("DELETE", "").catch(() => {
      // The session may already have timed out server-side.
    });
  }
}
