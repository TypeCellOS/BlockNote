/**
 * An image generated during export (e.g. a rendered formula or diagram): the
 * encoded image bytes plus the dimensions to display it at.
 *
 * The bytes (rather than e.g. a data URL string or a `Blob`) are the source
 * of truth: they carry no encoding ambiguity, work in every environment, and
 * are readable synchronously - each output format converts them at its own
 * boundary (data URL for HTML-based targets, raw bytes for DOCX, base64 for
 * email attachments).
 */
export type ExportImage = {
  /** MIME type of `data`, e.g. `"image/png"` or `"image/svg+xml"`. */
  mimeType: string;
  /** The encoded image bytes. */
  data: Uint8Array;
  /**
   * Dimensions to display the image at, in the target format's units (CSS
   * pixels, points, ...). For raster images, `data`'s own pixel dimensions
   * may be larger - images are often rendered at 2-4x for sharpness.
   */
  width: number;
  height: number;
};

/**
 * Encodes bytes as base64. This papers over a platform gap: until
 * `Uint8Array.prototype.toBase64()` (ES2026) is available in every runtime
 * BlockNote supports, the only universal built-in is `btoa`, which takes
 * binary *strings*. Uses `toBase64` when the runtime has it.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  if ("toBase64" in bytes && typeof bytes.toBase64 === "function") {
    return (bytes as Uint8Array & { toBase64(): string }).toBase64();
  }

  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

/**
 * Encodes an {@link ExportImage}'s bytes as a base64 data URL, for targets
 * that take image sources as URLs (HTML `src` attributes, react-pdf image
 * sources, ...).
 */
export function exportImageToDataURL(image: ExportImage): string {
  return `data:${image.mimeType};base64,${bytesToBase64(image.data)}`;
}
