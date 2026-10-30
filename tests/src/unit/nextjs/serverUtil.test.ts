import { execFileSync, spawn, ChildProcess } from "child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { getPort } from "get-port-please";
import path from "path";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";

const FIXTURE_DIR = path.resolve(__dirname, "../../../nextjs-test-app");
// pnpm 11 otherwise reinstalls before exec using its default isolated linker,
// undoing setup.sh's hoisted install and duplicating externalized packages.
const NEXT_ARGS = [
  "--ignore-workspace",
  "--config.verify-deps-before-run=false",
  "exec",
  "next",
];
let testAppDir: string | undefined;
let PORT: number;
let BASE_URL: string;
const MODE = process.env.NEXTJS_TEST_MODE;
if (MODE !== undefined && MODE !== "dev" && MODE !== "build") {
  throw new Error("NEXTJS_TEST_MODE must be dev or build");
}

let nextProcess: ChildProcess | undefined;
let serverOutput = "";
let serverErrors = "";

async function fetchFromServer(route: string) {
  try {
    return await fetch(`${BASE_URL}${route}`);
  } catch (error) {
    throw new Error(
      `Next.js request failed\n${serverOutput}\n${serverErrors}`,
      { cause: error },
    );
  }
}

/**
 * Regression test for #942: @blocknote/server-util must work in Next.js
 * App Router server contexts (API routes) with serverExternalPackages.
 *
 * Runs only when NEXTJS_TEST_MODE is set, as it packs the packages and
 * installs them outside the workspace: `dev`, or `build` for a production build (slower
 * but catches different issues).
 */
const describeIf = MODE ? describe : describe.skip;
describeIf(`server-util in Next.js App Router (#942) [${MODE}]`, () => {
  beforeAll(async () => {
    PORT = await getPort({ portRange: [3900, 4100] });
    BASE_URL = `http://localhost:${PORT}`;

    // Prefer the harness-approved temp directory when available. A fresh
    // directory outside the checkout prevents ancestor dependency fallbacks.
    const harnessTempDir = path.join(tmpdir(), "opencode");
    testAppDir = mkdtempSync(
      path.join(
        existsSync(harnessTempDir) ? harnessTempDir : tmpdir(),
        "blocknote-nextjs-",
      ),
    );
    execFileSync("bash", [path.join(FIXTURE_DIR, "setup.sh"), testAppDir], {
      cwd: FIXTURE_DIR,
      stdio: "pipe",
      timeout: 240_000,
    });

    if (MODE === "build") {
      // Build the Next.js app first
      execFileSync("pnpm", [...NEXT_ARGS, "build"], {
        cwd: testAppDir,
        stdio: "pipe",
        timeout: 120_000,
        env: { ...process.env, NODE_ENV: "production" },
      });
    }

    const child = spawn(
      "pnpm",
      [
        ...NEXT_ARGS,
        MODE === "build" ? "start" : "dev",
        ...(MODE === "build" ? [] : ["--turbopack"]),
        "--port",
        String(PORT),
      ],
      {
        cwd: testAppDir,
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          NODE_ENV: MODE === "build" ? "production" : "development",
        },
        detached: true,
      },
    );
    nextProcess = child;

    // Wait for "Ready" message
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Next.js ${MODE} server did not start within 60s`));
      }, 60_000);

      let stderr = "";

      child.stdout?.on("data", (data: Buffer) => {
        const text = data.toString();
        serverOutput += text;
        if (text.includes("Ready")) {
          clearTimeout(timeout);
          resolve();
        }
      });

      child.stderr?.on("data", (data: Buffer) => {
        stderr += data.toString();
        serverErrors += data.toString();
      });

      child.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      child.on("exit", (code) => {
        clearTimeout(timeout);
        reject(
          new Error(
            `Next.js exited before readiness with code ${code}: ${stderr}`,
          ),
        );
      });
    });
  }, 450_000); // setup (240s) + build (120s) + readiness (60s), with headroom

  afterAll(async () => {
    try {
      if (nextProcess?.pid != null) {
        // This is a disposable server. Kill the entire detached group, then
        // wait for its children too, not just the pnpm wrapper, before deleting it.
        const deadline = Date.now() + 5_000;
        for (let signal: NodeJS.Signals | 0 = "SIGKILL"; ; signal = 0) {
          try {
            process.kill(-nextProcess.pid, signal);
          } catch (error) {
            if (error instanceof Error && "code" in error) {
              if (error.code === "ESRCH") {
                break;
              }
              // A denied existence probe does not establish disappearance.
              if (signal !== 0 || error.code !== "EPERM") {
                throw error;
              }
            } else {
              throw error;
            }
          }
          if (Date.now() >= deadline) {
            throw new Error(
              `Next.js process group ${nextProcess.pid} did not exit`,
            );
          }
          await new Promise((resolve) => setTimeout(resolve, 25));
        }
      }
    } finally {
      if (testAppDir) {
        rmSync(testAppDir, { recursive: true, force: true });
      }
    }
  }, 15_000);

  it("cannot resolve workspace-only packages from the installed consumer", () => {
    execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `
      import assert from "node:assert/strict";
      import { createRequire } from "node:module";
      const require = createRequire(process.cwd() + "/node_modules/@blocknote/server-util/package.json");
      assert.throws(() => require.resolve("@blocknote/math-block"), { code: "MODULE_NOT_FOUND" });
    `,
      ],
      { cwd: testAppDir, stdio: "pipe" },
    );
  });

  it("ServerBlockNoteEditor works in API route (mirrors ReactServer.test.tsx)", async () => {
    const res = await fetchFromServer("/api/server-util");
    const text = await res.text();
    expect(res.status, `${text}\n${serverOutput}\n${serverErrors}`).toBe(200);
    const body = JSON.parse(text);
    if (!body.allPassed) {
      throw new Error(
        `Failed results: ${JSON.stringify(body.results, null, 2)}`,
      );
    }

    // Verify individual results match ReactServer.test.tsx scenarios
    expect(body.results.simpleReactBlock).toMatch(/^PASS:/);
    expect(body.results.blocksToHTMLLossy).toMatch(/^PASS:/);
    expect(body.results.yDocRoundtrip).toMatch(/^PASS:/);
  }, 30_000);

  it("serves the editor page shell (not browser hydration)", async () => {
    const res = await fetchFromServer("/editor");
    const html = await res.text();

    expect(res.status, `${html}\n${serverOutput}\n${serverErrors}`).toBe(200);

    expect(html).toContain("BlockNote Editor Test");
    expect(html).toContain("editor-wrapper");
  }, 30_000);
});
