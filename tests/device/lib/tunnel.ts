/**
 * Vitest global setup for the device suite: starts the BrowserStackLocal
 * tunnel, which resolves `bs-local.com` on the real device back to this
 * machine — devices then browse the locally served playground directly (its
 * Vite config allows the `bs-local.com` Host header).
 *
 * The tunnel is managed by BrowserStack's official `browserstack-local`
 * package — their documented Node.js integration, which downloads and runs
 * the right daemon for the host platform itself. The same path runs locally
 * and in CI, so a CI failure reproduces identically on a laptop.
 */
import BrowserStackLocal from "browserstack-local";

import { LOCAL_TUNNEL_ID } from "../devices.js";
import { browserStackCredentials } from "./webdriver.js";

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

export default async function setup(): Promise<(() => Promise<void>) | void> {
  const auth = browserStackCredentials();
  if (!auth) {
    // The suites self-skip without credentials; nothing to set up.
    return;
  }

  await ensureAppServer();

  const tunnel = new BrowserStackLocal.Local();
  await new Promise<void>((resolve, reject) => {
    tunnel.start(
      { key: auth.accessKey, localIdentifier: LOCAL_TUNNEL_ID },
      (error) => (error ? reject(error) : resolve()),
    );
  });

  return () =>
    new Promise<void>((resolve) => {
      tunnel.stop(() => resolve());
    });
}
