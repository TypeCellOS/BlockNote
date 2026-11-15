/** Syntax/display validation, not an SSRF or connection policy. Keep source identity separate. */
export function parseSourceUrl(value: string): URL | undefined {
  // An explicit authority must resolve identically with or without a document base.
  // Reject URL-parser recovery (extra/missing slashes, backslashes, stripped controls).
  if (!/^https?:\/\/[^/\\?#]/i.test(value) || /[\s\\\p{Cc}]/u.test(value)) {
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
