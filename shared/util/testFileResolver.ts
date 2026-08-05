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
 * a tiny in-memory JPEG with the exact same dimensions as the remote image
 * (332x322). Preserving the dimensions is important: the exported snapshots
 * embed the image size (e.g. `cx="3162300" cy="3067050"` = 332x322 * 9525
 * EMU/px), so any substitute must report identical dimensions to avoid
 * breaking existing snapshots.
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
 * any network access. It returns a local 332x322 JPEG blob for the placeholder
 * image URL used in `testDocument`, and falls back to fetching for any other
 * URL.
 */
export async function testResolveFileUrl(url: string): Promise<string | Blob> {
  if (url.includes("placehold.co")) {
    return new Blob([base64ToArrayBuffer(PLACEHOLDER_332x322_JPEG_BASE64)], {
      type: "image/jpeg",
    });
  }

  // For any non-image/unknown URL, return it unchanged so the caller can fetch
  // it. In practice exporter tests only resolve the placeholder image above.
  return url;
}
