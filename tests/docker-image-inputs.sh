#!/usr/bin/env bash
# Shared image inputs for docker-build.sh and docker-run.sh, called from the
# repo root. Match .dockerignore so generated files cannot invalidate the image.

_docker_image_files() {
  {
    printf '%s\n' pnpm-lock.yaml pnpm-workspace.yaml tests/Dockerfile .dockerignore
    for manifest in package.json packages/*/package.json \
      playground/package.json fumadocs/package.json docs/package.json \
      shared/package.json tests/package.json; do
      if [ -f "$manifest" ]; then
        printf '%s\n' "$manifest"
      fi
    done
    find patches examples \
      \( -type d \( -name node_modules -o -name dist -o -name types \
        -o -name pkg -o -name .next -o -name .vite -o -name .vite-plus \
        -o -name test-results -o -name blob-report -o -name playwright-report \
        -o -name .vitest-attachments -o -path '*/rust/target' \) -prune \) \
      -o \( -type f ! -name '*.tsbuildinfo' ! -name .DS_Store -print \)
  } | LC_ALL=C sort -u
}

_docker_image_hash() {
  # Hash names and contents, so additions, removals and edits all invalidate it.
  _docker_image_files | while IFS= read -r file; do
    printf '%s\0' "$file"
  done | xargs -0 shasum -a 256 -- | shasum -a 256 | cut -d' ' -f1
}
