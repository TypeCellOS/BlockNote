import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vite-plus/test";

import { mathMLToOMML } from "./convert.js";
import { parseXml, XmlElement } from "./xmlParser.js";

/**
 * Conformance corpus: MathML → OMML fixture pairs from transpect's
 * hub2docx-lib (BSD-2-Clause; see `__fixtures__/hub2docx-lib/LICENSE`).
 * The `.omml` files are hub2docx's expected outputs, used here as an
 * independent reference for what other MathML→OMML converters produce.
 *
 * Comparison is structural, not textual: attribute order, namespace
 * prefixes, whitespace, `xml:space`, and `on`/`off` vs `1`/`0` boolean
 * spellings are normalized away. Remaining differences are real divergences
 * (e.g. run merging, styling choices) and show up as test failures.
 */
const FIXTURES_DIRECTORY = join(
  dirname(fileURLToPath(import.meta.url)),
  "__fixtures__/hub2docx-lib",
);

interface CanonicalElement {
  name: string;
  attributes: Record<string, string>;
  children: (CanonicalElement | string)[];
}

const normalizeValue = (value: string): string =>
  value === "on" ? "1" : value === "off" ? "0" : value;

/**
 * Boolean OMML properties whose schema default is "off": spelling them out
 * as `off`/`0` is equivalent to omitting them.
 */
const DEFAULT_OFF_PROPERTIES = new Set([
  "subHide",
  "supHide",
  "degHide",
  "grow",
  "hideTop",
  "hideBot",
  "hideLeft",
  "hideRight",
  "strikeH",
  "strikeV",
  "strikeBLTR",
  "strikeTLBR",
]);

const isRedundant = (child: CanonicalElement | string): boolean => {
  if (typeof child === "string") {
    return child === "";
  }
  // A default-valued boolean property adds nothing.
  if (
    DEFAULT_OFF_PROPERTIES.has(child.name) &&
    child.attributes.val === "0" &&
    child.children.length === 0
  ) {
    return true;
  }
  // Empty control properties and property containers add nothing either
  // (e.g. `<m:sSubPr><m:ctrlPr/></m:sSubPr>`).
  const isEmpty =
    Object.keys(child.attributes).length === 0 && child.children.length === 0;
  return isEmpty && (child.name === "ctrlPr" || child.name.endsWith("Pr"));
};

/**
 * Reduces an OMML tree to a canonical, comparison-friendly shape. Namespace
 * prefixes are already stripped by `parseXml`.
 */
function canonicalize(element: XmlElement): CanonicalElement {
  const attributes: Record<string, string> = {};
  for (const key of Object.keys(element.attributes).sort()) {
    if (key === "space" || key === "xmlns" || key.startsWith("xmlns")) {
      continue;
    }
    attributes[key] = normalizeValue(element.attributes[key]);
  }
  let children = element.children
    .map((child) =>
      child.type === "element" ? canonicalize(child) : child.value.trim(),
    )
    .filter((child) => !isRedundant(child));
  // Dropping default-valued properties can leave a property container
  // holding nothing; drop that too.
  children = children.filter((child) => !isRedundant(child));
  return { name: element.name, attributes, children };
}

const fixtureNames = readdirSync(FIXTURES_DIRECTORY)
  .filter((file) => file.endsWith(".mml"))
  .map((file) => file.slice(0, -".mml".length))
  .sort();

describe("hub2docx-lib conformance corpus", () => {
  for (const name of fixtureNames) {
    const mathml = readFileSync(
      join(FIXTURES_DIRECTORY, `${name}.mml`),
      "utf8",
    );
    const expectedOmml = readFileSync(
      join(FIXTURES_DIRECTORY, `${name}.omml`),
      "utf8",
    );

    it(`converts ${name}`, () => {
      expect(() => mathMLToOMML(mathml)).not.toThrow();
    });

    it(`matches the hub2docx OMML structure for ${name}`, () => {
      const actual = canonicalize(parseXml(mathMLToOMML(mathml)));
      const expected = canonicalize(parseXml(expectedOmml));
      expect(actual).toEqual(expected);
    });
  }
});
