#!/bin/bash
# Packs @blocknote packages as tarballs and installs them so Next.js sees
# real files in node_modules (not symlinks) — required for serverExternalPackages.
#
# Skips pack+install if packages haven't changed since last run.
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TARBALLS_DIR="$SCRIPT_DIR/.tarballs"
# Resolve the repo root (works from git worktrees too).
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
PACKAGES_DIR="$REPO_ROOT/packages"

# Compute a hash of package dist directories + package.json manifests.
HASH_FILE="$TARBALLS_DIR/.packages-hash"
CURRENT_HASH=$( (find "$PACKAGES_DIR/core/dist" "$PACKAGES_DIR/react/dist" "$PACKAGES_DIR/server-util/dist" "$PACKAGES_DIR/mantine/dist" -type f 2>/dev/null | sort | xargs cat 2>/dev/null; cat "$PACKAGES_DIR/core/package.json" "$PACKAGES_DIR/react/package.json" "$PACKAGES_DIR/server-util/package.json" "$PACKAGES_DIR/mantine/package.json" 2>/dev/null) | shasum -a 256 | cut -d' ' -f1)

if [ -f "$HASH_FILE" ] && [ -d "$SCRIPT_DIR/node_modules/@blocknote/core" ] && [ "$(cat "$HASH_FILE")" = "$CURRENT_HASH" ]; then
  echo "Tarballs up to date, skipping pack+install"
  exit 0
fi

rm -rf "$TARBALLS_DIR"
mkdir -p "$TARBALLS_DIR"

# Pack each package
for pkg in core react server-util mantine; do
  cd "$PACKAGES_DIR/$pkg"
  npm pack --pack-destination "$TARBALLS_DIR" 2>/dev/null
done

# Update package.json to point to tarballs
cd "$TARBALLS_DIR"
CORE_TGZ=$(ls blocknote-core-*.tgz)
REACT_TGZ=$(ls blocknote-react-*.tgz)
SERVER_TGZ=$(ls blocknote-server-util-*.tgz)
MANTINE_TGZ=$(ls blocknote-mantine-*.tgz)

cd "$SCRIPT_DIR"
cat > package.json << EOF
{
  "name": "@blocknote/nextjs-test-app",
  "private": true,
  "version": "0.0.0",
  "dependencies": {
    "@blocknote/core": "file:.tarballs/$CORE_TGZ",
    "@blocknote/mantine": "file:.tarballs/$MANTINE_TGZ",
    "@blocknote/react": "file:.tarballs/$REACT_TGZ",
    "@blocknote/server-util": "file:.tarballs/$SERVER_TGZ",
    "@mantine/core": "^8.3.11",
    "@mantine/hooks": "^8.3.11",
    "next": "^16.0.0",
    "react": "^19.2.3",
    "react-dom": "^19.2.3"
  }
}
EOF

# Install with npm (not pnpm — avoid workspace resolution)
rm -rf node_modules .next package-lock.json
npm install

# Save hash for next run
echo "$CURRENT_HASH" > "$HASH_FILE"
