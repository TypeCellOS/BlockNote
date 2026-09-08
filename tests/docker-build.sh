#!/usr/bin/env bash
# Build the blocknote-e2e Docker image and stamp it with a content hash label
# so docker-run.sh can detect when a rebuild is needed.
#
# Usage: tests/docker-build.sh [extra docker build flags...]
#   e.g. tests/docker-build.sh --no-cache
set -eo pipefail

cd "$(git rev-parse --show-toplevel)"

source tests/docker-image-inputs.sh
hash=$(_docker_image_hash)

docker build -t blocknote-e2e \
  --label "blocknote.deps-hash=$hash" \
  -f tests/Dockerfile \
  "$@" \
  .
