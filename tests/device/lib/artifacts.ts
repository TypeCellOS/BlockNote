import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ARTIFACTS_DIR = join(import.meta.dirname, "..", ".artifacts");

/** Writes a base64 (or binary) PNG under tests/device/.artifacts. */
export function saveScreenshot(name: string, png: string | Buffer): string {
  mkdirSync(ARTIFACTS_DIR, { recursive: true });
  const file = join(ARTIFACTS_DIR, `${name}.png`);
  writeFileSync(
    file,
    typeof png === "string" ? Buffer.from(png, "base64") : png,
  );
  return file;
}
