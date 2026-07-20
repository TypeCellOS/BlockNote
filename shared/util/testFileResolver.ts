/**
 * Test-only file resolver for exporter tests.
 *
 * The `testDocument` used across exporter tests contains image blocks that
 * point at a remote placeholder URL (https://placehold.co/332x322.jpg). The
 * default exporter file resolver fetches these over the network (via a CORS
 * proxy), which makes the tests flaky and causes failures in sandboxed CI
 * environments without outbound network access (`TypeError: fetch failed`).
 *
 * To keep the tests deterministic and network-independent, this module returns
 * a tiny in-memory JPEG with the exact dimensions requested in the URL.
 * Preserving the dimensions is important: the exported snapshots embed the
 * image size (e.g. `cx="3162300" cy="3067050"` = 332x322 * 9525 EMU/px), so
 * any substitute must report identical dimensions to avoid breaking existing
 * snapshots.
 */

// A minimal valid baseline JPEG whose SOF0 marker declares a 332x322 image.
// Only the header is meaningful (image-meta reads dimensions from SOF0); the
// pixel data is intentionally empty as exporters never decode the contents.
const PLACEHOLDER_332x322_JPEG_BASE64 =
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAALCAFCAUwBAREA/9oACAEBAAA/AP/Z";

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  if (typeof atob === "function") {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
  // Node.js fallback
  const buf = Buffer.from(base64, "base64");
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

/**
 * A {@link ExporterOptions.resolveFileUrl} implementation for tests that avoids
 * any network access. It returns a local JPEG blob for placehold.co URLs,
 * reporting the exact dimensions requested in the URL (`.../<width>x<height>`)
 * by patching them into the placeholder's SOF0 marker. It falls back to
 * fetching for any other URL.
 */
export async function testResolveFileUrl(url: string): Promise<string | Blob> {
  if (url.includes("placehold.co")) {
    const bytes = new Uint8Array(
      base64ToArrayBuffer(PLACEHOLDER_332x322_JPEG_BASE64),
    );
    // URLs of the form `.../<width>x<height>` get the requested dimensions
    // patched in; any other placehold.co URL keeps the original 332x322 so it
    // still never touches the network.
    const dimensions = url.match(/placehold\.co\/(\d+)x(\d+)/);
    if (dimensions) {
      patchJpegDimensions(
        bytes,
        parseInt(dimensions[1]),
        parseInt(dimensions[2]),
      );
    }
    return new Blob([bytes], { type: "image/jpeg" });
  }

  // For any non-image/unknown URL, return it unchanged so the caller can fetch
  // it. In practice exporter tests only resolve the placeholder image above.
  return url;
}

/**
 * Writes the given dimensions into the JPEG's SOF0 segment. The SOF0 segment
 * (FF C0) stores height and width as big-endian u16 at offsets 5 and 7 after
 * the marker.
 */
function patchJpegDimensions(bytes: Uint8Array, width: number, height: number) {
  if (width > 0xffff || height > 0xffff) {
    throw new Error(
      `JPEG dimensions must fit in a u16, got ${width}x${height}`,
    );
  }
  for (let i = 0; i < bytes.length - 8; i++) {
    if (bytes[i] === 0xff && bytes[i + 1] === 0xc0) {
      bytes[i + 5] = height >> 8;
      bytes[i + 6] = height & 0xff;
      bytes[i + 7] = width >> 8;
      bytes[i + 8] = width & 0xff;
      return;
    }
  }
  // Fail loudly: silently returning the unpatched 332x322 image would make
  // dimension-dependent snapshots fail (or pass with wrong data) far away
  // from this file.
  throw new Error("No SOF0 (FF C0) marker found in the placeholder JPEG");
}
