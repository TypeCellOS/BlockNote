// The output-producing build contract. This entire file is automatically hashed
// alongside Rust inputs and the resolved wasm-pack version. Keep compilation
// settings here, not in the cache/download orchestrator.
import { execFileSync } from "node:child_process";
import { join } from "node:path";

export const outputFiles = [
  "blocknote_typst_wasm.js",
  "blocknote_typst_wasm.d.ts",
  "blocknote_typst_wasm_bg.wasm",
  "blocknote_typst_wasm_bg.wasm.d.ts",
];

export function buildWasm(packageDir, env) {
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
    // rustup resolves the pinned toolchain/target from the working directory,
    // including on freshly bootstrapped installations with no default toolchain.
    { stdio: "inherit", cwd: join(packageDir, "rust"), env },
  );
}
