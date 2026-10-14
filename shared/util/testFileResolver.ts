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
 * a small in-memory JPEG with the exact same dimensions as the remote image
 * (332x322). Preserving the dimensions is important: the exported snapshots
 * embed the image size (e.g. `cx="3162300" cy="3067050"` = 332x322 * 9525
 * EMU/px), so any substitute must report identical dimensions to avoid
 * breaking existing snapshots.
 */

// A complete, decodable 332x322 solid-color baseline JPEG (~2.7KB). It must
// be a real image, not just a valid header: some consumers only read the
// dimensions (image-meta), but the Typst compiler decodes the pixel data
// when embedding, and hands a placeholder-header-only file back as a
// compile error.
const PLACEHOLDER_332x322_JPEG_BASE64 =
  "/9j/4AAQSkZJRgABAQAASABIAAD/4QBMRXhpZgAATU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAA" +
  "AAA6ABAAMAAAABAAEAAKACAAQAAAABAAABTKADAAQAAAABAAABQgAAAAD/7QA4UGhvdG9zaG9w" +
  "IDMuMAA4QklNBAQAAAAAAAA4QklNBCUAAAAAABDUHYzZjwCyBOmACZjs+EJ+/8AAEQgBQgFMAw" +
  "EiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMF" +
  "BQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKC" +
  "kqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeY" +
  "mZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/" +
  "j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAEC" +
  "dwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Nj" +
  "c4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKj" +
  "pKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/bAE" +
  "MABAQEBAQEBgQEBgkGBgYJDAkJCQkMDwwMDAwMDxIPDw8PDw8SEhISEhISEhUVFRUVFRkZGRkZ" +
  "HBwcHBwcHBwcHP/bAEMBBAUFBwcHDAcHDB0UEBQdHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR" +
  "0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHf/dAAQAFf/aAAwDAQACEQMRAD8A+rKKKK/mc+sCiiig" +
  "AooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKK" +
  "ACiiigAooooAKKKKACiiigAooooA//0Pqyiiiv5nPrAooooAKKKKACiiigAooooAKKKKACiiig" +
  "AooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKK" +
  "AP/9H6sooor+Zz6wKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiig" +
  "AooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD//S+rKKKK/mc+sCiiigAooooA" +
  "KKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiig" +
  "AooooAKKKKACiiigAooooA//0/qyiiiv5nPrAooooAKKKKACiiigAooooAKKKKACiiigAooooA" +
  "KKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP/9T6" +
  "sooor+Zz6wKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA" +
  "KKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD//V+rKKKK/mc+sCiiigAooooAKKKKAC" +
  "iiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA" +
  "KKKKACiiigAooooA//1vqyiiiv5nPrAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAC" +
  "iiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP/9f6sooor+" +
  "Zz6wKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAC" +
  "iiigAooooAKKKKACiiigAooooAKKKKACiiigD//Q+rKKKK/mc+sCiiigAooooAKKKKACiiigAo" +
  "oooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAC" +
  "iiigAooooA//0fqyiiiv5nPrAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAo" +
  "oooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP/9L6sooor+Zz6wKK" +
  "KKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAo" +
  "oooAKKKKACiiigAooooAKKKKACiiigD//T+rKKKK/mc+sCiiigAooooAKKKKACiiigAooooAKK" +
  "KKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAo" +
  "oooA//1Pqyiiiv5nPrAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKK" +
  "KKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP/9X6sooor+Zz6wKKKKACii" +
  "igAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKK" +
  "KKACiiigAooooAKKKKACiiigD//W+rKKKK/mc+sCiiigAooooAKKKKACiiigAooooAKKKKACii" +
  "igAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA//" +
  "1/qyiiiv5nPrAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACii" +
  "igAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP/9D6sooor+Zz6wKKKKACiiigAooo" +
  "oAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACii" +
  "igAooooAKKKKACiiigD//R+rKKKK/mc+sCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooo" +
  "oAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA//0vqyii" +
  "iv5nPrAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooo" +
  "oAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP/9P6sooor+Zz6wKKKKACiiigAooooAKKKK" +
  "ACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooo" +
  "oAKKKKACiiigD//Z";

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
