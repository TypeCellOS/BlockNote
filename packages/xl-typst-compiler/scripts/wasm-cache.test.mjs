import { execFile, execFileSync } from "node:child_process";
import fs, {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { promisify } from "node:util";
import { zipSync } from "fflate";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import {
  artifactName,
  downloadOutput,
  inputHash,
  installOutput,
  outputFiles,
  packageDir,
  storeOutput,
  trustedRun,
  unpackArtifact,
  validateOutput,
  writeManifest,
} from "./wasm-cache.mjs";

const temps = [];
function temp() {
  const dir = mkdtempSync(join(tmpdir(), "typst-cache-test-"));
  temps.push(dir);
  return dir;
}
afterEach(() => {
  vi.unstubAllEnvs();
  for (const dir of temps.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function fixture() {
  const root = temp();
  for (const dir of ["rust/src", "scripts", "node_modules/wasm-pack"]) {
    mkdirSync(join(root, dir), { recursive: true });
  }
  for (const file of ["Cargo.toml", "Cargo.lock", "rust-toolchain.toml"]) {
    writeFileSync(join(root, "rust", file), file);
  }
  writeFileSync(join(root, "rust/src/lib.rs"), "rust source");
  writeFileSync(
    join(root, "node_modules/wasm-pack/package.json"),
    '{"version":"0.15.0"}',
  );
  for (const file of ["ensure-wasm.mjs", "wasm-cache.mjs", "wasm-build.mjs"]) {
    copyFileSync(
      join(packageDir, "scripts", file),
      join(root, "scripts", file),
    );
  }
  return root;
}

function output(dir, hash) {
  mkdirSync(dir, { recursive: true });
  for (const file of outputFiles) {
    writeFileSync(join(dir, file), `generated ${file}`);
  }
  writeManifest(dir, hash);
}

function zipOutput(dir, extra = {}) {
  return zipSync({
    ...Object.fromEntries(
      [...outputFiles, ".build-manifest.json"].map((file) => [
        file,
        readFileSync(join(dir, file)),
      ]),
    ),
    ...extra,
  });
}

const run = {
  event: "push",
  head_branch: "main",
  head_repository: { full_name: "TypeCellOS/BlockNote" },
  repository: { full_name: "TypeCellOS/BlockNote" },
  path: ".github/workflows/build.yml",
  status: "completed",
  conclusion: "success",
};

describe("WASM fingerprint and verification", () => {
  it("is checkout-independent and ignores TypeScript-only changes", () => {
    const first = fixture();
    const second = fixture();
    expect(inputHash(first)).toBe(inputHash(second));
    writeFileSync(join(first, "wrapper.ts"), "changed TypeScript");
    expect(inputHash(first)).toBe(inputHash(second));
  });

  it.each([
    "rust/src/lib.rs",
    "rust/src/new.rs",
    "rust/Cargo.toml",
    "rust/Cargo.lock",
    "rust/rust-toolchain.toml",
    "scripts/wasm-build.mjs",
    "node_modules/wasm-pack/package.json",
  ])("invalidates after changing %s", (file) => {
    const root = fixture();
    const before = inputHash(root);
    writeFileSync(
      join(root, file),
      file.endsWith("package.json") ? '{"version":"0.16.0"}' : "changed",
    );
    expect(inputHash(root)).not.toBe(before);
  });

  it.each(["scripts/ensure-wasm.mjs", "scripts/wasm-cache.mjs"])(
    "preserves compilation identity after transport/orchestration changes to %s",
    (file) => {
      const root = fixture();
      const before = inputHash(root);
      writeFileSync(join(root, file), "// changed cache transport or logging");
      expect(inputHash(root)).toBe(before);
    },
  );

  it("uses the checksum manifest as its only metadata", () => {
    const dir = temp();
    writeFileSync(join(dir, ".build-hash"), "legacy v2 metadata");
    output(dir, "hash");
    expect(readdirSync(dir).sort()).toEqual(
      [...outputFiles, ".build-manifest.json"].sort(),
    );
    expect(validateOutput(dir, "hash")).toBe(true);
    expect(unpackArtifact(zipOutput(dir), temp(), "hash")).toEqual({
      restored: true,
    });
    expect(
      unpackArtifact(
        zipOutput(dir, { ".build-hash": Buffer.from("hash") }),
        temp(),
        "hash",
      ).error,
    ).toContain("contents");
  });

  it("rejects missing, corrupt, stale, or malformed outputs", () => {
    const dir = temp();
    expect(validateOutput(dir, "hash")).toBe(false);
    output(dir, "hash");
    expect(validateOutput(dir, "hash")).toBe(true);
    expect(validateOutput(dir, "other")).toBe(false);
    writeFileSync(join(dir, outputFiles[0]), "corrupt");
    expect(validateOutput(dir, "hash")).toBe(false);
    output(dir, "hash");
    writeFileSync(join(dir, ".build-manifest.json"), "broken json");
    expect(validateOutput(dir, "hash")).toBe(false);
  });

  it("shares a verified output without merging stale destination files", () => {
    const source = temp();
    const cache = temp();
    const destination = temp();
    output(source, "hash");
    storeOutput(source, "hash", cache);
    storeOutput(source, "hash", cache);
    writeFileSync(join(destination, "stale.js"), "stale");
    installOutput(join(cache, "hash"), destination);
    expect(validateOutput(destination, "hash")).toBe(true);
    expect(existsSync(join(destination, "stale.js"))).toBe(false);
  });
});

describe("GitHub artifacts", () => {
  it.each([true, false])(
    "downloads while trust is pending, then gates installation (trusted: %s)",
    async (trusted) => {
      const source = temp();
      const destination = join(temp(), "pkg");
      output(source, "hash");
      output(destination, "previous");
      const zip = zipOutput(source);
      const metadata = Promise.withResolvers();
      let storageSignal;
      let storageStarted = false;
      const pending = downloadOutput("hash", destination, {
        token: "token",
        fetcher: async (url, options) => {
          if (url.includes("/artifacts?")) {
            return Response.json({
              artifacts: [
                { name: artifactName("hash"), id: 1, workflow_run: { id: 2 } },
              ],
            });
          }
          if (url.endsWith("/runs/2")) {
            return metadata.promise;
          }
          if (url.endsWith("/artifacts/1/zip")) {
            return new Response(null, {
              status: 302,
              headers: { location: "https://storage.example/artifact" },
            });
          }
          expect(url).toBe("https://storage.example/artifact");
          expect(options.headers.Authorization).toBeUndefined();
          storageStarted = true;
          storageSignal = options.signal;
          if (trusted) {
            return new Response(zip);
          }
          return new Promise((resolve, reject) => {
            options.signal.throwIfAborted();
            options.signal.addEventListener(
              "abort",
              () => reject(options.signal.reason),
              { once: true },
            );
          });
        },
      });
      try {
        // Drain the immediate mock HTTP work, without resolving producer trust.
        await new Promise(setImmediate);
        expect(storageStarted).toBe(true);
        expect(validateOutput(destination, "previous")).toBe(true);
        expect(readdirSync(dirname(destination))).toEqual(["pkg"]);
      } finally {
        metadata.resolve(
          Response.json(trusted ? run : { ...run, event: "pull_request" }),
        );
        const result = await pending;
        expect(result).toEqual(
          trusted
            ? { restored: true }
            : { error: "no matching artifact from a successful main build" },
        );
      }
      expect(storageSignal.aborted).toBe(true);
      expect(validateOutput(destination, trusted ? "hash" : "previous")).toBe(
        true,
      );
    },
  );

  it.each([
    { event: "pull_request" },
    { head_branch: "feature" },
    { head_repository: { full_name: "untrusted/fork" } },
    { path: ".github/workflows/other.yml" },
    { status: "in_progress" },
    { conclusion: "failure" },
  ])("rejects an untrusted producer: %j", (change) => {
    expect(trustedRun({ ...run, ...change })).toBe(false);
  });

  it.each([false, true])(
    "verifies downloads before installation (corrupt: %s) without forwarding credentials to storage",
    async (corrupt) => {
      const source = temp();
      const parent = temp();
      const destination = join(parent, "nested", "pkg");
      output(destination, "previous");
      output(source, "hash");
      if (corrupt) {
        writeFileSync(join(source, outputFiles[0]), "corrupt");
      }
      const zip = zipOutput(source);
      const calls = [];
      const responses = [
        Response.json({
          artifacts: [
            {
              name: artifactName("hash"),
              id: 1,
              expired: false,
              workflow_run: { id: 2 },
            },
          ],
        }),
        Response.json(run),
        new Response(null, {
          status: 302,
          headers: { location: "https://storage.example/artifact" },
        }),
        new Response(zip),
      ];
      const stageDirectory = vi.spyOn(fs, "mkdtempSync");
      const copyFile = vi.spyOn(fs, "copyFileSync");
      // wasm-cache imports named Node exports. Observe the real operations
      // through those bindings without mocking the rest of the module.
      syncBuiltinESMExports();
      try {
        const result = await downloadOutput("hash", destination, {
          token: "test-token",
          fetcher: async (url, options) => {
            calls.push({ url, options });
            return responses.shift();
          },
        });
        expect(result).toEqual(
          corrupt
            ? { error: "artifact checksum mismatch" }
            : { restored: true },
        );
        expect(stageDirectory.mock.calls.at(-1)?.[0]).toBe(
          join(dirname(destination), ".typst-stage-"),
        );
        expect(copyFile).not.toHaveBeenCalled();
      } finally {
        stageDirectory.mockRestore();
        copyFile.mockRestore();
        syncBuiltinESMExports();
      }
      expect(validateOutput(destination, corrupt ? "previous" : "hash")).toBe(
        true,
      );
      expect(readdirSync(dirname(destination))).toEqual(["pkg"]);
      expect(calls[0].url).toContain(`name=${artifactName("hash")}`);
      expect(calls[0].options.headers.Authorization).toBe("Bearer test-token");
      expect(calls[3].options.headers.Authorization).toBeUndefined();
    },
  );

  it("reports expected credential, network, authentication, and expiration misses", async () => {
    expect(
      (await downloadOutput("hash", temp(), { token: "" })).error,
    ).toContain("credentials");
    for (const fetcher of [
      async () => {
        throw new TypeError("offline");
      },
      async () => new Response(null, { status: 401 }),
      async () => Response.json({ artifacts: [] }),
      async () =>
        Response.json({
          artifacts: [{ name: artifactName("hash"), expired: true }],
        }),
    ]) {
      expect(
        (await downloadOutput("hash", temp(), { token: "token", fetcher }))
          .error,
      ).toBeTruthy();
    }
  });

  it("does not swallow unexpected programming errors", async () => {
    await expect(
      downloadOutput("hash", temp(), {
        token: "token",
        fetcher: async () => {
          throw new Error("bug");
        },
      }),
    ).rejects.toThrow("bug");
  });

  it("rejects corrupt archives and unexpected archive paths", () => {
    const source = temp();
    output(source, "hash");
    writeFileSync(join(source, outputFiles[0]), "corrupt");
    expect(unpackArtifact(zipOutput(source), temp(), "hash").error).toContain(
      "checksum",
    );
    output(source, "hash");
    const zip = zipSync({ "../escape": new Uint8Array([1]) });
    expect(unpackArtifact(zip, temp(), "hash").error).toContain("contents");
    expect(
      unpackArtifact(new Uint8Array([1, 2, 3]), temp(), "hash").error,
    ).toContain("archive");
  });

  it("extracts without system ZIP tools", () => {
    const source = temp();
    const destination = temp();
    output(source, "hash");
    const zip = zipOutput(source);
    vi.stubEnv("PATH", "");
    expect(unpackArtifact(zip, destination, "hash")).toEqual({
      restored: true,
    });
    expect(validateOutput(destination, "hash")).toBe(true);
  });

  it.each(["duplicate entries", "oversized declared output"])(
    "rejects %s before writing files",
    (kind) => {
      const source = temp();
      output(source, "hash");
      // fflate creates ZIPs without comments: the end record is the last 22 bytes,
      // with the central-directory offset at +16. Mutate its metadata only.
      const duplicate = Buffer.from(
        zipOutput(source, { "blocknote_typst_wasm.jx": new Uint8Array([1]) }),
      );
      const directory = duplicate.readUInt32LE(duplicate.length - 6);
      const name = duplicate.indexOf("blocknote_typst_wasm.jx", directory);
      duplicate.write("blocknote_typst_wasm.js", name);
      const oversized = Buffer.from(zipOutput(source));
      oversized.writeUInt32LE(
        64 * 1024 * 1024 + 1,
        oversized.readUInt32LE(oversized.length - 6) + 24,
      );
      const zip = kind === "duplicate entries" ? duplicate : oversized;
      const destination = temp();
      expect(unpackArtifact(zip, destination, "hash").error).toContain(
        "contents",
      );
      expect(readdirSync(destination)).toEqual([]);
    },
  );
});

describe("build entry point", () => {
  function buildFixture() {
    const root = fixture();
    // Only child processes need to resolve fflate from the staged checkout.
    cpSync(
      join(packageDir, "node_modules/fflate"),
      join(root, "node_modules/fflate"),
      { recursive: true, dereference: true },
    );
    return root;
  }

  function buildOptions(root, extraEnv = {}) {
    return {
      encoding: "utf8",
      env: {
        ...process.env,
        BLOCKNOTE_TYPST_CACHE_DIR: join(root, "shared-cache"),
        BLOCKNOTE_TYPST_DOWNLOAD: "0",
        BLOCKNOTE_TYPST_SOURCE_ONLY: "0",
        ...extraEnv,
      },
    };
  }

  function build(root, extraEnv = {}, args = []) {
    return execFileSync(
      process.execPath,
      [join(root, "scripts/ensure-wasm.mjs"), ...args],
      buildOptions(root, extraEnv),
    );
  }

  function fakeToolchain(root, delayMs = 0) {
    mkdirSync(join(root, "bin"));
    writeFileSync(join(root, "bin/cargo"), "#!/bin/sh\nexit 0\n", {
      mode: 0o755,
    });
    writeFileSync(
      join(root, "node_modules/wasm-pack/run.js"),
      `#!${process.execPath}
const fs = require("node:fs");
const path = require("node:path");
const pkg = path.resolve("../pkg");
function compile() {
  fs.mkdirSync(pkg, { recursive: true });
  for (const file of ${JSON.stringify(outputFiles)}) {
    fs.writeFileSync(path.join(pkg, file), "compiled output");
  }
  fs.appendFileSync(path.resolve("../compilations"), "compiled\\n");
  fs.writeFileSync(path.resolve("../compiler-args.json"), JSON.stringify(process.argv.slice(2)));
  console.log("compiled");
}
${delayMs ? `setTimeout(compile, ${delayMs});` : "compile();"}
`,
      { mode: 0o755 },
    );
    // ensure-wasm puts CARGO_HOME/bin before PATH. Don't let a developer's
    // real cargo take precedence over the fake toolchain in this fixture.
    return {
      CARGO_HOME: root,
      PATH: `${join(root, "bin")}${delimiter}${process.env.PATH}`,
    };
  }

  it("restores a fresh checkout without invoking a compiler, then reuses pkg locally", () => {
    const root = buildFixture();
    const hash = inputHash(root);
    output(join(root, "shared-cache", hash), hash);
    expect(build(root)).toContain("restored shared WASM cache");
    expect(validateOutput(join(root, "pkg"), hash)).toBe(true);
    expect(build(root)).toBe("");
    expect(existsSync(join(root, "node_modules/.typst-wasm.lock"))).toBe(false);
  });

  it("reports missing Rust on Windows CI without attempting the Unix installer", async () => {
    const root = buildFixture();
    const preload = join(root, "windows.cjs");
    writeFileSync(
      preload,
      'Object.defineProperty(process, "platform", { value: "win32" });',
    );
    const execute = promisify(execFile);
    await expect(
      execute(
        process.execPath,
        ["--require", preload, join(root, "scripts/ensure-wasm.mjs")],
        buildOptions(root, {
          CI: "1",
          PATH: "",
          CARGO_HOME: join(root, "missing-rust"),
        }),
      ),
    ).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining("Install rustup"),
    });
    expect(existsSync(join(root, "node_modules/.typst-wasm.lock"))).toBe(false);
  });

  it("force and source-only bypass matching local and shared outputs", () => {
    const root = buildFixture();
    const hash = inputHash(root);
    output(join(root, "pkg"), hash);
    output(join(root, "shared-cache", hash), hash);
    // A fake toolchain proves compilation is reached without paying for Rust.
    const env = fakeToolchain(root);
    expect(build(root, env, ["--force"])).toContain("compiled");
    expect(build(root, { ...env, BLOCKNOTE_TYPST_SOURCE_ONLY: "1" })).toContain(
      "compiled",
    );
  });

  it("executes changed settings from the automatically hashed build contract", () => {
    const root = buildFixture();
    const before = inputHash(root);
    const contract = join(root, "scripts/wasm-build.mjs");
    writeFileSync(
      contract,
      readFileSync(contract, "utf8").replace('"web"', '"no-modules"'),
    );
    expect(inputHash(root)).not.toBe(before);
    expect(build(root, fakeToolchain(root), ["--force"])).toContain("compiled");
    expect(
      JSON.parse(readFileSync(join(root, "compiler-args.json"), "utf8")),
    ).toEqual([
      "build",
      ".",
      "--target",
      "no-modules",
      "--release",
      "--out-dir",
      "../pkg",
      "--out-name",
      "blocknote_typst_wasm",
    ]);
  });

  it("serializes cold builds and saves source output for another worktree", async () => {
    const root = buildFixture();
    // Keep compilation in progress long enough for the other build to contend.
    const env = fakeToolchain(root, 100);
    const execute = promisify(execFile);
    // Wait for both children to exit before afterEach can remove the checkout.
    const results = await Promise.allSettled([
      execute(
        process.execPath,
        [join(root, "scripts/ensure-wasm.mjs")],
        buildOptions(root, env),
      ),
      execute(
        process.execPath,
        [join(root, "scripts/ensure-wasm.mjs")],
        buildOptions(root, env),
      ),
    ]);
    const errors = results.flatMap((result) =>
      result.status === "rejected" ? [result.reason] : [],
    );
    if (errors.length === 1) {
      throw errors[0];
    }
    if (errors.length > 1) {
      throw new AggregateError(errors, "Both cold builds failed");
    }
    const stdout = results.flatMap((result) =>
      result.status === "fulfilled" ? [result.value.stdout] : [],
    );
    expect(stdout.join("")).toContain("compiled");
    expect(readFileSync(join(root, "compilations"), "utf8")).toBe("compiled\n");
    const other = buildFixture();
    expect(
      build(other, { BLOCKNOTE_TYPST_CACHE_DIR: join(root, "shared-cache") }),
    ).toContain("restored shared WASM cache");
    expect(validateOutput(join(other, "pkg"), inputHash(other))).toBe(true);
  });
});
