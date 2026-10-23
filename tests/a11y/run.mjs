// Browser checks run in Docker; --screen-reader runs natively on macOS/Windows.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const args = process.argv.slice(2);
const native = args[0] === "--screen-reader";
if (native) {
  args.shift();
}
let result;
if (native) {
  const reader = { darwin: "voiceover", win32: "nvda" }[process.platform];
  if (!reader) {
    throw new Error("Screen reader tests require macOS or Windows.");
  }
  result = spawnSync(
    process.execPath,
    [
      fileURLToPath(
        new URL("../node_modules/vite-plus/bin/vp", import.meta.url),
      ),
      "test",
      "--config",
      "a11y/vite.config.ts",
      "--run",
      ...args,
    ],
    {
      cwd: fileURLToPath(new URL("..", import.meta.url)),
      env: { ...process.env, BLOCKNOTE_SCREEN_READER: reader },
      stdio: "inherit",
    },
  );
} else {
  mkdirSync(`${root}tests/test-results`, { recursive: true });
  result = spawnSync(
    "bash",
    [
      "tests/docker-run.sh",
      "-e",
      "CI=1",
      "-v",
      `${root}tests/a11y:/work/tests/a11y`,
      "-v",
      `${root}tests/test-results:/work/tests/test-results`,
      "--entrypoint",
      "/work/tests/node_modules/.bin/vp",
      "--",
      "test",
      "--config",
      "a11y/vite.config.ts",
      "--run",
      ...args,
    ],
    { cwd: root, stdio: "inherit" },
  );
}
if (result.error) {
  throw result.error;
}
process.exit(result.status ?? 1);
