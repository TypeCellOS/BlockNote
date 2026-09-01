/**
 * Vitest global setup for the device suite. Prepares whichever backends this
 * run can use (see devices.ts):
 *
 * - **All targets** need the app server (the playground dev server, or
 *   whatever DEVICE_TEST_TARGET points at).
 * - **BrowserStack** needs the BrowserStackLocal tunnel — managed by the
 *   official `browserstack-local` package, their documented Node.js
 *   integration; devices resolve `bs-local.com` back to this machine.
 * - **Local iOS** needs a booted simulator with the software keyboard
 *   enabled, and a running safaridriver. "Connect Hardware Keyboard" must be
 *   off — with it on, focusing a field never shows the keyboard, so
 *   keyboard-gated UI (the mobile toolbar) never appears.
 * - **Local Android** needs nothing here: the session itself sets up
 *   `adb reverse` when it connects to the already-running emulator.
 *
 * This file runs both locally and in CI — the same code paths, so a CI
 * failure reproduces identically on a laptop.
 */
import { execFile, spawn, type ChildProcess } from "node:child_process";
import { promisify } from "node:util";
import BrowserStackLocal from "browserstack-local";

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { activeDevices, LOCAL_TUNNEL_ID } from "../devices.js";
import { browserStackCredentials } from "./browserstack.js";
import { APPIUM_PORT, SIM_UDID_FILE } from "./localIos.js";

const execFileAsync = promisify(execFile);

function targetOrigin(): string {
  return process.env.DEVICE_TEST_TARGET ?? "http://127.0.0.1:5173";
}

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
}

async function startBrowserStackTunnel(
  accessKey: string,
): Promise<() => Promise<void>> {
  const tunnel = new BrowserStackLocal.Local();
  await new Promise<void>((resolve, reject) => {
    tunnel.start(
      { key: accessKey, localIdentifier: LOCAL_TUNNEL_ID },
      (error) => (error ? reject(error) : resolve()),
    );
  });
  return () =>
    new Promise<void>((resolve) => {
      tunnel.stop(() => resolve());
    });
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
  // .node-version); it refuses to start otherwise.
  const server: ChildProcess = spawn(
    "npx",
    ["appium", "server", "-p", String(APPIUM_PORT)],
    { stdio: "ignore", cwd: import.meta.dirname },
  );
  const deadline = Date.now() + 60_000;
  for (;;) {
    const ok = await fetch(`http://127.0.0.1:${APPIUM_PORT}/status`)
      .then((res) => res.ok)
      .catch(() => false);
    if (ok) {
      break;
    }
    if (Date.now() > deadline) {
      server.kill();
      throw new Error(
        "Appium did not start. It requires an even-numbered Node version " +
          "(see .node-version) and the appium-xcuitest-driver devDependency.",
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  return async () => {
    server.kill();
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
  if (targets.some((t) => t.kind === "browserstack")) {
    const auth = browserStackCredentials();
    if (auth) {
      teardowns.push(await startBrowserStackTunnel(auth.accessKey));
    }
  }
  if (targets.some((t) => t.kind === "local-ios")) {
    teardowns.push(await startLocalIos());
  }

  return async () => {
    for (const teardown of teardowns.reverse()) {
      await teardown();
    }
  };
}
