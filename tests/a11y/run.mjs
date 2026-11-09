// Native screen-reader tests require macOS or Windows.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const reader = { darwin: "voiceover", win32: "nvda" }[process.platform];
if (!reader) {
  throw new Error("Screen reader tests require macOS or Windows.");
}
const result = spawnSync(
  process.execPath,
  [
    fileURLToPath(new URL("../node_modules/vite-plus/bin/vp", import.meta.url)),
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
if (result.error) {
  throw result.error;
}
process.exit(result.status ?? 1);
