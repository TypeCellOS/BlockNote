import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect } from "vite-plus/test";

const runner = fileURLToPath(
  new URL("../../../docker-full-run.sh", import.meta.url),
);
const partition = fileURLToPath(
  new URL("../../../docker-browser-partition.mjs", import.meta.url),
);
const base = ["test", "-c", "vite.config.browser.ts"];

function runWithFakeVitest(
  onTestFinished: (cleanup: () => void) => void,
  parallelReuse: string,
  source: (cwd: string) => string,
) {
  const cwd = realpathSync(
    mkdtempSync(join(tmpdir(), "blocknote-docker-run-")),
  );
  onTestFinished(() => rmSync(cwd, { recursive: true }));
  mkdirSync(join(cwd, "node_modules", ".bin"), { recursive: true });
  mkdirSync(join(cwd, "playwright-report"));
  symlinkSync(partition, join(cwd, "docker-browser-partition.mjs"));
  writeFileSync(
    join(cwd, "node_modules", ".bin", "vp"),
    `#!/usr/bin/env node
const { appendFileSync, existsSync, readFileSync, writeFileSync } = require("node:fs");
const args = process.argv.slice(2);
const index = existsSync("calls") ? readFileSync("calls", "utf8").trim().split("\\n").length : 0;
appendFileSync("calls", JSON.stringify(args) + "\\n");
${source(cwd)}
`,
    { mode: 0o755 },
  );
  const result = spawnSync("bash", [runner], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, BLOCKNOTE_E2E_PARALLEL_REUSE: parallelReuse },
  });
  const calls = readFileSync(join(cwd, "calls"), "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as string[]);
  return { result, calls };
}

it.for([
  { name: "succeeds when all phases pass", statuses: [0, 0, 0, 0], exit: 0 },
  {
    name: "runs the tail and merges after a failed prefix",
    statuses: [0, 1, 0, 0],
    exit: 1,
  },
  {
    name: "preserves the first failure when merge also fails",
    statuses: [0, 1, 0, 2],
    exit: 1,
  },
  {
    name: "reports a failed merge after passing tests",
    statuses: [0, 0, 0, 2],
    exit: 2,
  },
])("$name", ({ statuses, exit }, { onTestFinished }) => {
  const { result, calls } = runWithFakeVitest(
    onTestFinished,
    "0",
    () => `process.exit(${JSON.stringify(statuses)}[index] ?? 99);`,
  );
  expect(result.stderr).toBe("");
  expect(result.status).toBe(exit);
  expect(calls).toHaveLength(4);
  const attachments = calls[0].find((arg) =>
    arg.startsWith("--attachmentsDir="),
  );
  expect(attachments).toMatch(
    /^--attachmentsDir=playwright-report\/batches\..+\/attachments$/,
  );
  const artifacts = attachments?.slice(
    "--attachmentsDir=".length,
    -"/attachments".length,
  );
  expect(calls).toEqual([
    ...[
      ["other-projects", "--project", "!e2e (webkit)"],
      ["webkit-1", "--project", "e2e (webkit)", "--shard=1/2"],
      ["webkit-2", "--project", "e2e (webkit)", "--shard=2/2"],
    ].map(([name, ...selector]) => [
      ...base,
      "--run",
      "--update=none",
      "--reporter=default",
      "--reporter=blob",
      `--outputFile.blob=${artifacts}/blobs/${name}.json`,
      attachments,
      ...selector,
    ]),
    [...base, `--mergeReports=${artifacts}/blobs`, attachments],
  ]);
});

const parallelScenarios = [
  "exact",
  "first batch failure",
  "interrupted reuse",
  "missing native file",
  "overlapping filter",
  "duplicate file",
  "only one reused file",
] as const;

