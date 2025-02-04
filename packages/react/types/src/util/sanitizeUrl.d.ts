/**
 * Sanitizes a potentially unsafe URL.
 * @param {string} inputUrl - The URL to sanitize.
 * @param {string} baseUrl - The base URL to use for relative URLs.
 * @returns {string} The normalized URL, or "#" if the URL is invalid or unsafe.
 */
export declare function sanitizeUrl(inputUrl: string, baseUrl: string): string;
