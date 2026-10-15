#!/usr/bin/env bash
# Run from the repository root: bash tests/a11y/benchmark-placeholders.sh
set -eo pipefail
cd "$(git rev-parse --show-toplevel)"
bash tests/docker-run.sh -e CI=1 \
  -v "$PWD/tests/a11y:/work/tests/a11y" \
  --entrypoint /work/tests/node_modules/.bin/vp -- \
  test --config a11y/vite.placeholder-benchmark.config.ts --run
