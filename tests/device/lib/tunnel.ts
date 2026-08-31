/**
 * Vitest global setup: makes the locally served playground reachable from
 * BrowserStack real devices.
 *
 * Two pieces:
 * 1. A host-rewriting proxy in front of the app server — devices browse
 *    `http://bs-local.com:<PROXY_PORT>`, and Vite's `allowedHosts` check
 *    rejects that Host header, so the proxy forwards with a localhost Host.
 * 2. The BrowserStackLocal tunnel daemon, which resolves `bs-local.com` on
 *    the device back to this machine. The binary is downloaded on first use
 *    into tests/device/.cache (gitignored).
 */
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import http from "node:http";
import { join } from "node:path";

import { LOCAL_TUNNEL_ID } from "../devices.js";
import { browserStackCredentials } from "./webdriver.js";
import { PROXY_PORT } from "./editorPage.js";

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

function startProxy(): http.Server {
  const server = http.createServer(async (req, res) => {
    try {
      // Dev servers occasionally stall on cold transforms; a bounded retry
      // beats a device-side page load hanging forever mid-progress.
      let upstream: Response | undefined;
      for (let attempt = 0; attempt < 2 && !upstream; attempt++) {
        upstream = await fetch(`${targetOrigin()}${req.url}`, {
          headers: {
            accept: req.headers["accept"] ?? "*/*",
            host: new URL(targetOrigin()).host,
          },
          signal: AbortSignal.timeout(20_000),
        }).catch((error) => {
          if (attempt === 1) {
            throw error;
          }
          return undefined;
        });
      }
      if (!upstream) {
        throw new Error("upstream fetch failed");
      }
      const body = Buffer.from(await upstream.arrayBuffer());
      const headers: Record<string, string> = {};
      for (const name of ["content-type", "cache-control"]) {
        const value = upstream.headers.get(name);
        if (value) {
          headers[name] = value;
        }
      }
      res.writeHead(upstream.status, headers);
      res.end(body);
    } catch (error) {
      res.writeHead(502);
      res.end(String(error));
    }
  });
  server.listen(PROXY_PORT, "127.0.0.1");
  return server;
}

async function ensureLocalBinary(): Promise<void> {
  if (existsSync(BINARY)) {
    return;
  }
  const platform = process.platform === "darwin" ? "darwin-x64" : "linux-x64";
  const url = `https://www.browserstack.com/browserstack-local/BrowserStackLocal-${platform}.zip`;
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
  const proxy = startProxy();
  await ensureLocalBinary();
  tunnelCommand("start", auth.accessKey);

  return () => {
    tunnelCommand("stop", auth.accessKey);
    proxy.close();
  };
}
