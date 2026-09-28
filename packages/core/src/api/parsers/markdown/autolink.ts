import { findLinks } from "../../../extensions/tiptap-extensions/Link/helpers/linkDetector.js";

export type AutolinkLiteral = {
  value: string;
  href: string;
};

export function parseAutolinkLiteral(
  candidate: string,
): AutolinkLiteral | undefined {
  if (!/^(https?:\/\/|www\.)/i.test(candidate)) {
    return undefined;
  }

  // Markdown leaves entity-like suffixes outside an autolink.
  const value = candidate.replace(/&[a-zA-Z0-9]+;$/, "");
  const match = findLinks(value, { defaultProtocol: "http" })[0];
  if (!match || match.start !== 0) {
    return undefined;
  }

  return { value: match.value, href: match.href };
}
