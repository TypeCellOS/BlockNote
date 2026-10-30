#!/bin/bash
# Packs and installs into a fresh consumer directory outside the checkout.
# Usage: bash setup.sh /absolute/path/to/empty-consumer-directory
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# Resolve the repo root (works from git worktrees too).
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
PACKAGES_DIR="$REPO_ROOT/packages"
CONSUMER_DIR="$(cd "${1:?Pass an empty consumer directory outside the checkout}" && pwd -P)"
case "$CONSUMER_DIR/" in
  "$REPO_ROOT/"*) echo "Consumer must be outside the checkout" >&2; exit 1 ;;
esac
if [ -n "$(ls -A "$CONSUMER_DIR")" ]; then
  echo "Consumer directory must be empty" >&2
  exit 1
fi

# No setup cache: every run uses the current sources, manifests and tarballs.
cp -R "$SCRIPT_DIR/app" "$SCRIPT_DIR/next.config.ts" "$SCRIPT_DIR/tsconfig.json" "$SCRIPT_DIR/package.json" "$CONSUMER_DIR/"
TARBALLS_DIR="$CONSUMER_DIR/.tarballs"
mkdir "$TARBALLS_DIR"

# Pack each package (use pnpm pack so workspace:* refs are resolved to versions)
for pkg in core react server-util mantine; do
  cd "$PACKAGES_DIR/$pkg"
  pnpm pack --pack-destination "$TARBALLS_DIR" 2>/dev/null
done

# Fixed names, so that package.json does not change with the version
cd "$TARBALLS_DIR"
for pkg in core react server-util mantine; do
  mv blocknote-$pkg-*.tgz blocknote-$pkg.tgz
done

cd "$CONSUMER_DIR"
# Install independently of the workspace, with real package directories for
# Next.js serverExternalPackages rather than pnpm's default symlink layout.
# Direct fixture dependencies are pinned. Transitives still resolve fresh:
# tarball integrity changes with every package build, so no frozen lockfile.
pnpm --ignore-workspace install --node-linker=hoisted --lockfile=false --ignore-scripts
