import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { FlateErrorCode, unzipSync } from "fflate";

export const packageDir = dirname(dirname(fileURLToPath(import.meta.url)));
export const outputFiles = [
  "blocknote_typst_wasm.js",
  "blocknote_typst_wasm.d.ts",
  "blocknote_typst_wasm_bg.wasm",
  "blocknote_typst_wasm_bg.wasm.d.ts",
];
const metadataFiles = [".build-hash", ".build-manifest.json"];
const cacheFiles = [...outputFiles, ...metadataFiles];
const repository = "TypeCellOS/BlockNote";
const maxBytes = 64 * 1024 * 1024;

function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

export function inputHash(root = packageDir) {
  const files = [
    "rust/Cargo.toml",
    "rust/Cargo.lock",
    "rust/rust-toolchain.toml",
    "scripts/ensure-wasm.mjs",
    "scripts/wasm-cache.mjs",
  ];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(path);
      } else {
        files.push(relative(root, path).split("\\").join("/"));
      }
    }
  }
  walk(join(root, "rust/src"));
  const version = JSON.parse(
    readFileSync(join(root, "node_modules/wasm-pack/package.json"), "utf8"),
  ).version;
  return sha256(
    JSON.stringify([
      "typst-wasm-v2",
      version,
      ...files
        .sort()
        .map((file) => [file, sha256(readFileSync(join(root, file)))]),
    ]),
  );
}

export function artifactName(hash) {
  return `typst-wasm-v2-${hash}`;
}

export function cacheRoot() {
  return (
    process.env.BLOCKNOTE_TYPST_CACHE_DIR ||
    join(
      process.env.XDG_CACHE_HOME || join(homedir(), ".cache"),
      "blocknote",
      "typst-wasm-v2",
    )
  );
}

export function writeManifest(dir, hash) {
  const files = Object.fromEntries(
    outputFiles.map((file) => [file, sha256(readFileSync(join(dir, file)))]),
  );
  writeFileSync(join(dir, ".build-hash"), hash);
  writeFileSync(
    join(dir, ".build-manifest.json"),
    JSON.stringify({ hash, files }),
  );
}

function parseJson(text) {
  try {
    return { value: JSON.parse(text) };
  } catch (error) {
    if (!(error instanceof SyntaxError)) {
      throw error;
    }
    return { error: "invalid JSON" };
  }
}

export function validateOutput(dir, hash) {
  if (
    !cacheFiles.every((file) => {
      const path = join(dir, file);
      return existsSync(path) && lstatSync(path).isFile();
    })
  ) {
    return false;
  }
  const parsed = parseJson(
    readFileSync(join(dir, ".build-manifest.json"), "utf8"),
  );
  const manifest = parsed.value;
  return (
    !parsed.error &&
    manifest?.hash === hash &&
    readFileSync(join(dir, ".build-hash"), "utf8") === hash &&
    outputFiles.every(
      (file) =>
        manifest.files?.[file] === sha256(readFileSync(join(dir, file))),
    )
  );
}

// Copy completely before publishing, and clean up even if copying fails.
function withStagedOutput(source, parent, publish) {
  mkdirSync(parent, { recursive: true });
  const stage = mkdtempSync(join(parent, ".typst-stage-"));
  try {
    for (const file of cacheFiles) {
      copyFileSync(join(source, file), join(stage, file));
    }
    publish(stage);
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
}

// Call under the per-package build lock. Never merge an incomplete download
// into the live package.
export function installOutput(source, destination) {
  withStagedOutput(source, dirname(destination), (stage) => {
    rmSync(destination, { recursive: true, force: true });
    renameSync(stage, destination);
  });
}

export function storeOutput(source, hash, root = cacheRoot()) {
  const destination = join(root, hash);
  if (validateOutput(destination, hash)) {
    return;
  }
  withStagedOutput(source, root, (stage) => {
    // Atomic publication; another worktree may publish this same key first.
    if (existsSync(destination)) {
      // Leave invalid entries alone: readers reject them and can still build.
      return;
    }
    try {
      renameSync(stage, destination);
    } catch (error) {
      if (!["EEXIST", "ENOTEMPTY"].includes(error.code)) {
        throw error;
      }
    }
  });
}

function githubToken() {
  if (process.env.GH_TOKEN || process.env.GITHUB_TOKEN) {
    return process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  }
  const result = spawnSync(
    "gh",
    ["auth", "token", "--hostname", "github.com"],
    {
      encoding: "utf8",
      timeout: 5000,
    },
  );
  if (
    result.error &&
    result.error.code !== "ENOENT" &&
    result.error.code !== "ETIMEDOUT"
  ) {
    throw result.error;
  }
  return result.status === 0 ? result.stdout.trim() : undefined;
}

async function request(url, token, fetcher) {
  try {
    const response = await fetcher(url, {
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
          }
        : {},
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
    return { response };
  } catch (error) {
    if (
      !(error instanceof TypeError) &&
      !["TimeoutError", "AbortError"].includes(error.name)
    ) {
      throw error;
    }
    return { error: "GitHub request unavailable" };
  }
}

async function jsonRequest(url, token, fetcher) {
  const result = await request(url, token, fetcher);
  if (result.error) {
    return result;
  }
  if (!result.response.ok) {
    return { error: `GitHub returned HTTP ${result.response.status}` };
  }
  const body = await readBody(result.response);
  return body.error ? body : parseJson(body.bytes.toString("utf8"));
}

async function readBody(response) {
  try {
    const chunks = [];
    let size = 0;
    if (!response.body) {
      return { error: "empty GitHub response" };
    }
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > maxBytes) {
        return { error: "GitHub response exceeds size limit" };
      }
      chunks.push(chunk);
    }
    return { bytes: Buffer.concat(chunks) };
  } catch (error) {
    if (
      !(error instanceof TypeError) &&
      !["TimeoutError", "AbortError"].includes(error.name)
    ) {
      throw error;
    }
    return { error: "GitHub download interrupted" };
  }
}

