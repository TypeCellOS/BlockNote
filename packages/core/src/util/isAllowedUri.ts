import { LinkOptions } from "@tiptap/extension-link";

// From https://github.com/ueberdosis/tiptap/blob/a0d2f2803652851bbe2f06f124a70bc01cfb0dab/packages/extension-link/src/link.ts#L161
const ATTR_WHITESPACE =
  // eslint-disable-next-line no-control-regex
  /[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g;

export function isAllowedUri(
  uri: string | undefined,
  protocols?: LinkOptions["protocols"]
) {
  const allowedProtocols: string[] = [
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

  if (protocols) {
    protocols.forEach((protocol) => {
      const nextProtocol =
        typeof protocol === "string" ? protocol : protocol.scheme;

      if (nextProtocol) {
        allowedProtocols.push(nextProtocol);
      }
    });
  }

  return (
    !uri ||
    uri.replace(ATTR_WHITESPACE, "").match(
      new RegExp(
        `^(?:(?:${allowedProtocols.join(
          "|"
          // eslint-disable-next-line no-useless-escape
        )}):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))`,
        "i"
      )
    )
  );
}
