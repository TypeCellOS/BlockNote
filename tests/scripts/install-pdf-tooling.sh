#!/usr/bin/env bash
# Installs the tooling the xl-pdf-exporter unit tests gate on:
#  - pdftoppm (poppler) rasterizes the per-page visual snapshots; the test
#    itself runs it through a digest-pinned container (see pdfua.test.ts) so
#    the byte-exact PNG baselines can't drift with the host's poppler - this
#    script only pre-pulls that image so the pull cost isn't paid mid-test.
#  - veraPDF validates PDF/UA-1 conformance; it comes from its official
#    container image behind a PATH shim, so tests invoke plain `verapdf`
#    (locally, `brew install verapdf` provides the same tool natively).
# Used by CI (see .github/workflows).
#
# Both images are PINNED by digest: rasterizer upgrades change the rendered
# bytes and validator upgrades can change conformance verdicts, so either
# should land as a deliberate diff, not ambient CI drift. The veraPDF image
# currently publishes only dev-line tags (no stable releases) - the digest
# below is v1.31.156; when veraPDF starts tagging stable releases, repoint
# to one.
set -euo pipefail

VERAPDF_IMAGE="ghcr.io/verapdf/cli@sha256:65583906f9abb4683242cd605c4317e821e60f3e1ee418d00db87b83f11f54e7" # v1.31.156

# The poppler image is defined in pdfua.test.ts (single source of truth, next
# to the baselines it renders); grep it out rather than duplicating the digest.
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
POPPLER_IMAGE="$(grep -o 'minidocks/poppler@sha256:[0-9a-f]*' \
  "$ROOT/packages/xl-pdf-exporter/src/pdfua/pdfua.test.ts" | head -1)"
test -n "$POPPLER_IMAGE"

docker pull -q "$VERAPDF_IMAGE"
docker pull -q --platform linux/amd64 "$POPPLER_IMAGE"

# A PATH shim so tests can invoke plain `verapdf <flags> <file>`. The image's
# entrypoint is the verapdf CLI (workdir /data, non-root user), so a trailing
# file argument is copied into a world-readable temp dir and mounted there -
# the container's uid can't read the caller's 0700 temp dirs directly.
sudo tee /usr/local/bin/verapdf >/dev/null <<SHIM
#!/usr/bin/env bash
set -euo pipefail
IMAGE="$VERAPDF_IMAGE"
args=("\$@")
# The tests invoke \`verapdf <flags> <file.pdf>\`; only that shape gets the
# copy-and-mount treatment. Requiring the .pdf suffix (not just an existing
# file) keeps a trailing file-valued option (e.g. \`--policyfile x.sch\`)
# from being mounted as the input, and the \$# guard keeps a zero-argument
# call (e.g. bare \`verapdf\`) from tripping over an empty array subscript.
last=""
if [ "\$#" -gt 0 ]; then
  last="\${args[\$# - 1]}"
fi
if [[ "\$last" == *.pdf && -f "\$last" ]]; then
  tmp="\$(mktemp -d)"
  trap 'rm -rf "\$tmp"' EXIT
  chmod 755 "\$tmp"
  cp "\$last" "\$tmp/input.pdf"
  chmod 644 "\$tmp/input.pdf"
  unset "args[\$# - 1]"
  # No exec: the EXIT trap must still run to clean up the temp dir; set -e
  # exits with docker's status code, so non-conformance still propagates.
  docker run --rm -v "\$tmp":/data:ro "\$IMAGE" \${args[@]+"\${args[@]}"} /data/input.pdf
  exit 0
fi
# \${args[@]+...} keeps an empty array from tripping set -u on old bash.
exec docker run --rm "\$IMAGE" \${args[@]+"\${args[@]}"}
SHIM
sudo chmod +x /usr/local/bin/verapdf

# Smoke-check both tools so a broken install fails here, not inside a test.
verapdf --version
docker run --rm --platform linux/amd64 "$POPPLER_IMAGE" pdftoppm -v
