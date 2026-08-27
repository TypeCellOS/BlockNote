// Ensures pkg/ (the wasm-pack build output) exists and matches the Rust
// sources, building it when it doesn't. Runs as the first step of this
// package's build task, so every consumer - `vp run -r build`, CI, the
// Vercel builds (whose `--filter '<app>...'` graphs include this package) -
// gets a correct wasm without a separate step.
//
// - Fresh (pkg/.build-hash matches the hashed Rust inputs): exits silently.
// - Stale/missing: builds with the wasm-pack devDependency. Needs a Rust
//   toolchain; rustup auto-provisions the pinned version + wasm32 target
//   from rust/rust-toolchain.toml.
// - No toolchain: on CI and Vercel, rustup is bootstrapped automatically
//   (GitHub's ubuntu-24.04 runner images no longer ship Rust). On Vercel it
//   installs under node_modules/.cache, which Vercel persists between
//   builds - as are the cargo registry and target dirs, so warm builds take
//   seconds. On a dev machine it fails with instructions instead of
//   installing things.
//
// `--force` skips the freshness check (the `build:wasm` script).
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = dirname(dirname(fileURLToPath(import.meta.url)));
const rustDir = join(packageDir, "rust");
const pkgDir = join(packageDir, "pkg");
const hashFile = join(pkgDir, ".build-hash");

function listRustInputs() {
  const files = [
    join(rustDir, "Cargo.toml"),
    join(rustDir, "Cargo.lock"),
    join(rustDir, "rust-toolchain.toml"),
  ];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(path);
      } else {
        files.push(path);
      }
    }
  }
  walk(join(rustDir, "src"));
  return files.sort();
}

function inputHash() {
  const hash = createHash("sha256");
  // The wasm-pack version participates: it drives the generated JS glue.
  hash.update(
    JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8"))
      .devDependencies["wasm-pack"],
  );
  for (const file of listRustInputs()) {
    hash.update(file);
    hash.update(readFileSync(file));
  }
  return hash.digest("hex");
}

function commandExists(command, env) {
  try {
    execFileSync(command, ["--version"], { stdio: "ignore", env });
    return true;
  } catch {
    return false;
  }
}

const force = process.argv.includes("--force");
const currentHash = inputHash();
if (
  !force &&
  existsSync(join(pkgDir, "blocknote_typst_wasm_bg.wasm")) &&
  existsSync(hashFile) &&
  readFileSync(hashFile, "utf8") === currentHash
) {
  process.exit(0);
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
  env.PATH = `${join(env.CARGO_HOME, "bin")}:${env.PATH}`;
} else {
  env.PATH = `${join(homedir(), ".cargo", "bin")}:${env.PATH}`;
}

if (!commandExists("cargo", env)) {
  // CI covers GitHub Actions (whose ubuntu-24.04 images ship no Rust) and
  // most other build services; only interactive dev machines get the
  // do-it-yourself error.
  if (!process.env.VERCEL && !process.env.CI) {
    console.error(
      "[ensure-wasm] pkg/ is missing or stale and no Rust toolchain was " +
        "found. Install rustup (https://rustup.rs) - the pinned toolchain " +
        "and wasm32 target auto-install from rust/rust-toolchain.toml - " +
        "then re-run the build (or `npm run build:wasm` in " +
        "packages/xl-typst-compiler).",
    );
    process.exit(1);
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

console.log("[ensure-wasm] building the Typst compiler wasm (rust/ -> pkg/)…");
execFileSync(
  join(packageDir, "node_modules", ".bin", "wasm-pack"),
  [
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
writeFileSync(hashFile, currentHash);
console.log("[ensure-wasm] done.");
