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

import { activeDevices, LOCAL_TUNNEL_ID } from "../devices.js";
import { browserStackCredentials } from "./browserstack.js";
import { SAFARIDRIVER_PORT } from "./localIos.js";

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
  // The hardware-keyboard preference is read when a simulator boots; set it
  // before booting so the software keyboard actually appears on focus.
  await execFileAsync("defaults", [
    "write",
    "com.apple.iphonesimulator",
    "ConnectHardwareKeyboard",
    "-bool",
    "false",
  ]).catch(() => {
    // Best effort: the preference only exists once Simulator.app ran once.
  });

  const { stdout } = await execFileAsync("xcrun", [
    "simctl",
    "list",
    "devices",
    "available",
  ]);
  const booted = stdout.match(/([0-9A-F-]{36}) \(Booted\)/)?.[1];
  let bootedByUs: string | undefined;
  if (!booted) {
    const device = stdout.match(/iPhone [^(]+\(([0-9A-F-]{36})\) \(Shutdown\)/);
    if (!device) {
      throw new Error(
        "No available iPhone simulator found (xcrun simctl list).",
      );
    }
    bootedByUs = device[1];
    await execFileAsync("xcrun", ["simctl", "boot", bootedByUs]);
    await execFileAsync("xcrun", ["simctl", "bootstatus", bootedByUs], {
      timeout: 180_000,
    });
  }

  const driver: ChildProcess = spawn(
    "safaridriver",
    ["-p", String(SAFARIDRIVER_PORT)],
    { stdio: "ignore" },
  );
  // Give it a beat to bind the port.
  await new Promise((resolve) => setTimeout(resolve, 1_500));

  return async () => {
    driver.kill();
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
