# Source from the repository root. Both Docker entry points must use the same
# inputs when writing and checking the blocknote.deps-hash label.
blocknote_e2e_image_hash() {
  # Match .dockerignore before selecting the files copied by tests/Dockerfile.
  # A change to the Dockerfile or the ignore rules also invalidates the image.
  find . \
    \( -name node_modules -o -name dist -o -name .next -o -name types \
       -o -name .vite -o -name .vite-plus -o -name '*.tsbuildinfo' \
       -o -name .DS_Store -o -path './.git' -o -name test-results \
       -o -name blob-report -o -path '*/rust/target' \
       -o -path './packages/xl-typst-compiler/pkg' -o -name playwright-report \
       -o -path './tests/.vitest-attachments' \) -prune -o \
    \( -type f \( -name package.json -o -path './examples/*' \
       -o -path './pnpm-lock.yaml' -o -path './pnpm-workspace.yaml' \
       -o -path './tests/Dockerfile' -o -path './.dockerignore' \) \) -print0 |
    LC_ALL=C sort -z | xargs -0 shasum -a 256 -- | shasum -a 256 | cut -d' ' -f1
}
