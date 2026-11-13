export const VALID_LINK_PROTOCOLS = [
  "http",
  "https",
  "ftp",
  "ftps",
  "mailto",
  "tel",
  "callto",
  "sms",
  "cid",
  "xmpp",
];
export const DEFAULT_LINK_PROTOCOL = "https";

const URI_SCHEME_REGEX = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Prepares a URL entered in the link toolbar before it is applied.
 *
 * URLs starting with one of the `VALID_LINK_PROTOCOLS` are kept as they are.
 * So is a URL with any other explicit scheme (e.g. `myapp://page`) when
 * `isValidLink` accepts it, which lets the toolbar honor the editor's
 * `links.isValidLink` option. Everything else is treated as an address
 * without a protocol and gets `DEFAULT_LINK_PROTOCOL` prepended.
 */
export function normalizeLinkUrl(
  url: string,
  isValidLink: (href: string) => boolean,
): string {
  for (const protocol of VALID_LINK_PROTOCOLS) {
    if (url.startsWith(protocol)) {
      return url;
    }
  }

  if (URI_SCHEME_REGEX.test(url) && isValidLink(url)) {
    return url;
  }

  return `${DEFAULT_LINK_PROTOCOL}://${url}`;
}
