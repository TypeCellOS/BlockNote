/**
 * A tiny OMML element tree + serializer.
 *
 * OMML (Office Math Markup Language) is the math grammar of WordprocessingML,
 * specified in ECMA-376 Part 1 §22.1. All elements live in the
 * `m:` namespace; property values are carried in `m:val` attributes.
 */

export interface OmmlElement {
  name: string;
  attributes?: Record<string, string>;
  children: OmmlNode[];
}

export interface OmmlText {
  text: string;
}

export type OmmlNode = OmmlElement | OmmlText;

export const isOmmlElement = (node: OmmlNode): node is OmmlElement =>
  "name" in node;

/** Creates an OMML element node. */
export const el = (
  name: string,
  attributes?: Record<string, string>,
  children: OmmlNode[] = [],
): OmmlElement => ({ name, attributes, children });

/** Creates an OMML `m:val` property element, e.g. `<m:chr m:val="∑"/>`. */
export const val = (name: string, value: string): OmmlElement =>
  el(name, { "m:val": value });

/**
 * Matches either a valid surrogate pair (kept) or a single character outside
 * XML 1.0's `Char` production (dropped): C0 controls, unpaired surrogates,
 * and the U+FFFE/U+FFFF noncharacters. Such characters have no XML
 * representation at all - not even as numeric references - so a document
 * containing them is rejected by Word rather than rendered. They carry no
 * visual meaning, so dropping them is preferable to emitting a `.docx` that
 * exports "successfully" and then fails to open.
 *
 * The alternation deliberately avoids lookbehind, which older Safari
 * versions cannot parse.
 */
const INVALID_XML_CHARACTER =
  // eslint-disable-next-line no-control-regex -- matching them is the point
  /[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u0000-\u0008\u000b\u000c\u000e-\u001f\uD800-\uDFFF\ufffe\uffff]/g;

const stripInvalidCharacters = (text: string): string =>
  text.replace(INVALID_XML_CHARACTER, (match) =>
    match.length === 2 ? match : "",
  );

const escapeText = (text: string): string =>
  stripInvalidCharacters(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const escapeAttribute = (text: string): string =>
  escapeText(text).replace(/"/g, "&quot;");

export function serializeOmml(node: OmmlNode): string {
  if (!isOmmlElement(node)) {
    return escapeText(node.text);
  }
  const attributes = Object.entries(node.attributes ?? {})
    .map(([name, value]) => ` ${name}="${escapeAttribute(value)}"`)
    .join("");
  if (node.children.length === 0) {
    return `<${node.name}${attributes}/>`;
  }
  const children = node.children.map(serializeOmml).join("");
  return `<${node.name}${attributes}>${children}</${node.name}>`;
}
