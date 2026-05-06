#!/usr/bin/env node
// Repair msw-snapshot files after a request-shape change.
//
// When the request body changes (e.g. a schema change in BlockNote alters the
// HTML/JSON sent to the LLM), the md5 hash that msw-snapshot embeds in each
// cached response filename no longer matches. msw-snapshot then treats the
// snapshot as missing and (because of `updateSnapshots: "missing"`) falls
// through to the real API, which fails in CI without credentials and writes a
// new file at the *correct* new hash containing the failure response (e.g.
// 401).
//
// After that failed run, every affected slot has two files:
//   <test>_<seq>_<old-hash>.json  -- valid 200 response, wrong hash
//   <test>_<seq>_<new-hash>.json  -- right hash, but a 401 body
//
// This script transplants the 200 response into the new-hash file and deletes
// the old-hash file, leaving exactly one file per slot with the right hash
// and the right response.
//
// Usage:
//   pnpm --filter @blocknote/xl-ai test     # populates the new-hash files
//   pnpm --filter @blocknote/xl-ai rename-msw-snapshots
//   pnpm --filter @blocknote/xl-ai test     # all green
import {
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(__dirname, "..");
const SEARCH_ROOT = path.join(PKG_ROOT, "src");

const FILE_RE = /^(.+)_(\d+)_([a-f0-9]+)\.json$/;

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(p);
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      yield p;
    }
  }
}

const filesByDir = new Map();
for (const file of walk(SEARCH_ROOT)) {
  if (!file.includes(`${path.sep}__msw_snapshots__${path.sep}`)) continue;
  const dir = path.dirname(file);
  const list = filesByDir.get(dir) ?? [];
  list.push(path.basename(file));
  filesByDir.set(dir, list);
}

let migrated = 0;
let skipped = 0;
const skipNotes = [];

for (const [dir, files] of filesByDir) {
  const groups = new Map();
  for (const file of files) {
    const match = FILE_RE.exec(file);
    if (!match) continue;
    const slot = `${match[1]}_${match[2]}`;
    const list = groups.get(slot) ?? [];
    list.push(file);
    groups.set(slot, list);
  }

  for (const [slot, group] of groups) {
    if (group.length < 2) continue;

    const entries = group.map((file) => {
      const fp = path.join(dir, file);
      const data = JSON.parse(readFileSync(fp, "utf8"));
      return {
        file,
        path: fp,
        data,
        status: data?.response?.status,
        mtime: statSync(fp).mtimeMs,
      };
    });

    const good = entries.filter((e) => e.status === 200);
    const bad = entries.filter((e) => e.status !== 200);

    if (good.length !== 1 || bad.length === 0) {
      skipped++;
      skipNotes.push(
        `  ${path.relative(PKG_ROOT, dir)}/${slot}: ${good.length} good + ${bad.length} bad`,
      );
      continue;
    }

    // Use the most recently written bad file as the destination — its hash
    // matches the current request body.
    bad.sort((a, b) => b.mtime - a.mtime);
    const target = bad[0];

    target.data.response = good[0].data.response;
    writeFileSync(target.path, JSON.stringify(target.data, null, 2));
    unlinkSync(good[0].path);
    for (const extra of bad.slice(1)) unlinkSync(extra.path);

    migrated++;
    console.log(
      `migrated ${path.relative(PKG_ROOT, dir)}/${slot} -> ${target.file}`,
    );
  }
}

console.log(`\nDone. ${migrated} migrated, ${skipped} skipped.`);
if (skipped > 0) {
  console.log("\nSkipped slots (need manual attention):");
  for (const note of skipNotes) console.log(note);
}
if (migrated === 0 && skipped === 0) {
  console.log(
    "\nNo mismatched snapshot pairs found. If you expected some, run\n" +
      "`pnpm --filter @blocknote/xl-ai test` first to let msw-snapshot record\n" +
      "the new-hash files alongside the existing old-hash ones.",
  );
}
