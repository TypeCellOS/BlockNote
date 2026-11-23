import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";

const [, , artifacts, browser] = process.argv;
if (!["chromium", "firefox", "webkit"].includes(browser)) {
  throw new Error(`Unsupported desktop reuse project: ${browser}`);
}

const project = `e2e (${browser})`;
const clipboard = resolve("src/end-to-end/copypaste/nativeClipboard.test.tsx");

function discover(name, filters = []) {
  const json = join(artifacts, `${name}.json`);
  execFileSync(
    "node_modules/.bin/vp",
    [
      "test",
      "list",
      "-c",
      "vite.config.browser.ts",
      "--project",
      project,
      "--filesOnly",
      `--json=${json}`,
      ...filters,
    ],
    { stdio: "inherit" },
  );
  const rows = JSON.parse(readFileSync(json, "utf8"));
  const files = new Set();
  for (const { file, projectName } of rows) {
    if (
      projectName !== project ||
      !isAbsolute(file) ||
      /[\r\n]/.test(file) ||
      files.has(file)
    ) {
      throw new Error(
        `Unexpected or duplicate ${name} file: ${projectName}: ${file}`,
      );
    }
    files.add(file);
  }
  return files;
}

function writePartition(name, expected) {
  // Re-list each executed selection: Vitest CLI filters are substring matches.
  const actual = discover(name, expected);
  if (
    actual.size !== expected.length ||
    expected.some((file) => !actual.has(file))
  ) {
    throw new Error(`${project} discovery differs from the ${name} partition`);
  }
  writeFileSync(join(artifacts, `${name}.txt`), `${expected.join("\n")}\n`);
}

const reused = discover(`${browser}-all`);
if (!reused.delete(clipboard)) {
  throw new Error(`Missing clipboard ${project} file: ${clipboard}`);
}
if (reused.size < 2) {
  throw new Error(`Need at least two ${project} files for parallel reuse`);
}
writePartition(
  `${browser}-reuse`,
  [...reused].sort((a, b) => a.localeCompare(b)),
);
writePartition(`${browser}-clipboard`, [clipboard]);
console.log(`${project}: ${reused.size} reused + 1 clipboard file`);
