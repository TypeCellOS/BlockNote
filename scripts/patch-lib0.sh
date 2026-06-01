#!/usr/bin/env bash
#
# Regenerates the pnpm patch for lib0 from a local build.
#
# Usage:
#   ./scripts/patch-lib0.sh [path-to-lib0]
#
# Defaults to ../lib0 relative to this repo root.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BLOCKNOTE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOCAL_LIB0="${1:-$(cd "$BLOCKNOTE_ROOT/../lib0" && pwd)}"

if [[ ! -d "$LOCAL_LIB0/src" ]]; then
  echo "ERROR: Cannot find lib0 at $LOCAL_LIB0"
  echo "Pass the path as an argument: $0 /path/to/lib0"
  exit 1
fi

echo "==> Using local lib0 at: $LOCAL_LIB0"
echo "==> BlockNote root: $BLOCKNOTE_ROOT"

# 0. Build lib0 so dist/ is up to date
echo "==> Building lib0 (npm run dist) ..."
(cd "$LOCAL_LIB0" && npm run dist)

PATCH_DIR="$BLOCKNOTE_ROOT/node_modules/.pnpm_patches/lib0@1.0.0-rc.13"

# 1. Clean up any leftover patch dir, then start fresh
if [[ -d "$PATCH_DIR" ]]; then
  echo "==> Cleaning up old patch dir ..."
  rm -rf "$PATCH_DIR"
fi

echo "==> Running pnpm patch lib0@1.0.0-rc.13 ..."
cd "$BLOCKNOTE_ROOT"
pnpm patch lib0@1.0.0-rc.13

echo "==> Patch temp dir: $PATCH_DIR"

# 2. Replace src/ with local build
echo "==> Replacing src/ ..."
rm -rf "$PATCH_DIR/src"
cp -R "$LOCAL_LIB0/src" "$PATCH_DIR/src"

# 3. Replace dist/ with local build (.d.ts files)
echo "==> Replacing dist/ ..."
rm -rf "$PATCH_DIR/dist"
cp -R "$LOCAL_LIB0/dist" "$PATCH_DIR/dist"

# 4. Update package.json in the patch dir
echo "==> Updating package.json ..."
node -e "
const fs = require('fs');
const orig = JSON.parse(fs.readFileSync('$PATCH_DIR/package.json', 'utf8'));
const local = JSON.parse(fs.readFileSync('$LOCAL_LIB0/package.json', 'utf8'));

// Keep the original version so pnpm doesn't try to fetch a different version from registry
orig.version = '1.0.0-rc.13';

// Update exports
orig.exports = local.exports;

// Update files list
orig.files = local.files;

// Update type/sideEffects if present
if (local.type) orig.type = local.type;
if ('sideEffects' in local) orig.sideEffects = local.sideEffects;

// Update bin if present
if (local.bin) orig.bin = local.bin;

fs.writeFileSync('$PATCH_DIR/package.json', JSON.stringify(orig, null, 2) + '\n');
console.log('   package.json updated');
"

# 5. Commit the patch
echo ""
echo "==> Running pnpm patch-commit ..."
pnpm patch-commit "$PATCH_DIR"

echo ""
echo "==> Done! Patch regenerated at patches/lib0@1.0.0-rc.13.patch"
