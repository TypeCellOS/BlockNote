#!/usr/bin/env node

// Extracts the changelog section for a given version from CHANGELOG.md and
// writes it to an output file (for use as a GitHub Release body).
//
// Usage:
//   node scripts/extract-changelog.mjs <version> [outFile]
//
// <version> may be given with or without a leading "v" (e.g. "v0.52.0" or
// "0.52.0"). If the section can't be found, a "Release <version>" fallback is
// written instead. Defaults outFile to /tmp/release-body.md.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const CHANGELOG = join(ROOT, "CHANGELOG.md");

const rawVersion = process.argv[2];
const outFile = process.argv[3] || "/tmp/release-body.md";

if (!rawVersion) {
  console.error(
    "Usage: node scripts/extract-changelog.mjs <version> [outFile]",
  );
  process.exit(1);
}

const version = rawVersion.replace(/^v/, "");

// Split the changelog into "## " sections and find the one whose heading
// starts with the target version. Matching on the heading tokens avoids
// fragile regex escaping and works whether or not a "(date)" suffix is present.
function extractSection(changelog, version) {
  const lines = changelog.split("\n");
  const headingIndexes = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) {
      headingIndexes.push(i);
    }
  }

  for (let h = 0; h < headingIndexes.length; h++) {
    const start = headingIndexes[h];
    const heading = lines[start].slice(3).trim(); // drop "## "
    const headingVersion = heading.split(/\s+/)[0]; // token before any "(date)"
    if (headingVersion === version) {
      const end =
        h + 1 < headingIndexes.length ? headingIndexes[h + 1] : lines.length;
      return lines.slice(start, end).join("\n").trim();
    }
  }
  return null;
}

const changelog = readFileSync(CHANGELOG, "utf8");
const section = extractSection(changelog, version);

if (section) {
  writeFileSync(outFile, section + "\n");
  console.error(`Wrote changelog for ${version} to ${outFile}`);
} else {
  writeFileSync(outFile, `Release ${version}\n`);
  console.error(
    `No changelog section found for ${version}; wrote fallback to ${outFile}`,
  );
}