it.for(parallelScenarios)(
  "parallel reuse: %s",
  { timeout: 15_000 },
  (scenario, { onTestFinished }) => {
    let clipboard = "";
    let reused: string[] = [];
    const { result, calls } = runWithFakeVitest(onTestFinished, "1", (cwd) => {
      clipboard = resolve(
        cwd,
        "src/end-to-end/copypaste/nativeClipboard.test.tsx",
      );
      reused = ["a.browser.test.ts", "b.browser.test.ts"].map((file) =>
        resolve(cwd, "src", file),
      );
      const files = [...reused].reverse();
      if (scenario !== "missing native file") {
        files.push(clipboard);
      }
      if (scenario === "duplicate file") {
        files.push(reused[0]);
      }
      if (scenario === "only one reused file") {
        files.shift();
      }
      return `
if (args[1] === "list") {
  const files = ${JSON.stringify(files)};
  const projectName = args[args.indexOf("--project") + 1];
  const output = args.find(arg => arg.startsWith("--json="));
  const filters = args.slice(args.indexOf(output) + 1);
  const found = filters.length ? files.filter(file => filters.some(filter => file.includes(filter))) : files;
  if (${scenario === "overlapping filter"} && output.endsWith("/webkit-reuse.json"))
    found.push(${JSON.stringify(clipboard)});
  writeFileSync(output.slice(7), JSON.stringify(found.map(file => ({ file, projectName }))));
}
if (${scenario === "first batch failure"}) {
  if (args.some(arg => arg.endsWith("/blobs/chromium-reuse.json"))) process.exit(1);
  if (args.some(arg => arg.startsWith("--mergeReports="))) process.exit(2);
}
if (${scenario === "interrupted reuse"} && args.some(arg => arg.endsWith("/blobs/chromium-reuse.json")))
  process.exit(143);
`;
    });
    const discovery = ["chromium", "webkit", "firefox"].flatMap((engine) =>
      Array.from({ length: 3 }, () => `e2e (${engine})`),
    );
    if (scenario === "interrupted reuse") {
      expect(result.status).toBe(143);
      expect(calls).toHaveLength(discovery.length + 2);
      expect(calls.at(-1)).toContain("e2e (chromium)");
      return;
    }
    if (scenario !== "exact" && scenario !== "first batch failure") {
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(
        {
          "missing native file": "Missing clipboard e2e (chromium) file",
          "overlapping filter": "e2e (webkit) discovery differs",
          "duplicate file": "Unexpected or duplicate chromium-all file",
          "only one reused file": "Need at least two e2e (chromium) files",
        }[scenario],
      );
      expect(calls.every((args) => args[1] === "list")).toBe(true);
      return;
    }

    expect(result.stderr).toBe("");
    expect(result.status).toBe(scenario === "first batch failure" ? 1 : 0);
    expect(
      calls.slice(0, discovery.length).map((args) => args.slice(0, 7)),
    ).toEqual(
      discovery.map((project) => [
        "test",
        "list",
        "-c",
        "vite.config.browser.ts",
        "--project",
        project,
        "--filesOnly",
      ]),
    );
    const attachments = calls[discovery.length].find((arg) =>
      arg.startsWith("--attachmentsDir="),
    );
    const artifacts = attachments?.slice(
      "--attachmentsDir=".length,
      -"/attachments".length,
    );
    const serial = ["--no-isolate", "--no-file-parallelism", "--maxWorkers=1"];
    const batches = [
      [
        "other-projects",
        "--project",
        "!e2e (webkit)",
        "--project",
        "!e2e (firefox)",
        "--project",
        "!e2e (chromium)",
        ...serial,
      ],
      ...["chromium", "firefox", "webkit"].flatMap((engine) => [
        [
          `${engine}-reuse`,
          "--project",
          `e2e (${engine})`,
          "--no-isolate",
          "--file-parallelism",
          "--maxWorkers=2",
          ...reused,
        ],
        [
          `${engine}-clipboard`,
          "--project",
          `e2e (${engine})`,
          ...serial,
          clipboard,
        ],
      ]),
    ];
    expect(calls.slice(discovery.length)).toEqual([
      ...batches.map(([name, ...selector]) => [
        ...base,
        "--run",
        "--update=none",
        "--reporter=default",
        "--reporter=blob",
        `--outputFile.blob=${artifacts}/blobs/${name}.json`,
        attachments,
        "--reporter=json",
        `--outputFile.json=${artifacts}/results/${name}.json`,
        "--retry=0",
        ...selector,
      ]),
      [...base, `--mergeReports=${artifacts}/blobs`, attachments],
    ]);
  },
);

it.for(["", "true", "2"])(
  "rejects invalid parallel reuse value %j before any batch",
  (value) => {
    const result = spawnSync("bash", [runner], {
      encoding: "utf8",
      env: { ...process.env, BLOCKNOTE_E2E_PARALLEL_REUSE: value },
    });
    expect(result.status).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("BLOCKNOTE_E2E_PARALLEL_REUSE must be 0 or 1\n");
  },
);
