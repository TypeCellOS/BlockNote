/**
 * Vitest global setup for the device suite: starts the BrowserStackLocal
 * tunnel daemon, which resolves `bs-local.com` on the real device back to
 * this machine — devices then browse the locally served playground directly
 * (its Vite config allows the `bs-local.com` Host header). The binary is
 * downloaded on first use into tests/device/.cache (gitignored).
 *
 * This file runs both locally and in CI — the same self-managed daemon in
 * both, so a CI failure reproduces identically on a laptop. (BrowserStack
 * also ships a GitHub Action wrapping the same binary; not using it is a
 * deliberate parity choice.)
 */
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { LOCAL_TUNNEL_ID } from "../devices.js";
import { browserStackCredentials } from "./webdriver.js";

const CACHE_DIR = join(import.meta.dirname, "..", ".cache");
const BINARY = join(CACHE_DIR, "BrowserStackLocal");

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

/**
 * The archive BrowserStack publishes for this host, or an explanation of why
 * there is none — checked before downloading so an unsupported platform
 * fails with guidance instead of a broken binary.
 */
function binaryArchive(): string {
  const key = `${process.platform}-${process.arch}`;
  switch (key) {
    // No native arm64 build for macOS; the x64 binary runs under Rosetta 2.
    case "darwin-arm64":
    case "darwin-x64":
      return "BrowserStackLocal-darwin-x64.zip";
    case "linux-x64":
      return "BrowserStackLocal-linux-x64.zip";
    case "linux-arm64":
      return "BrowserStackLocal-linux-arm64.zip";
    default:
      throw new Error(
        `No BrowserStackLocal binary for ${key}. Run the suite from macOS, ` +
          `Linux, or CI (see .github/workflows/device-tests.yml).`,
      );
  }
}

async function ensureLocalBinary(): Promise<void> {
  if (existsSync(BINARY)) {
    return;
  }
  const url = `https://www.browserstack.com/browserstack-local/${binaryArchive()}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download BrowserStackLocal: ${res.status}`);
  }
  mkdirSync(CACHE_DIR, { recursive: true });
  const zipPath = join(CACHE_DIR, "BrowserStackLocal.zip");
  writeFileSync(zipPath, Buffer.from(await res.arrayBuffer()));
  const unzip = spawnSync("unzip", ["-o", zipPath, "-d", CACHE_DIR], {
    encoding: "utf8",
  });
  if (unzip.status !== 0) {
    throw new Error(`unzip failed: ${unzip.stderr}`);
  }
  chmodSync(BINARY, 0o755);
}

function tunnelCommand(action: "start" | "stop", accessKey: string): void {
  const result = spawnSync(
    BINARY,
    [
      "--key",
      accessKey,
      "--local-identifier",
      LOCAL_TUNNEL_ID,
      "--daemon",
      action,
    ],
    { encoding: "utf8", timeout: 60_000 },
  );
  if (action === "start" && !result.stdout.includes('"connected"')) {
    throw new Error(
      `BrowserStackLocal did not connect: ${result.stdout} ${result.stderr}`,
    );
  }
}

export default async function setup(): Promise<(() => void) | void> {
  const auth = browserStackCredentials();
  if (!auth) {
    // The suites self-skip without credentials; nothing to set up.
    return;
  }

  await ensureAppServer();
  await ensureLocalBinary();
  tunnelCommand("start", auth.accessKey);

  return () => {
    tunnelCommand("stop", auth.accessKey);
  };
}
