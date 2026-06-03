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
exec docker run --rm --init --ipc=host "${docker_flags[@]}" "${mounts[@]}" \
  blocknote-e2e "${entrypoint_args[@]}"
