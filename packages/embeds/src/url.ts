/** Syntax/display validation, not an SSRF or connection policy. Keep source identity separate. */
export function parseSourceUrl(value: string): URL | undefined {
  if (!value || /\s/.test(value)) {
    return undefined;
  }
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") &&
      !url.username &&
      !url.password
      ? url
      : undefined;
  } catch (error) {
    if (error instanceof TypeError) {
      return undefined;
    }
    throw error;
  }
}
