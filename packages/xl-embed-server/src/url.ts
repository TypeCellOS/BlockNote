/** Syntax validation only; this does not validate DNS or network access. */
export function parseHttpUrl(value: string, base?: URL): URL | undefined {
  let url: URL;
  try {
    url = new URL(value, base);
  } catch (error) {
    if (error instanceof TypeError) {
      return undefined;
    }
    throw error;
  }
  return (url.protocol === "https:" || url.protocol === "http:") &&
    !url.username &&
    !url.password
    ? url
    : undefined;
}
