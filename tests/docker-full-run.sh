#!/usr/bin/env bash
# Container entrypoint for an unfiltered, snapshot-read-only local browser run.
set -eo pipefail

vitest=(node_modules/.bin/vp test -c vite.config.browser.ts)
chromium="e2e (chromium)"
webkit="e2e (webkit)"
firefox="e2e (firefox)"
parallel_reuse=${BLOCKNOTE_E2E_PARALLEL_REUSE-0}
case "$parallel_reuse" in
  0|1) ;;
  *) echo "BLOCKNOTE_E2E_PARALLEL_REUSE must be 0 or 1" >&2; exit 2 ;;
esac

artifacts=$(mktemp -d playwright-report/batches.XXXXXX)
mkdir -p "$artifacts/blobs" "$artifacts/attachments"
echo "Browser batch artifacts: tests/$artifacts"

serial_reuse=(--no-isolate --no-file-parallelism --maxWorkers=1)
if [ "$parallel_reuse" = 1 ]; then
  for browser in chromium webkit firefox; do
    node ./docker-browser-partition.mjs "$artifacts" "$browser"
  done
  mkdir "$artifacts/results"
fi

status=0

record_failure() {
  if [ "$status" -eq 0 ]; then
    status=$1
  fi
}

record_batch_result() {
  # Stop on interruption, but a test failure must not skip later batches.
  case "$1" in
    130|143) exit "$1" ;;
  esac
  record_failure "$1"
}

run_batch() {
  local name=$1
  shift
  local reuse_options=()
  if [ "$parallel_reuse" = 1 ]; then
    # Keep snapshot counts available alongside the blobs for parity audits.
    # Surface shared-state failures on the first attempt in the reuse runner.
    reuse_options=(--reporter=json --outputFile.json="$artifacts/results/$name.json" --retry=0)
  fi
  if "${vitest[@]}" --run --update=none --reporter=default --reporter=blob \
    --outputFile.blob="$artifacts/blobs/$name.json" \
    --attachmentsDir="$artifacts/attachments" "${reuse_options[@]}" "$@"; then
    return
  else
    record_batch_result "$?"
  fi
}

run_manifest_batch() {
  local name=$1 file
  shift
  local files=()
  while IFS= read -r file; do
    files+=("$file")
  done < "$artifacts/$name.txt"
  run_batch "$name" "$@" "${files[@]}"
}

run_desktop() {
  local browser=$1 project="e2e ($1)"
  run_manifest_batch "$browser-reuse" --project "$project" \
    --no-isolate --file-parallelism --maxWorkers=2
  # Run the native clipboard cases alone because they share the OS clipboard.
  run_manifest_batch "$browser-clipboard" --project "$project" "${serial_reuse[@]}"
}

if [ "$parallel_reuse" = 1 ]; then
  run_batch other-projects --project "!$webkit" --project "!$firefox" \
    --project "!$chromium" "${serial_reuse[@]}"
  for browser in chromium firefox webkit; do
    run_desktop "$browser"
  done
else
  run_batch other-projects --project "!$webkit"
  # Fresh process midway through; retain Vitest's normal sort within each half.
  run_batch webkit-1 --project "$webkit" --shard=1/2
  run_batch webkit-2 --project "$webkit" --shard=2/2
fi

# Keep the config's existing HTML reporter and its output directory. Even
# after a test failure, replay whatever blobs exist and keep their attachments.
"${vitest[@]}" --mergeReports="$artifacts/blobs" \
  --attachmentsDir="$artifacts/attachments" || record_failure "$?"

exit "$status"
