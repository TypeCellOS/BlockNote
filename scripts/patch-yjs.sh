#!/usr/bin/env bash
#
# Regenerates the pnpm patch for @y/y (yjs) from a local build.
#
# Usage:
#   ./scripts/patch-yjs.sh [path-to-yjs]
#
# Defaults to ../yjs relative to this repo root.

set -euo pipefail

# Version that is actually installed in this repo (pnpm patches the installed
# version). The local ../yjs checkout may be a newer rc; we still pin to this.
YJS_PKG="@y/y"
YJS_VERSION="14.0.0-rc.16"

# pnpm keeps the scope path for the temp patch dir (e.g. .pnpm_patches/@y/y@VER)
# but escapes "/" to "__" for the committed patch file name.
YJS_PATCH_DIR_NAME="$YJS_PKG@$YJS_VERSION"
YJS_PATCH_FILE_NAME="@y__y@$YJS_VERSION.patch"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BLOCKNOTE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOCAL_YJS="${1:-$(cd "$BLOCKNOTE_ROOT/../yjs" && pwd)}"

if [[ ! -d "$LOCAL_YJS/src" ]]; then
  echo "ERROR: Cannot find yjs at $LOCAL_YJS"
  echo "Pass the path as an argument: $0 /path/to/yjs"
  exit 1
fi

echo "==> Using local yjs at: $LOCAL_YJS"
echo "==> BlockNote root: $BLOCKNOTE_ROOT"

# 0. Build yjs so dist/ is up to date
echo "==> Building yjs (npm run dist) ..."
(cd "$LOCAL_YJS" && npm run dist)

# Best-effort cleanup of any leftover patch dir (case-insensitive FS resolves this fine).
STALE_PATCH_DIR="$BLOCKNOTE_ROOT/node_modules/.pnpm_patches/$YJS_PATCH_DIR_NAME"

# 1. Clean up any leftover patch dir, then start fresh
if [[ -d "$STALE_PATCH_DIR" ]]; then
  echo "==> Cleaning up old patch dir ..."
  rm -rf "$STALE_PATCH_DIR"
fi

echo "==> Running pnpm patch $YJS_PKG@$YJS_VERSION ..."
cd "$BLOCKNOTE_ROOT"
# Capture pnpm's reported patch dir so we use the canonical on-disk path casing.
# Constructing PATCH_DIR manually breaks on macOS when the repo is entered via a
# differently-cased path (e.g. blockNote vs BlockNote): pnpm patch-commit matches
# the path against state.json case-sensitively and fails with ERR_PNPM_INVALID_PATCH_DIR.
PATCH_OUTPUT="$(pnpm patch "$YJS_PKG@$YJS_VERSION")"
echo "$PATCH_OUTPUT"
PATCH_DIR="$(printf '%s\n' "$PATCH_OUTPUT" | grep -Eo "/.*/\.pnpm_patches/$YJS_PATCH_DIR_NAME" | head -n1)"

if [[ -z "$PATCH_DIR" || ! -d "$PATCH_DIR" ]]; then
  echo "ERROR: Could not determine patch dir from 'pnpm patch' output"
  exit 1
fi

echo "==> Patch temp dir: $PATCH_DIR"

# 2. Replace src/ with local build
echo "==> Replacing src/ ..."
rm -rf "$PATCH_DIR/src"
cp -R "$LOCAL_YJS/src" "$PATCH_DIR/src"

# 3. Replace dist/ with local build (.d.ts files)
echo "==> Replacing dist/ ..."
rm -rf "$PATCH_DIR/dist"
cp -R "$LOCAL_YJS/dist" "$PATCH_DIR/dist"

# 4. Replace tests/ (testHelper is part of the published exports)
if [[ -d "$LOCAL_YJS/tests" ]]; then
  echo "==> Replacing tests/ ..."
  rm -rf "$PATCH_DIR/tests"
  cp -R "$LOCAL_YJS/tests" "$PATCH_DIR/tests"
fi

# 5. Copy top-level type decls referenced by the package (e.g. global.d.ts)
if [[ -f "$LOCAL_YJS/global.d.ts" ]]; then
  echo "==> Copying global.d.ts ..."
  cp "$LOCAL_YJS/global.d.ts" "$PATCH_DIR/global.d.ts"
fi

# 6. Update package.json in the patch dir
echo "==> Updating package.json ..."
node -e "
const fs = require('fs');
const orig = JSON.parse(fs.readFileSync('$PATCH_DIR/package.json', 'utf8'));
const local = JSON.parse(fs.readFileSync('$LOCAL_YJS/package.json', 'utf8'));

// Keep the original (installed) version so pnpm doesn't try to fetch a
// different version from the registry.
orig.version = '$YJS_VERSION';

// Update exports (this package is exports-based, no main/module)
if (local.exports) orig.exports = local.exports;

// Update files list
if (local.files) orig.files = local.files;

// Update type/sideEffects if present
if (local.type) orig.type = local.type;
if ('sideEffects' in local) orig.sideEffects = local.sideEffects;

// Update bin if present
if (local.bin) orig.bin = local.bin;

fs.writeFileSync('$PATCH_DIR/package.json', JSON.stringify(orig, null, 2) + '\n');
console.log('   package.json updated');
"

# 7. Commit the patch
echo ""
echo "==> Running pnpm patch-commit ..."
pnpm patch-commit "$PATCH_DIR"

echo ""
echo "==> Done! Patch regenerated at patches/$YJS_PATCH_FILE_NAME"
