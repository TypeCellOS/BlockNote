import { execSync, spawn, ChildProcess } from "child_process";
import path from "path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const TEST_APP_DIR = path.resolve(__dirname, "../../../nextjs-test-app");
const PORT = 3951; // Unusual port to avoid conflicts
const BASE_URL = `http://localhost:${PORT}`;
const MODE = (process.env.NEXTJS_TEST_MODE || "dev") as "dev" | "build";

let nextProcess: ChildProcess;
let serverOutput = "";
let serverErrors = "";

/**
 * Regression test for #942: @blocknote/server-util must work in Next.js
 * App Router server contexts (API routes) with serverExternalPackages.
 *
 * Set NEXTJS_TEST_MODE=build to test against a production build (slower
 * but catches different issues). Defaults to dev mode for fast iteration.
 */
describe(`server-util in Next.js App Router (#942) [${MODE}]`, () => {
  beforeAll(async () => {
    // Pack and install @blocknote packages as tarballs
    execSync("bash setup.sh", {
      cwd: TEST_APP_DIR,
      stdio: "pipe",
      timeout: 120_000,
    });

    if (MODE === "build") {
      // Build the Next.js app first
      execSync("npx next build", {
        cwd: TEST_APP_DIR,
        stdio: "pipe",
        timeout: 120_000,
      });

      // Start production server
      nextProcess = spawn(
        "npx",
        ["next", "start", "--port", String(PORT)],
        {
          cwd: TEST_APP_DIR,
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
    } else {
      // Start dev server with Turbopack
      nextProcess = spawn(
        "npx",
        ["next", "dev", "--turbopack", "--port", String(PORT)],
        {
          cwd: TEST_APP_DIR,
          stdio: ["ignore", "pipe", "pipe"],
          env: { ...process.env, NODE_ENV: "development" },
        },
      );
    }

    // Wait for "Ready" message
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Next.js ${MODE} server did not start within 60s`));
      }, 60_000);

      let stderr = "";

      nextProcess.stdout?.on("data", (data: Buffer) => {
        const text = data.toString();
        serverOutput += text;
        if (text.includes("Ready")) {
          clearTimeout(timeout);
          resolve();
        }
      });

      nextProcess.stderr?.on("data", (data: Buffer) => {
        stderr += data.toString();
        serverErrors += data.toString();
      });

      nextProcess.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      nextProcess.on("exit", (code) => {
        if (code !== null && code !== 0) {
          clearTimeout(timeout);
          reject(new Error(`Next.js exited with code ${code}: ${stderr}`));
        }
      });
    });
  }, 180_000);

  afterAll(() => {
    if (nextProcess) {
      nextProcess.kill("SIGTERM");
    }
  });

  it("ServerBlockNoteEditor works in API route (mirrors ReactServer.test.tsx)", async () => {
    const res = await fetch(`${BASE_URL}/api/server-util`);
    const text = await res.text();
    let body: any;
    try {
      body = JSON.parse(text);
    } catch {
      const nextDataMatch = text.match(
        /<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/,
      );
      let errorMessage = `Next.js returned ${res.status}`;
      if (nextDataMatch) {
        try {
          errorMessage =
            JSON.parse(nextDataMatch[1])?.err?.message || errorMessage;
        } catch {
          // ignore invalid JSON
        }
      }
      throw new Error(errorMessage);
    }
    expect(res.status).toBe(200);
    if (!body.allPassed) {
      throw new Error(
        `Failed results: ${JSON.stringify(body.results, null, 2)}`,
      );
    }

    // Verify individual results match ReactServer.test.tsx scenarios
    expect(body.results.simpleReactBlock).toMatch(/^PASS:/);
    expect(body.results.reactContextBlock).toMatch(/^PASS:/);
    expect(body.results.blocksToHTMLLossy).toMatch(/^PASS:/);
    expect(body.results.yDocRoundtrip).toMatch(/^PASS:/);
  }, 30_000);

  it("Editor page with shared schema renders without errors", async () => {
    const res = await fetch(`${BASE_URL}/editor`);
    const html = await res.text();

    if (res.status !== 200) {
      const nextDataMatch = html.match(
        /<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/,
      );
      const digestMatch = html.match(/digest="([^"]+)"/);
      let errorDetail = "";
      if (nextDataMatch) {
        try {
          errorDetail = JSON.parse(nextDataMatch[1])?.err?.message;
        } catch {
          // ignore invalid JSON
        }
      }
      if (!errorDetail && digestMatch) {
        errorDetail = `digest: ${digestMatch[1]}`;
      }
      if (!errorDetail) {
        errorDetail = html.substring(0, 500);
      }
      const recentOutput = serverOutput.slice(-1000);
      const recentErrors = serverErrors.slice(-1000);
      throw new Error(
        `Editor page returned ${res.status}: ${errorDetail}\n\nServer stdout:\n${recentOutput}\n\nServer stderr:\n${recentErrors}`,
      );
    }

    expect(html).toContain("BlockNote Editor Test");
    expect(html).toContain("editor-wrapper");
  }, 30_000);
});