export function trustedRun(run) {
  return (
    run?.event === "push" &&
    run.head_branch === "main" &&
    run.head_repository?.full_name === repository &&
    run.repository?.full_name === repository &&
    run.path === ".github/workflows/build.yml" &&
    run.status === "completed" &&
    run.conclusion === "success"
  );
}

// Extract individual allowlisted files to buffers, never archive paths. This
// also prevents zip traversal/symlinks from writing outside the staging dir.
function readZip(bytes) {
  const seen = new Set();
  let size = 0;
  let invalid = false;
  try {
    const files = unzipSync(bytes, {
      filter(file) {
        size += file.originalSize;
        if (
          !cacheFiles.includes(file.name) ||
          seen.has(file.name) ||
          !Number.isSafeInteger(file.originalSize) ||
          file.originalSize < 0 ||
          size > maxBytes
        ) {
          invalid = true;
        }
        seen.add(file.name);
        return !invalid;
      },
    });
    return invalid || seen.size !== cacheFiles.length
      ? { error: "unexpected artifact contents or size" }
      : { files };
  } catch (error) {
    if (
      !(error instanceof RangeError) &&
      !Object.values(FlateErrorCode).includes(error.code)
    ) {
      throw error;
    }
    return { error: "invalid artifact archive" };
  }
}

export function unpackArtifact(bytes, dir, hash) {
  const result = readZip(bytes);
  if (result.error) {
    return result;
  }
  for (const file of cacheFiles) {
    writeFileSync(join(dir, file), result.files[file]);
  }
  return validateOutput(dir, hash)
    ? { restored: true }
    : { error: "artifact checksum mismatch" };
}

export async function downloadOutput(
  hash,
  destination,
  { token = githubToken(), fetcher = fetch } = {},
) {
  if (!token) {
    return { error: "no GitHub credentials (use gh auth login or GH_TOKEN)" };
  }
  const deadline = AbortSignal.timeout(30000);
  const fetchRequest = fetcher;
  fetcher = (url, options) =>
    fetchRequest(url, {
      ...options,
      signal: AbortSignal.any([deadline, options.signal]),
    });
  const base = `https://api.github.com/repos/${repository}/actions`;
  const result = await jsonRequest(
    `${base}/artifacts?name=${artifactName(hash)}&per_page=100`,
    token,
    fetcher,
  );
  if (result.error) {
    return result;
  }
  if (!Array.isArray(result.value?.artifacts)) {
    return { error: "invalid GitHub artifact listing" };
  }
  for (const artifact of result.value.artifacts) {
    if (
      artifact?.name !== artifactName(hash) ||
      artifact.expired ||
      !Number.isSafeInteger(artifact.id) ||
      !Number.isSafeInteger(artifact.workflow_run?.id)
    ) {
      continue;
    }
    const run = await jsonRequest(
      `${base}/runs/${artifact.workflow_run.id}`,
      token,
      fetcher,
    );
    if (run.error || !trustedRun(run.value)) {
      continue;
    }
    const archive = await request(
      `${base}/artifacts/${artifact.id}/zip`,
      token,
      fetcher,
    );
    if (archive.error) {
      return archive;
    }
    const location = archive.response.headers.get("location");
    if (
      archive.response.status !== 302 ||
      !location ||
      !URL.canParse(location) ||
      new URL(location).protocol !== "https:"
    ) {
      return { error: "artifact download unavailable" };
    }
    // Signed storage URL: never forward the GitHub token to another host.
    const download = await request(location, undefined, fetcher);
    if (download.error) {
      return download;
    }
    if (!download.response.ok) {
      return { error: "artifact download unavailable" };
    }
    const body = await readBody(download.response);
    if (body.error) {
      return body;
    }
    const temp = mkdtempSync(join(tmpdir(), "blocknote-typst-"));
    try {
      const output = join(temp, "output");
      mkdirSync(output);
      const unpacked = unpackArtifact(body.bytes, output, hash);
      if (unpacked.error) {
        return unpacked;
      }
      installOutput(output, destination);
      return { restored: true };
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  }
  return { error: "no matching artifact from a successful main build" };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(inputHash());
}
