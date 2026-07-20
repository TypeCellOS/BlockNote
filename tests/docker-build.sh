#!/usr/bin/env bash
# Build the blocknote-e2e Docker image and stamp it with a content hash label
# so docker-run.sh can detect when a rebuild is needed.
#
# Usage: tests/docker-build.sh [extra docker build flags...]
#   e.g. tests/docker-build.sh --no-cache
set -eo pipefail

cd "$(git rev-parse --show-toplevel)"

_dep_files() {
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

hash=$(_dep_files | xargs shasum -a 256 -- 2>/dev/null | shasum -a 256 | cut -d' ' -f1)

docker build -t blocknote-e2e \
  --label "blocknote.deps-hash=$hash" \
  -f tests/Dockerfile \
  "$@" \
  .
