#!/usr/bin/env bash
#
# Regenerates the pnpm patch for @y/prosemirror from a local build.
#
# Usage:
#   ./scripts/patch-y-prosemirror.sh [path-to-y-prosemirror]
#
# Defaults to ../y-prosemirror relative to this repo root.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BLOCKNOTE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOCAL_YPM="${1:-$(cd "$BLOCKNOTE_ROOT/../y-prosemirror" && pwd)}"

if [[ ! -d "$LOCAL_YPM/src" ]]; then
  echo "ERROR: Cannot find y-prosemirror at $LOCAL_YPM"
  echo "Pass the path as an argument: $0 /path/to/y-prosemirror"
  exit 1
fi

echo "==> Using local y-prosemirror at: $LOCAL_YPM"
echo "==> BlockNote root: $BLOCKNOTE_ROOT"

# 0. Build y-prosemirror so dist/ is up to date
echo "==> Building y-prosemirror (npm run dist) ..."
(cd "$LOCAL_YPM" && npm run dist)

PATCH_DIR="$BLOCKNOTE_ROOT/node_modules/.pnpm_patches/@y/prosemirror@2.0.0-2"

# 1. Clean up any leftover patch dir, then start fresh
if [[ -d "$PATCH_DIR" ]]; then
  echo "==> Cleaning up old patch dir ..."
  rm -rf "$PATCH_DIR"
fi

echo "==> Running pnpm patch @y/prosemirror@2.0.0-2 ..."
cd "$BLOCKNOTE_ROOT"
pnpm patch @y/prosemirror@2.0.0-2

echo "==> Patch temp dir: $PATCH_DIR"

# 2. Replace src/ with local build
echo "==> Replacing src/ ..."
rm -rf "$PATCH_DIR/src"
cp -R "$LOCAL_YPM/src" "$PATCH_DIR/src"

# 3. Replace dist/ with local build (only dist/src/ with .d.ts files)
echo "==> Replacing dist/ ..."
rm -rf "$PATCH_DIR/dist"
mkdir -p "$PATCH_DIR/dist/src"
cp -R "$LOCAL_YPM/dist/src/" "$PATCH_DIR/dist/src/"

# 4. Copy global.d.ts if it exists
if [[ -f "$LOCAL_YPM/global.d.ts" ]]; then
  echo "==> Copying global.d.ts ..."
  cp "$LOCAL_YPM/global.d.ts" "$PATCH_DIR/global.d.ts"
fi

# 5. Update package.json in the patch dir
echo "==> Updating package.json ..."
node -e "
const fs = require('fs');
const orig = JSON.parse(fs.readFileSync('$PATCH_DIR/package.json', 'utf8'));
const local = JSON.parse(fs.readFileSync('$LOCAL_YPM/package.json', 'utf8'));

// Keep the original version so pnpm doesn't try to fetch 2.0.0-3 from registry
orig.version = '2.0.0-2';

// Update exports
orig.exports = local.exports;

// Update dependencies
orig.dependencies = local.dependencies;

// Update peerDependencies
orig.peerDependencies = local.peerDependencies;

// Update files list
orig.files = local.files;

// Update type/sideEffects if present
if (local.type) orig.type = local.type;
if ('sideEffects' in local) orig.sideEffects = local.sideEffects;

fs.writeFileSync('$PATCH_DIR/package.json', JSON.stringify(orig, null, 2) + '\n');
console.log('   package.json updated');
"

# 6. Commit the patch
echo ""
echo "==> Running pnpm patch-commit ..."
pnpm patch-commit "$PATCH_DIR"

echo ""
echo "==> Done! Patch regenerated at patches/@y__prosemirror@2.0.0-2.patch"
