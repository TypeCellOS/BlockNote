#!/usr/bin/env bash
# Installs the tooling the xl-pdf-renderer-2 unit tests gate on:
#  - pdftoppm (poppler) rasterizes the per-page visual snapshots
#  - veraPDF validates PDF/UA-1 conformance
# Used by CI (see .github/workflows); locally, `brew install poppler verapdf`
# (or your distro's poppler package) provides the same tools natively.
#
# veraPDF comes from its official container image, PINNED by digest:
# validator upgrades can change conformance verdicts, so they should land as
# deliberate diffs, not ambient CI drift. The image currently publishes only
# dev-line tags (no stable releases) - the digest below is v1.31.156; when
# veraPDF starts tagging stable releases, repoint to one.
set -euo pipefail

VERAPDF_IMAGE="ghcr.io/verapdf/cli@sha256:65583906f9abb4683242cd605c4317e821e60f3e1ee418d00db87b83f11f54e7" # v1.31.156

sudo apt-get update -qq
sudo apt-get install -y -qq poppler-utils

docker pull -q "$VERAPDF_IMAGE"

# A PATH shim so tests can invoke plain `verapdf <flags> <file>`. The image's
# entrypoint is the verapdf CLI (workdir /data, non-root user), so a trailing
# file argument is copied into a world-readable temp dir and mounted there -
# the container's uid can't read the caller's 0700 temp dirs directly.
sudo tee /usr/local/bin/verapdf >/dev/null <<SHIM
#!/usr/bin/env bash
set -euo pipefail
IMAGE="$VERAPDF_IMAGE"
args=("\$@")
last="\${args[\${#args[@]}-1]:-}"
if [ -n "\$last" ] && [ -f "\$last" ]; then
  tmp="\$(mktemp -d)"
  trap 'rm -rf "\$tmp"' EXIT
  chmod 755 "\$tmp"
  cp "\$last" "\$tmp/input.pdf"
  chmod 644 "\$tmp/input.pdf"
  unset "args[\${#args[@]}-1]"
  # No exec: the EXIT trap must still run to clean up the temp dir; set -e
  # exits with docker's status code, so non-conformance still propagates.
  docker run --rm -v "\$tmp":/data:ro "\$IMAGE" "\${args[@]}" /data/input.pdf
  exit 0
fi
exec docker run --rm "\$IMAGE" "\${args[@]}"
SHIM
sudo chmod +x /usr/local/bin/verapdf

# Smoke-check both tools so a broken install fails here, not inside a test.
verapdf --version
pdftoppm -v
