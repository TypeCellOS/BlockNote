/** Whether the bytes start with the `%PDF-` file signature. */
export function isPdf(bytes: Uint8Array): boolean {
  return new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
}
