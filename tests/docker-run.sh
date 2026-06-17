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

# Warn if the image may be stale: check whether any file that affects the
# installed deps (lockfile, patches, or any package.json) is newer than the
# image. Rebuilding is cheap when layers are cached; run `vp run e2e:image`.
if image_date=$(docker inspect --format '{{.Metadata.LastTagTime}}' blocknote-e2e 2>/dev/null); then
  image_epoch=$(date -d "$image_date" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%S" "${image_date%%.*}" +%s 2>/dev/null || echo 0)
  stale_file=""
  for f in pnpm-lock.yaml patches/* $(find . -name package.json -not -path '*/node_modules/*' -not -path '*/.git/*'); do
    [ -f "$f" ] || continue
    file_epoch=$(date -r "$f" +%s 2>/dev/null || echo 0)
    if [ "$file_epoch" -gt "$image_epoch" ]; then
      stale_file="$f"
      break
    fi
  done
  if [ -n "$stale_file" ]; then
    echo "⚠️  blocknote-e2e image may be stale (\"$stale_file\" is newer)." >&2
    echo "   Run \`vp run e2e:image\` to rebuild if you see import resolution errors." >&2
  fi
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
exec docker run --rm --init --ipc=host "${docker_flags[@]}" "${mounts[@]}" \
  blocknote-e2e "${entrypoint_args[@]}"
