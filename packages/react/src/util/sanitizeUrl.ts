/**
 * Sanitizes a potentially unsafe URL.
 * @param {string} inputUrl - The URL to sanitize.
 * @param {string} baseUrl - The base URL to use for relative URLs.
 * @returns {string} The normalized URL, or "#" if the URL is invalid or unsafe.
 */
export function sanitizeUrl(inputUrl: string, baseUrl: string): string {
  try {
    const url = new URL(inputUrl, baseUrl);

    // eslint-disable-next-line no-script-url -- false positive, we are explicitly checking if the protocol is safe to prevent XSS
    if (url.protocol !== "javascript:") {
      return url.href;
    }
  } catch (error) {
    // if URL creation fails, it's an invalid URL
  }

  // return a safe default for invalid or unsafe URLs
  return "#";
}
