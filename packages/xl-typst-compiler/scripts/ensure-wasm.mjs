// Ensures pkg/ (the wasm-pack build output) exists and matches the Rust
// sources, building it when it doesn't. Runs as the first step of this
// package's build task, so every consumer - `vp run -r build`, CI, the
// Vercel builds (whose `--filter '<app>...'` graphs include this package) -
// gets a correct wasm without a separate step.
//
// - Fresh verified pkg/: exits silently.
// - Stale/missing: restore the shared cache or an exact-hash CI artifact first.
// - Cache miss: builds with the wasm-pack devDependency. Needs a Rust
//   toolchain; rustup auto-provisions the pinned version + wasm32 target
//   from rust/rust-toolchain.toml.
// - No toolchain: on CI and Vercel, rustup is bootstrapped automatically
//   (GitHub's ubuntu-24.04 runner images no longer ship Rust). On Vercel it
//   installs under node_modules/.cache, which Vercel persists between
//   builds - as are the cargo registry and target dirs, so warm builds take
//   seconds. On a dev machine it fails with instructions instead of
//   installing things.
//
// `--force` skips every cache (the `build:wasm` script).
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";
import { setTimeout } from "node:timers/promises";
import {
  cacheRoot,
  downloadOutput,
  inputHash,
  installOutput,
  packageDir,
  storeOutput,
  validateOutput,
  writeManifest,
} from "./wasm-cache.mjs";

const rustDir = join(packageDir, "rust");
const pkgDir = join(packageDir, "pkg");

function commandExists(command, env) {
  try {
    execFileSync(command, ["--version"], { stdio: "ignore", env });
    return true;
  } catch {
    return false;
  }
}

async function ensureWasm() {
  const force = process.argv.includes("--force");
  // Publishing deliberately bypasses all reusable outputs, including local pkg/.
  const sourceOnly = process.env.BLOCKNOTE_TYPST_SOURCE_ONLY === "1";
  const currentHash = inputHash();
  if (!force && !sourceOnly) {
    if (validateOutput(pkgDir, currentHash)) {
      return;
    }
    const cached = join(cacheRoot(), currentHash);
    if (validateOutput(cached, currentHash)) {
      installOutput(cached, pkgDir);
      console.log("[ensure-wasm] restored shared WASM cache");
      return;
    }
    if (process.env.BLOCKNOTE_TYPST_DOWNLOAD !== "0") {
      const result = await downloadOutput(currentHash, pkgDir);
      if (!result.error) {
        storeOutput(pkgDir, currentHash);
        console.log(
          "[ensure-wasm] downloaded matching WASM from GitHub Actions",
        );
        return;
      }
      console.log(`[ensure-wasm] ${result.error}; building from source`);
    }
  }

  const env = { ...process.env };

  // On Vercel, keep every Rust artifact under node_modules/.cache: it is
  // persisted between builds, so only the first build on a fresh cache pays
  // the full compile. Elsewhere rustup's default home is fine (and gets on
  // PATH explicitly, since a fresh install can't modify the current shell).
  if (process.env.VERCEL) {
    const cacheDir = join(packageDir, "node_modules", ".cache", "rust");
    mkdirSync(cacheDir, { recursive: true });
    env.CARGO_HOME = join(cacheDir, "cargo");
    env.RUSTUP_HOME = join(cacheDir, "rustup");
    env.CARGO_TARGET_DIR = join(cacheDir, "target");
  }
  // Windows commonly spells this key `Path`; spreading process.env loses its
  // case-insensitive lookup behavior, so retain the original key.
  const pathKey =
    process.platform === "win32"
      ? Object.keys(env).find((key) => key.toUpperCase() === "PATH") || "PATH"
      : "PATH";
  const cargoBin = join(env.CARGO_HOME || join(homedir(), ".cargo"), "bin");
  env[pathKey] = [cargoBin, env[pathKey]].filter(Boolean).join(delimiter);

  if (!commandExists("cargo", env)) {
    // CI covers GitHub Actions (whose ubuntu-24.04 images ship no Rust) and
    // most other build services. Windows needs its native rustup installer;
    // interactive dev machines also install Rust themselves.
    if (
      process.platform === "win32" ||
      (!process.env.VERCEL && !process.env.CI)
    ) {
      console.error(
        "[ensure-wasm] pkg/ is missing or stale and no Rust toolchain was " +
          "found. Install rustup (https://rustup.rs) - the pinned toolchain " +
          "and wasm32 target auto-install from rust/rust-toolchain.toml - " +
          "then re-run the build (or `vp run build:wasm` in " +
          "packages/xl-typst-compiler).",
      );
      process.exitCode = 1;
      return;
    }
    console.log("[ensure-wasm] installing rustup (CI/Vercel build)…");
    execFileSync(
      "sh",
      [
        "-c",
        "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain none --no-modify-path",
      ],
      { stdio: "inherit", env },
    );
  }

  console.log(
    "[ensure-wasm] building the Typst compiler wasm (rust/ -> pkg/)…",
  );
  execFileSync(
    process.execPath,
    [
      join(packageDir, "node_modules", "wasm-pack", "run.js"),
      "build",
      ".",
      "--target",
      "web",
      "--release",
      "--out-dir",
      "../pkg",
      "--out-name",
      "blocknote_typst_wasm",
    ],
    // cwd must be the crate directory: rustup resolves rust-toolchain.toml
    // (the pinned toolchain + wasm32 target, auto-installed on first use) by
    // walking up from the *working directory* - from packageDir a freshly
    // bootstrapped rustup with no default toolchain finds nothing to run.
    { stdio: "inherit", cwd: rustDir, env },
  );
  if (inputHash() !== currentHash) {
    throw new Error(
      "Typst WASM inputs changed during compilation; rerun the build.",
    );
  }
  writeManifest(pkgDir, currentHash);
  // A forced developer rebuild can seed other worktrees too; release builds
  // intentionally do not read or write the shared developer cache.
  if (!sourceOnly) {
    storeOutput(pkgDir, currentHash);
  }
  console.log("[ensure-wasm] done.");
}

// Serialize builds in one checkout. The shared cache itself uses atomic
// publication, so builds in different worktrees don't block one another.
const lock = join(packageDir, "node_modules", ".typst-wasm.lock");
const deadline = Date.now() + 10 * 60 * 1000;
while (true) {
  try {
    mkdirSync(lock);
    break;
  } catch (error) {
    if (error.code !== "EEXIST") {
      throw error;
    }
    if (Date.now() > deadline) {
      throw new Error(
        `Timed out waiting for ${lock}; remove it if its build was interrupted.`,
      );
    }
    await setTimeout(250);
  }
}
try {
  await ensureWasm();
} finally {
  rmSync(lock, { recursive: true, force: true });
}
