#!/usr/bin/env node

import { execSync, spawnSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const CORE_PKG = join(ROOT, "packages/core/package.json");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function run(cmd, opts = {}) {
  return execSync(cmd, { cwd: ROOT, encoding: "utf8", ...opts }).trim();
}

function runInherit(cmd) {
  const result = spawnSync("sh", ["-c", cmd], {
    cwd: ROOT,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`Command failed with exit code ${result.status}: ${cmd}`);
  }
}

function currentVersion() {
  return JSON.parse(readFileSync(CORE_PKG, "utf8")).version;
}

function packageJsonPaths() {
  const dirs = readdirSync(join(ROOT, "packages"), { withFileTypes: true });
  return dirs
    .filter((d) => d.isDirectory())
    .map((d) => `packages/${d.name}/package.json`);
}

async function confirm(rl, message) {
  const answer = await rl.question(`${message} (y/n) `);
  return answer.trim().toLowerCase() === "y";
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    // -----------------------------------------------------------------------
    // 1. Precondition checks
    // -----------------------------------------------------------------------
    console.log("\n🔍 Checking preconditions...\n");

    const status = run("git status --porcelain");
    if (status) {
      console.error(
        "❌ Working tree is not clean. Commit or stash changes first.",
      );
      process.exit(1);
    }

    const branch = run("git rev-parse --abbrev-ref HEAD");
    if (branch !== "main") {
      console.error(`❌ Must be on main branch (currently on ${branch}).`);
      process.exit(1);
    }

    run("git fetch origin main");
    const behind = run("git rev-list HEAD..origin/main --count");
    if (behind !== "0") {
      console.error(
        `❌ Local main is ${behind} commit(s) behind origin/main. Pull first.`,
      );
      process.exit(1);
    }

    const versionBefore = currentVersion();
    console.log(`Current version: ${versionBefore}\n`);

    // -----------------------------------------------------------------------
    // 2. Version selection + bump (bumpp)
    // -----------------------------------------------------------------------
    console.log("📦 Select new version...\n");

    const pkgFiles = packageJsonPaths();
    const bumppFiles = ["package.json", ...pkgFiles].join(" ");
    runInherit(`npx bumpp --no-commit --no-tag --no-push ${bumppFiles}`);

    const newVersion = currentVersion();
    if (newVersion === versionBefore) {
      console.log("\nVersion unchanged, aborting.");
      process.exit(0);
    }

    console.log(`\nVersion bumped: ${versionBefore} → ${newVersion}`);

    // -----------------------------------------------------------------------
    // 3. Sync lockfile
    // -----------------------------------------------------------------------
    console.log("\n📎 Syncing lockfile...\n");
    runInherit("pnpm install --lockfile-only");

    // -----------------------------------------------------------------------
    // 4. Smoke test build
    // -----------------------------------------------------------------------
    console.log("\n🔨 Running smoke test build...\n");
    try {
      runInherit("vp run -r build");
    } catch {
      console.error("\n❌ Build failed. Reverting version bumps...");
      run("git checkout -- .");
      console.error("Reverted. Fix the build and try again.");
      process.exit(1);
    }

    // -----------------------------------------------------------------------
    // 5. Generate changelog (changelogen)
    // -----------------------------------------------------------------------
    console.log("\n📝 Generating changelog...\n");
    let changelogRaw = run("npx changelogen");

    // Strip the changelogen header line (e.g., "## v0.51.4...feat/branch")
    // and the compare-changes link, keeping only the content sections
    changelogRaw = changelogRaw
      .replace(/^## [^\n]+\n+/, "")
      .replace(/\[compare changes\]\([^)]+\)\n*/g, "")
      .replace("### ❤️ Contributors", "### ❤️ Thank You")
      .trim();

    const date = new Date().toISOString().split("T")[0];
    const header = `## ${newVersion} (${date})`;

    const existingChangelog = readFileSync(join(ROOT, "CHANGELOG.md"), "utf8");
    const newChangelog = `${header}\n\n${changelogRaw}\n\n${existingChangelog}`;
    writeFileSync(join(ROOT, "CHANGELOG.md"), newChangelog);

    // -----------------------------------------------------------------------
    // 6. Open editor for review
    // -----------------------------------------------------------------------
    let changelogApproved = false;
    while (!changelogApproved) {
      console.log("\n✏️  Opening CHANGELOG.md for review...\n");
      const editor = process.env.VISUAL || process.env.EDITOR || "vi";
      spawnSync(editor, [join(ROOT, "CHANGELOG.md")], { stdio: "inherit" });

      changelogApproved = await confirm(rl, "Changelog looks good?");
      if (!changelogApproved) {
        console.log("Re-opening editor...");
      }
    }

    // -----------------------------------------------------------------------
    // 7. Commit & tag
    // -----------------------------------------------------------------------
    console.log("\n📌 Committing and tagging...\n");

    const filesToStage = [
      "package.json",
      ...pkgFiles,
      "pnpm-lock.yaml",
      "CHANGELOG.md",
    ];
    run(`git add ${filesToStage.join(" ")}`);
    run(`git commit -m "chore(release): v${newVersion}"`);
    run(`git tag -a v${newVersion} -m "v${newVersion}"`);

    console.log(`Created commit and tag v${newVersion}`);

    // -----------------------------------------------------------------------
    // 8. Push
    // -----------------------------------------------------------------------
    const shouldPush = await confirm(rl, "\nPush commit and tag to origin?");

    if (shouldPush) {
      runInherit("git push --follow-tags");
      console.log(`\n✅ Tag v${newVersion} pushed. CI will publish to npm.`);
    } else {
      console.log(`\n⏸️  Not pushed. When ready, run: git push --follow-tags`);
    }

    // -----------------------------------------------------------------------
    // 9. Summary
    // -----------------------------------------------------------------------
    console.log(`
Release v${newVersion} prepared.
  Tag:       v${newVersion}
  Changelog: CHANGELOG.md updated
  CI:        Publish workflow triggers on tag push
`);
  } catch (err) {
    console.error("\n❌ Release failed:", err.message);

    const v = currentVersion();
    console.error(`
To recover:
  git reset HEAD~1 2>/dev/null
  git tag -d v${v} 2>/dev/null
  git checkout -- .
`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
