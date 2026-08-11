/**
 * XML parsing for MathML input, backed by `fast-xml-parser` (MIT,
 * browser/Node isomorphic). The parser output is adapted into a minimal
 * ordered node tree — elements and text — which is all the converter needs;
 * comments, processing instructions, and annotations of the XML layer are
 * dropped here.
 */
// `XMLValidator` is deprecated in fast-xml-parser 5.x in favor of the
// standalone `fast-xml-validator` package (the v6 toolkit split). It works
// fine on the 5.x line we pin; switch to the standalone package when
// upgrading to v6.
import { XMLParser, XMLValidator } from "fast-xml-parser";

export interface XmlElement {
  type: "element";
  name: string;
  attributes: Record<string, string>;
  children: XmlNode[];
}

export interface XmlText {
  type: "text";
  value: string;
}

export type XmlNode = XmlElement | XmlText;

export class XmlParseError extends Error {}

const parser = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: "",
  // Some emitters prefix MathML (`<mml:math>`); element names are matched
  // without the namespace prefix.
  removeNSPrefix: true,
  ignoreDeclaration: true,
  ignorePiTags: true,
  commentPropName: "#comment",
  // MathML from the wild uses HTML entities such as `&nbsp;`.
  htmlEntities: true,
  // Whitespace and numeric-looking text must survive verbatim.
  trimValues: false,
  parseTagValue: false,
  parseAttributeValue: false,
});

type RawNode = Record<string, unknown>;

function toXmlNode(raw: RawNode): XmlNode | null {
  if ("#text" in raw) {
    return { type: "text", value: String(raw["#text"]) };
  }
  if ("#comment" in raw) {
    return null;
  }
  const name = Object.keys(raw).find((key) => key !== ":@");
  if (name === undefined) {
    return null;
  }
  const attributes: Record<string, string> = {};
  for (const [key, value] of Object.entries((raw[":@"] as RawNode) ?? {})) {
    attributes[key] = String(value);
  }
  const children = ((raw[name] as RawNode[]) ?? [])
    .map(toXmlNode)
    .filter((node): node is XmlNode => node !== null);
  return { type: "element", name, attributes, children };
}

/** Parses an XML document and returns its root element. */
export function parseXml(input: string): XmlElement {
  // Validate first: the parser itself is lenient and would silently accept
  // malformed input (unclosed/mismatched tags) that should be rejected.
  const validation = XMLValidator.validate(input);
  if (validation !== true) {
    throw new XmlParseError(validation.err.msg);
  }
  let rawNodes: RawNode[];
  try {
    rawNodes = parser.parse(input) as RawNode[];
  } catch (error) {
    throw new XmlParseError(
      error instanceof Error ? error.message : String(error),
    );
  }
  const roots = rawNodes
    .map(toXmlNode)
    .filter((node): node is XmlElement => node?.type === "element");
  if (roots.length !== 1) {
    throw new XmlParseError("Expected a single root element");
  }
  return roots[0];
}
