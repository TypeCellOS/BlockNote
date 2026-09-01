/**
 * Vitest global setup for the device suite. Prepares whichever backends this
 * run can use (see devices.ts):
 *
 * - **All targets** need the app server (the playground dev server, or
 *   whatever DEVICE_TEST_TARGET points at).
 * - **Local iOS** needs a booted simulator (headless is fine — XCUITest owns
 *   the HID stack) and a running Appium server.
 * - **Local Android** needs nothing here: the session itself sets up
 *   `adb reverse` when it connects to the already-running emulator.
 *
 * This file runs both locally and in CI — the same code paths, so a CI
 * failure reproduces identically on a laptop.
 */
import { execFile, spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { promisify } from "node:util";

import { activeDevices } from "../devices.js";
import { targetOrigin } from "./target.js";
import { APPIUM_PORT, SIM_UDID_FILE } from "./localIos.js";

const execFileAsync = promisify(execFile);

async function ensureAppServer(): Promise<void> {
  const res = await fetch(targetOrigin(), { redirect: "manual" }).catch(
    () => undefined,
  );
  if (!res) {
    throw new Error(
      `No app server at ${targetOrigin()}. Start the playground (\`pnpm run dev\`) ` +
        `or point DEVICE_TEST_TARGET at a running server.`,
    );
  }
  // Guard against a *wrong-checkout* server on the right port — a burned
  // lesson: a playground from another clone answered here and a full day of
  // device runs silently tested the wrong tree. The viewport meta below is
  // load-bearing for these tests (without `resizes-content` the keyboard
  // overlays the page and OS taps land far below their targets), so its
  // absence is both a strong wrong-tree signal and a guaranteed debugging pit.
  const html = await fetch(targetOrigin(), { redirect: "follow" })
    .then((r) => r.text())
    .catch(() => "");
  if (!html.includes("interactive-widget=resizes-content")) {
    throw new Error(
      `The app server at ${targetOrigin()} does not serve the expected ` +
        `playground shell (missing the interactive-widget=resizes-content ` +
        `viewport meta). Is it running from this checkout's playground/?`,
    );
  }
}

async function startLocalIos(): Promise<() => Promise<void>> {
  // Pick (and if needed boot) an iPhone simulator; sessions discover the
  // booted device themselves (vitest's global setup and its workers don't
  // share an environment). Headless is fine: XCUITest owns the HID stack, so
  // the software keyboard appears without the Simulator GUI.
  const { stdout } = await execFileAsync("xcrun", [
    "simctl",
    "list",
    "devices",
    "available",
  ]);
  // Prefer a device that is already up; otherwise take the first iPhone.
  // `bootstatus -b` boots if needed and returns promptly when already booted,
  // so there are no state-string races ("Booted", "Shutting Down", ...) to
  // pattern-match.
  const already = stdout.match(/iPhone [^(]+\(([0-9A-F-]{36})\) \(Booted\)/);
  const any = stdout.match(/iPhone [^(]+\(([0-9A-F-]{36})\)/);
  const udid = already?.[1] ?? any?.[1];
  if (!udid) {
    throw new Error("No available iPhone simulator found (xcrun simctl list).");
  }
  await execFileAsync("xcrun", ["simctl", "bootstatus", udid, "-b"], {
    timeout: 240_000,
  });
  const bootedByUs = already ? undefined : udid;
  // Hand the chosen device to the test workers through the filesystem —
  // global setup and workers don't share an environment, and polling
  // `simctl list` for a Booted device races on slow CI runners.
  mkdirSync(dirname(SIM_UDID_FILE), { recursive: true });
  writeFileSync(SIM_UDID_FILE, udid);

  // Appium with the XCUITest driver (an npm devDependency, which Appium
  // discovers). Note Appium requires an even-numbered Node (see
  // .node-version); it refuses to start otherwise. Its output is captured so
  // a failure to start can say *why* — with output discarded, a CI-only
  // startup failure is undebuggable. `detached` puts it in its own process
  // group, so the kill below can take out the whole npx -> appium tree; a
  // surviving grandchild otherwise holds the captured pipes open and wedges
  // this process at exit.
  const server: ChildProcess = spawn(
    "npx",
    ["appium", "server", "-p", String(APPIUM_PORT)],
    {
      stdio: ["ignore", "pipe", "pipe"],
      cwd: import.meta.dirname,
      detached: true,
    },
  );
  let serverOutput = "";
  for (const stream of [server.stdout, server.stderr]) {
    stream?.on("data", (chunk: Buffer) => {
      serverOutput = (serverOutput + chunk.toString()).slice(-4_000);
    });
  }
  function killServerTree() {
    if (server.pid !== undefined) {
      try {
        process.kill(-server.pid, "SIGKILL");
        return;
      } catch {
        // Group already gone, or platform quirk — fall through.
      }
    }
    server.kill("SIGKILL");
  }

  // Generous: a cold CI runner pays npx resolution and Appium's first-run
  // driver discovery here.
  const deadline = Date.now() + 180_000;
  for (;;) {
    const ok = await fetch(`http://127.0.0.1:${APPIUM_PORT}/status`)
      .then((res) => res.ok)
      .catch(() => false);
    if (ok) {
      break;
    }
    if (Date.now() > deadline) {
      killServerTree();
      throw new Error(
        "Appium did not start (node " +
          process.version +
          "; it requires an " +
          "even-numbered Node version and the appium-xcuitest-driver " +
          "devDependency). Appium output:\n" +
          (serverOutput || "(no output)"),
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  return async () => {
    killServerTree();
    if (bootedByUs) {
      await execFileAsync("xcrun", ["simctl", "shutdown", bootedByUs]).catch(
        () => {},
      );
    }
  };
}

export default async function setup(): Promise<(() => Promise<void>) | void> {
  const targets = await activeDevices();
  if (targets.length === 0) {
    // Nothing this machine can drive; the suites self-skip.
    return;
  }

  await ensureAppServer();

  const teardowns: (() => Promise<void>)[] = [];
  if (targets.some((t) => t.kind === "local-ios")) {
    teardowns.push(await startLocalIos());
  }

  return async () => {
    for (const teardown of teardowns.reverse()) {
      await teardown();
    }
  };
}
