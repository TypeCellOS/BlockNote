/**
 * A real (1x1 transparent) PNG for tests: some export paths probe the image
 * bytes for metadata (dimensions, format sniffing), so stub images must be
 * actual PNGs, not arbitrary bytes.
 */
export const TEST_PNG_BYTES = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  ),
  (char) => char.charCodeAt(0),
);

/** Whether the bytes start with the `%PDF-` file signature. */
export function isPdf(bytes: Uint8Array): boolean {
  return new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
}
