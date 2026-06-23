#!/usr/bin/env bash
# Run the blocknote-e2e image with live source.
#
# The image installs deps but builds nothing (see tests/Dockerfile); the suite
# resolves every @blocknote/* package to its src/ (see vite.config.browser.ts).
# So we bind-mount each packages/*/src over the image's (source-less) tree. Only
# the src/ dirs are mounted — never a whole package dir — so the image's Linux
# node_modules (pnpm's isolated symlinks live alongside src/) stay intact.
# Editing packages/*/src is therefore picked up on the next run with no rebuild.
# Example apps are baked into the image and transpiled from source at test time.
#
# Usage: tests/docker-run.sh [docker run flags...] -- [vitest/vp args...]
#
# `set -u` is intentionally omitted: macOS bash 3.2 errors on empty-array
# expansion under it, and both the flag and entrypoint-arg arrays may be empty.
set -eo pipefail

cd "$(git rev-parse --show-toplevel)"

docker_flags=()
while [ "$#" -gt 0 ] && [ "$1" != "--" ]; do
  docker_flags+=("$1")
  shift
done
# Drop the "--" separator; the rest are entrypoint (vp test) args.
[ "$#" -gt 0 ] && shift
entrypoint_args=("$@")

# Auto-rebuild the image if its content hash label doesn't match the current
# repo state. The hash covers every file that affects the installed deps or the
# baked-in examples (lockfile, workspace file, all package.json files, patches,
# and example sources). When the hashes differ the image is rebuilt in place
# (Docker's layer cache makes this fast when only a leaf changed).
_dep_files() {
  # Print the sorted list of files that are baked into the image.
  {
    echo pnpm-lock.yaml
    echo pnpm-workspace.yaml
    find patches examples \( -name node_modules -prune \) -o -type f -print 2>/dev/null
    find . -name package.json \
      -not -path '*/node_modules/*' \
      -not -path '*/.git/*' \
      -not -path '*/dist/*'
  } | sort -u
}
_content_hash() {
  # sha256 of the concatenated sorted file contents; shasum is available on
  # macOS & Linux (util-linux / coreutils).
  _dep_files | xargs shasum -a 256 -- 2>/dev/null | shasum -a 256 | cut -d' ' -f1
}

current_hash=$(_content_hash)
image_hash=$(docker inspect --format '{{index .Config.Labels "blocknote.deps-hash"}}' blocknote-e2e 2>/dev/null || true)

if [ "$current_hash" != "$image_hash" ]; then
  echo "blocknote-e2e image is out of date (deps/examples changed) — rebuilding…" >&2
  docker build -t blocknote-e2e \
    --label "blocknote.deps-hash=$current_hash" \
    -f tests/Dockerfile .
fi

mounts=()
for src in packages/*/src; do
  mounts+=(-v "$PWD/$src:/work/$src")
done
# The test files and browser config (callers iterate on these too).
mounts+=(
  -v "$PWD/tests/src:/work/tests/src"
  -v "$PWD/tests/vite.config.browser.ts:/work/tests/vite.config.browser.ts"
  -v "$PWD/tests/vitestSetup.browser.ts:/work/tests/vitestSetup.browser.ts"
)
# Mount the report dir so the html reporter's output lands on the host instead
# of being thrown away with the container. Created on the host first so docker
# binds the dir (not an anonymous mountpoint).
mkdir -p "$PWD/tests/playwright-report"
mounts+=(-v "$PWD/tests/playwright-report:/work/tests/playwright-report")

# --init  : avoid PID-1 special treatment / zombie processes
# --ipc=host : Chromium needs this in Docker to avoid OOM crashes
# Both flags are Playwright's recommended baseline for running its image.
# SKIP_DOCS_POSTINSTALL : the `vp test` entrypoint runs a deps-status check that
#   re-runs `pnpm install` inside the container; without this the docs
#   fumadocs-mdx postinstall runs and fails (see docs/package.json). The e2e
#   suite never touches docs, so skip it here too — mirroring the image build.
exec docker run --rm --init --ipc=host -e SKIP_DOCS_POSTINSTALL=1 \
  "${docker_flags[@]}" "${mounts[@]}" \
  blocknote-e2e "${entrypoint_args[@]}"
