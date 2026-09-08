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

# Use the same inputs as an explicit image build. Package source is mounted
# live; only dependency manifests, patches, examples and build rules invalidate it.
source tests/docker-image-inputs.sh
current_hash=$(_docker_image_hash)
image_hash=$(docker inspect --format '{{index .Config.Labels "blocknote.deps-hash"}}' blocknote-e2e 2>/dev/null || true)

if [ "$current_hash" != "$image_hash" ]; then
  echo "blocknote-e2e image is out of date (deps/examples changed) — rebuilding…" >&2
  bash tests/docker-build.sh
fi

mounts=()
for src in packages/*/src; do
  mounts+=(-v "$PWD/$src:/work/$src")
done
# xl-typst-compiler is consumed through its build outputs (see
# vite.config.browser.ts): the wasm + glue in pkg/ and the built TS wrapper.
# Build them first (build:wasm + build) - they are gitignored, so the image
# cannot contain them.
for out in pkg dist types; do
  if [ ! -d "packages/xl-typst-compiler/$out" ]; then
    echo "packages/xl-typst-compiler/$out is missing - build it first:" >&2
    echo "  pnpm exec vp run --filter @blocknote/xl-typst-compiler build" >&2
    echo "(compiles the Rust wasm too when needed - requires rustup)" >&2
    exit 1
  fi
  mounts+=(-v "$PWD/packages/xl-typst-compiler/$out:/work/packages/xl-typst-compiler/$out")
done
# The test files and browser config (callers iterate on these too).
mounts+=(
  -v "$PWD/tests/src:/work/tests/src"
  -v "$PWD/tests/vite.config.browser.ts:/work/tests/vite.config.browser.ts"
  -v "$PWD/tests/vitestSetup.browser.ts:/work/tests/vitestSetup.browser.ts"
)
# The suggestion-gallery scenarios import the shared `testDocument` (aliased to
# ../shared in vite.config.browser.ts). Only shared/package.json is baked into the
# image (for the install), so mount the two source files it needs — they're
# transpiled at test time just like packages/*/src (mounting individual files
# keeps the image's node_modules symlinks intact).
mounts+=(
  -v "$PWD/shared/testDocument.ts:/work/shared/testDocument.ts"
  -v "$PWD/shared/testDocumentBlocks.ts:/work/shared/testDocumentBlocks.ts"
  -v "$PWD/shared/formatConversionTestUtil.ts:/work/shared/formatConversionTestUtil.ts"
  -v "$PWD/shared/api:/work/shared/api"
  -v "$PWD/shared/util:/work/shared/util"
  -v "$PWD/shared/assets:/work/shared/assets"
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
