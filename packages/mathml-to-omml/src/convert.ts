/**
 * MathML → OMML conversion.
 *
 * The transform is written against ECMA-376 Part 1 §22.1 (Office Math) and
 * the MathML Core / MathML 3 specifications. It covers the MathML dialect
 * that KaTeX emits (`output: "mathml"`) as well as the wider presentation-
 * MathML surface that has an OMML representation (`mmultiscripts`,
 * `mfenced`, `ms`, `maction`, inherited `mathvariant`, ...). Constructs with
 * no OMML equivalent (elementary-math layout such as `mlongdiv`/`mstack`,
 * `mglyph`) throw {@link UnsupportedMathMLError} so callers can fall back to
 * rendering the math source instead of silently dropping content.
 */
import { applyMathVariant, OmmlRunStyle } from "./mathVariants.js";
import {
  el,
  isOmmlElement,
  OmmlElement,
  OmmlNode,
  serializeOmml,
  val,
} from "./omml.js";
import { parseXml, XmlElement, XmlNode } from "./xmlParser.js";

export class UnsupportedMathMLError extends Error {}

const OMML_NAMESPACE =
  "http://schemas.openxmlformats.org/officeDocument/2006/math";

const WORD_NAMESPACE =
  "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

/**
 * n-ary operators: big operators whose limits attach to the symbol itself
 * (`m:nary`), rather than rendering as ordinary sub/superscripts.
 */
const NARY_OPERATORS = new Set("∑∏∐∫∬∭⨌∮∯∰∱∲∳⋀⋁⋂⋃⨀⨁⨂⨃⨄⨅⨆");

/**
 * Operators that terminate the implied argument of an n-ary operator.
 * MathML leaves the operand of e.g. `\sum` as following siblings; OMML nests
 * it inside the `m:nary` element. Everything up to the next relation or
 * punctuation symbol is treated as the operand.
 */
const NARY_OPERAND_TERMINATORS = new Set(
  "=≠≈≡≢∼≃≅≔<>≤≥≦≧≪≫∈∉∋⊂⊃⊆⊇⊄⊅→←↔⇒⇐⇔↦⟹⟸⟺,;:∣|",
);

/**
 * Invisible operators (function application, invisible times/separator/plus)
 * carry no visual content in OMML and are dropped.
 */
const INVISIBLE_OPERATORS = new Set(["\u2061", "\u2062", "\u2063", "\u2064"]);

/** Horizontal group characters, rendered with `m:groupChr`. */
const GROUP_CHARACTERS_OVER = new Set(["⏞", "⏜", "⎴"]);
const GROUP_CHARACTERS_UNDER = new Set(["⏟", "⏝", "⎵"]);

/** Stretchy over/underlines, rendered with `m:bar`. */
const BAR_CHARACTERS = new Set(["‾", "¯", "_", "▁", "＿"]);

/**
 * Spacing accents mapped to the combining characters `m:acc` expects
 * (`m:chr` defaults to U+0302, combining circumflex).
 */
const ACCENT_CHARACTERS: Record<string, string> = {
  "^": "\u0302", // circumflex
  ˆ: "\u0302",
  "~": "\u0303", // tilde
  "˜": "\u0303",
  ˉ: "\u0304", // macron
  "¯": "\u0304",
  "˙": "\u0307", // dot above
  "¨": "\u0308", // diaeresis
  "´": "\u0301", // acute
  "`": "\u0300", // grave
  "˘": "\u0306", // breve
  ˇ: "\u030c", // caron
  "˚": "\u030a", // ring above
  "°": "\u030a",
  "→": "\u20d7", // right arrow
  "←": "\u20d6", // left arrow
  "‾": "\u0305", // overline (non-stretchy; stretchy overlines become m:bar)
};

/** Combining marks (used directly as `m:acc` accents). */
const isCombiningMark = (character: string): boolean => {
  const code = character.codePointAt(0) ?? 0;
  return (
    Array.from(character).length === 1 &&
    ((code >= 0x0300 && code <= 0x036f) || (code >= 0x20d0 && code <= 0x20dc))
  );
};

const TOKEN_ELEMENT_NAMES = new Set(["mi", "mn", "mo", "mtext", "ms"]);

/**
 * MathML allows `mathvariant` on `mstyle` (and some emitters put it on other
 * wrappers), applying to all descendant tokens. OMML styles individual runs,
 * so inherited variants are pushed down onto tokens that don't set their
 * own.
 */
function inheritMathVariant(element: XmlElement, inherited?: string): void {
  const variant = element.attributes.mathvariant ?? inherited;
  if (
    variant !== undefined &&
    element.attributes.mathvariant === undefined &&
    TOKEN_ELEMENT_NAMES.has(element.name)
  ) {
    element.attributes.mathvariant = variant;
  }
  for (const child of element.children) {
    if (isElement(child)) {
      inheritMathVariant(child, variant);
    }
  }
}

/**
 * Converts a MathML document (a `<math>` element) to an OMML `<m:oMath>`
 * fragment, returned as an XML string.
 *
 * @throws {UnsupportedMathMLError} for MathML constructs without a supported
 * OMML mapping, and {@link XmlParseError} for malformed input.
 */
export function mathMLToOMML(mathml: string): string {
  const root = parseXml(mathml);
  if (root.name !== "math") {
    throw new UnsupportedMathMLError(
      `Expected a <math> root element, got <${root.name}>`,
    );
  }
  inheritMathVariant(root);
  const children = convertNodes(contentNodes(root));
  const attributes: Record<string, string> = { "xmlns:m": OMML_NAMESPACE };
  if (usesWordNamespace(children)) {
    attributes["xmlns:w"] = WORD_NAMESPACE;
  }
  const output = el("m:oMath", attributes, children);
  mergeAdjacentRuns(output);
  return serializeOmml(output);
}

const isElement = (node: XmlNode): node is XmlElement =>
  node.type === "element";

/** An element's child nodes with inter-element whitespace dropped. */
const contentNodes = (element: XmlElement): XmlNode[] =>
  element.children.filter(
    (child) => isElement(child) || child.value.trim().length > 0,
  );

/**
 * The element's text content, or `null` if it contains child elements
 * (KaTeX nests element structures inside token elements, e.g. for
 * `\overset`).
 */
const simpleText = (element: XmlElement): string | null =>
  element.children.some(isElement)
    ? null
    : element.children
        .map((child) => (isElement(child) ? "" : child.value))
        .join("");

interface NaryOperator {
  character: string;
  subscript?: XmlNode;
  superscript?: XmlNode;
  limitLocation: "undOvr" | "subSup";
}

/** Unwraps trivial `mrow`/`mstyle` wrappers around a single child. */
const unwrap = (node: XmlNode): XmlNode => {
  while (isElement(node) && (node.name === "mrow" || node.name === "mstyle")) {
    const children = contentNodes(node);
    if (children.length !== 1) {
      break;
    }
    node = children[0];
  }
  return node;
};

const naryCharacter = (node: XmlNode | undefined): string | null => {
  if (node === undefined) {
    return null;
  }
  const base = unwrap(node);
  if (!isElement(base) || base.name !== "mo") {
    return null;
  }
  const text = simpleText(base)?.trim();
  if (!text) {
    return null;
  }
  if (NARY_OPERATORS.has(text)) {
    return text;
  }
  // MathML can mark arbitrary operators as big operators.
  if (base.attributes.largeop === "true" && Array.from(text).length === 1) {
    return text;
  }
  return null;
};

/**
 * Recognizes `<mo>∑</mo>` and script/limit elements built on an n-ary
 * operator base.
 */
function asNaryOperator(element: XmlElement): NaryOperator | null {
  if (element.name === "mo") {
    const character = naryCharacter(element);
    return character ? { character, limitLocation: "undOvr" } : null;
  }
  const usesLimits =
    element.name === "munder" ||
    element.name === "mover" ||
    element.name === "munderover";
  const usesScripts =
    element.name === "msub" ||
    element.name === "msup" ||
    element.name === "msubsup";
  if (!usesLimits && !usesScripts) {
    return null;
  }
  const children = contentNodes(element);
  const character = naryCharacter(children[0]);
  if (!character) {
    return null;
  }
  const lower =
    element.name === "msub" ||
    element.name === "msubsup" ||
    element.name === "munder" ||
    element.name === "munderover"
      ? children[1]
      : undefined;
  const upper =
    element.name === "msup" || element.name === "mover"
      ? children[1]
      : element.name === "msubsup" || element.name === "munderover"
        ? children[2]
        : undefined;
  return {
    character,
    subscript: lower,
    superscript: upper,
    limitLocation: usesLimits ? "undOvr" : "subSup",
  };
}

const endsNaryOperand = (node: XmlNode): boolean => {
  if (!isElement(node) || node.name !== "mo") {
    return false;
  }
  if (node.attributes.separator === "true") {
    return true;
  }
  const text = simpleText(node)?.trim();
  return text !== undefined && NARY_OPERAND_TERMINATORS.has(text);
};

function buildNary(operator: NaryOperator, operand: XmlNode[]): OmmlElement {
  const properties: OmmlElement[] = [];
  // `m:chr` defaults to U+222B (integral); Word omits it there, so do we.
  if (operator.character !== "∫") {
    properties.push(val("m:chr", operator.character));
  }
  properties.push(val("m:limLoc", operator.limitLocation));
  // Let the operator glyph grow with the operand (TeX-like rendering).
  properties.push(val("m:grow", "1"));
  if (!operator.subscript) {
    properties.push(val("m:subHide", "1"));
  }
  if (!operator.superscript) {
    properties.push(val("m:supHide", "1"));
  }
  return el("m:nary", undefined, [
    el("m:naryPr", undefined, properties),
    el(
      "m:sub",
      undefined,
      operator.subscript ? convertNodes([operator.subscript]) : [],
    ),
    el(
      "m:sup",
      undefined,
      operator.superscript ? convertNodes([operator.superscript]) : [],
    ),
    el("m:e", undefined, convertNodes(operand)),
  ]);
}

/**
 * Converts a list of sibling nodes. An n-ary operator absorbs the following
 * sibling as its operand (unless it is a relation/punctuation); a nested
 * n-ary operator extends the operand, so `∑∑x` nests properly. Without an
 * operand the operator falls back to plain character + script rendering,
 * which avoids OMML's empty-argument placeholder boxes.
 */
function convertNodes(nodes: XmlNode[]): OmmlNode[] {
  const result: OmmlNode[] = [];
  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index];
    const operator = isElement(node) ? asNaryOperator(node) : null;
    if (operator) {
      const operand: XmlNode[] = [];
      let next = index + 1;
      while (next < nodes.length && !endsNaryOperand(nodes[next])) {
        const sibling = nodes[next];
        operand.push(sibling);
        next++;
        if (!(isElement(sibling) && asNaryOperator(sibling))) {
          break;
        }
      }
      if (operand.length > 0) {
        result.push(buildNary(operator, operand));
        index = next - 1;
        continue;
      }
    }
    result.push(...convertNode(node));
  }
  return result;
}

function convertNode(node: XmlNode): OmmlNode[] {
  if (!isElement(node)) {
    const text = node.value.trim();
    return text.length === 0 ? [] : [run(text)];
  }
  return convertElement(node);
}

/** Wraps converted content in an OMML argument element such as `m:e`. */
const arg = (name: string, nodes: XmlNode[]): OmmlElement =>
  el(name, undefined, convertNodes(nodes));

/** Like {@link arg}, but an absent node yields an empty argument element. */
const scriptArg = (name: string, node: XmlNode | undefined): OmmlElement =>
  node === undefined ? el(name) : arg(name, [node]);

/**
 * Arity policy for structure elements (fractions, radicals, scripts,
 * limits): a missing base is unrecoverable and throws, while missing
 * script/limit/denominator arguments — which some emitters produce — become
 * empty argument elements, and extra arguments are ignored. This matches
 * how reference converters recover from malformed MathML.
 */
function requireBase(element: XmlElement, children: XmlNode[]): void {
  if (children.length === 0) {
    throw new UnsupportedMathMLError(
      `Expected <${element.name}> to have a base`,
    );
  }
}

function convertElement(element: XmlElement): OmmlNode[] {
  const children = contentNodes(element);
  switch (element.name) {
    case "math":
    case "mrow":
    case "mstyle":
    case "mpadded":
      return convertRow(children);

    case "semantics":
      // The first child is the presentation; the rest are annotations.
      return convertNodes(
        children.filter(
          (child) =>
            !isElement(child) ||
            (child.name !== "annotation" && child.name !== "annotation-xml"),
        ),
      );

    case "annotation":
    case "annotation-xml":
      return [];

    case "mi":
    case "mn":
    case "mo":
    case "mtext":
    case "ms":
      return convertToken(element, children);

    case "mspace":
      return convertSpace(element);

    case "mfrac": {
      requireBase(element, children);
      const noBar =
        element.attributes.linethickness !== undefined &&
        parseFloat(element.attributes.linethickness) === 0;
      return [
        el("m:f", undefined, [
          ...(noBar ? [el("m:fPr", undefined, [val("m:type", "noBar")])] : []),
          arg("m:num", [children[0]]),
          scriptArg("m:den", children[1]),
        ]),
      ];
    }

    case "msqrt":
      return [
        el("m:rad", undefined, [
          el("m:radPr", undefined, [val("m:degHide", "1")]),
          el("m:deg"),
          arg("m:e", children),
        ]),
      ];

    case "mroot": {
      requireBase(element, children);
      // An empty degree is hidden, so Word doesn't render a placeholder box.
      const degree = scriptArg("m:deg", children[1]);
      return [
        el("m:rad", undefined, [
          ...(degree.children.length === 0
            ? [el("m:radPr", undefined, [val("m:degHide", "1")])]
            : []),
          degree,
          arg("m:e", [children[0]]),
        ]),
      ];
    }

    case "msub": {
      requireBase(element, children);
      return [
        el("m:sSub", undefined, [
          arg("m:e", [children[0]]),
          scriptArg("m:sub", children[1]),
        ]),
      ];
    }

    case "msup": {
      requireBase(element, children);
      return [
        el("m:sSup", undefined, [
          arg("m:e", [children[0]]),
          scriptArg("m:sup", children[1]),
        ]),
      ];
    }

    case "msubsup": {
      requireBase(element, children);
      return [
        el("m:sSubSup", undefined, [
          arg("m:e", [children[0]]),
          scriptArg("m:sub", children[1]),
          scriptArg("m:sup", children[2]),
        ]),
      ];
    }

    case "munder":
    case "mover":
      requireBase(element, children);
      return [convertUnderOver(element, children[0], children[1])];

    case "munderover":
      requireBase(element, children);
      // Compose as an upper limit around a lower limit.
      return [
        el("m:limUpp", undefined, [
          el("m:e", undefined, [
            el("m:limLow", undefined, [
              arg("m:e", [children[0]]),
              scriptArg("m:lim", children[1]),
            ]),
          ]),
          scriptArg("m:lim", children[2]),
        ]),
      ];

    case "mtable":
      return [convertTable(element, children)];

    case "menclose":
      return convertEnclose(element, children);

    case "mphantom":
      return [
        el("m:phant", undefined, [
          el("m:phantPr", undefined, [val("m:show", "0")]),
          arg("m:e", children),
        ]),
      ];

    case "merror":
      // No OMML equivalent for error styling; keep the content.
      return convertNodes(children);

    case "maction": {
      // Action types are interactive and have no OMML equivalent; MathML's
      // default rendering is the first child.
      const first = children.find(isElement);
      return first ? convertNodes([first]) : [];
    }

    case "maligngroup":
    case "malignmark":
      // Alignment markers have no OMML equivalent.
      return [];

    case "mfenced": {
      // Deprecated in MathML Core but still emitted by some tools; expands
      // to a delimiter object with one argument per child.
      const openingCharacter = element.attributes.open ?? "(";
      const closingCharacter = element.attributes.close ?? ")";
      const separators = Array.from(
        (element.attributes.separators ?? ",").replace(/\s+/g, ""),
      );
      const properties: OmmlElement[] = [];
      if (openingCharacter !== "(") {
        properties.push(val("m:begChr", openingCharacter));
      }
      // OMML delimiters have a single separator character; MathML's
      // per-position separator list degrades to its first entry. The OMML
      // default is "|".
      if (children.length > 1 && (separators[0] ?? "") !== "|") {
        properties.push(val("m:sepChr", separators[0] ?? ""));
      }
      if (closingCharacter !== ")") {
        properties.push(val("m:endChr", closingCharacter));
      }
      return [
        el("m:d", undefined, [
          ...(properties.length > 0
            ? [el("m:dPr", undefined, properties)]
            : []),
          ...(children.length > 0
            ? children.map((child) => arg("m:e", [child]))
            : [el("m:e")]),
        ]),
      ];
    }

    case "mmultiscripts":
      return convertMultiscripts(children);

    default:
      throw new UnsupportedMathMLError(
        `Unsupported MathML element: <${element.name}>`,
      );
  }
}

const isFence = (node: XmlNode | undefined): node is XmlElement =>
  node !== undefined &&
  isElement(node) &&
  node.name === "mo" &&
  node.attributes.fence === "true";

/**
 * Converts a row of content. A row whose first and/or last child is a fence
 * operator (`\left`/`\right`, matrix environments) becomes a delimiter
 * object (`m:d`); a one-sided fence hides the other delimiter, matching
 * `\left.`/`\right.` and `cases`-style environments.
 */
function convertRow(children: XmlNode[]): OmmlNode[] {
  const opening =
    children.length > 1 && isFence(children[0]) ? children[0] : null;
  const last = children[children.length - 1];
  const closing =
    children.length > (opening ? 2 : 1) && isFence(last) ? last : null;
  if (!opening && !closing) {
    return convertNodes(children);
  }

  const inner = children.slice(
    opening ? 1 : 0,
    closing ? children.length - 1 : children.length,
  );
  const openingCharacter = opening ? (simpleText(opening) ?? "").trim() : "";
  const closingCharacter = closing ? (simpleText(closing) ?? "").trim() : "";

  const properties: OmmlElement[] = [];
  // OMML delimiter defaults: "(" and ")".
  if (openingCharacter !== "(") {
    properties.push(val("m:begChr", openingCharacter));
  }
  if (closingCharacter !== ")") {
    properties.push(val("m:endChr", closingCharacter));
  }
  return [
    el("m:d", undefined, [
      ...(properties.length > 0 ? [el("m:dPr", undefined, properties)] : []),
      el("m:e", undefined, convertNodes(inner)),
    ]),
  ];
}

function convertToken(element: XmlElement, children: XmlNode[]): OmmlNode[] {
  // KaTeX nests element structures inside token elements (e.g. `\overset`
  // wraps an <mover> in an <mo>); treat such tokens as transparent.
  if (children.some(isElement)) {
    return convertNodes(children);
  }
  const raw = simpleText(element) ?? "";
  if (element.name === "ms" || element.name === "mtext") {
    let text = raw;
    if (element.name === "ms") {
      // String literals render as quoted normal text.
      text = `${element.attributes.lquote ?? '"'}${raw}${element.attributes.rquote ?? '"'}`;
    } else if (raw.length === 0) {
      return [];
    }
    // Normal-text runs carry bold/italic as WordprocessingML run
    // properties; other variants fall back to character remapping.
    const options: RunOptions = { normalText: true };
    switch (element.attributes.mathvariant) {
      case undefined:
      case "normal":
        break;
      case "bold":
        options.wordBold = true;
        options.style = "b";
        break;
      case "italic":
        options.wordItalic = true;
        break;
      case "bold-italic":
        options.wordBold = true;
        options.wordItalic = true;
        options.style = "bi";
        break;
      default:
        text = applyMathVariant(text, element.attributes.mathvariant).text;
    }
    return [run(text, options)];
  }
  const text = raw.trim();
  if (text.length === 0 || INVISIBLE_OPERATORS.has(text)) {
    return [];
  }
  const variant = applyMathVariant(text, element.attributes.mathvariant);
  let style = variant.style;
  // Multi-letter identifiers (function names such as "sin" or "lim") render
  // upright by mathematical convention.
  if (!style && element.name === "mi" && /^[A-Za-z]{2,}$/.test(variant.text)) {
    style = "p";
  }
  return [run(variant.text, { style })];
}

function convertSpace(element: XmlElement): OmmlNode[] {
  let width = parseFloat(element.attributes.width ?? "");
  if (!Number.isFinite(width) || width <= 0) {
    return [];
  }
  // Approximate the requested em width with fixed-width space characters.
  let spaces = "";
  while (width >= 0.95) {
    spaces += "\u2003"; // em space
    width -= 1;
  }
  if (width >= 0.4) {
    spaces += "\u2002"; // en space
  } else if (width >= 0.05) {
    spaces += "\u2009"; // thin space
  }
  return spaces.length === 0 ? [] : [run(spaces)];
}

function convertUnderOver(
  element: XmlElement,
  base: XmlNode,
  script: XmlNode | undefined,
): OmmlElement {
  const over = element.name === "mover";
  const scriptElement = script === undefined ? undefined : unwrap(script);
  const character =
    scriptElement !== undefined &&
    isElement(scriptElement) &&
    scriptElement.name === "mo"
      ? (simpleText(scriptElement) ?? "").trim()
      : "";
  const stretchy =
    scriptElement !== undefined &&
    isElement(scriptElement) &&
    scriptElement.attributes.stretchy === "true";

  // ⏞/⏟ group characters (over/underbrace).
  if ((over ? GROUP_CHARACTERS_OVER : GROUP_CHARACTERS_UNDER).has(character)) {
    return el("m:groupChr", undefined, [
      el("m:groupChrPr", undefined, [
        val("m:chr", character),
        val("m:pos", over ? "top" : "bot"),
        val("m:vertJc", over ? "bot" : "top"),
      ]),
      arg("m:e", [base]),
    ]);
  }

  // Stretchy over/underline (`\overline`, `\underline`).
  if (stretchy && BAR_CHARACTERS.has(character)) {
    return el("m:bar", undefined, [
      el("m:barPr", undefined, [val("m:pos", over ? "top" : "bot")]),
      arg("m:e", [base]),
    ]);
  }

  // Combining accents (`\hat`, `\vec`, ...). Only `mover` — OMML has no
  // under-accent, so accented `munder` falls through to a lower limit. Some
  // emitters omit `accent="true"`, so a recognizable non-stretchy accent
  // character also qualifies.
  if (
    over &&
    (element.attributes.accent === "true" ||
      (!stretchy &&
        (ACCENT_CHARACTERS[character] !== undefined ||
          isCombiningMark(character))))
  ) {
    const accent = ACCENT_CHARACTERS[character] ?? character;
    return el("m:acc", undefined, [
      el("m:accPr", undefined, [val("m:chr", accent || "\u0302")]),
      arg("m:e", [base]),
    ]);
  }

  return el(over ? "m:limUpp" : "m:limLow", undefined, [
    arg("m:e", [base]),
    scriptArg("m:lim", script),
  ]);
}

function convertTable(element: XmlElement, children: XmlNode[]): OmmlElement {
  const rows: XmlElement[][] = children.map((row) => {
    if (!isElement(row) || row.name !== "mtr") {
      throw new UnsupportedMathMLError(
        "Expected <mtable> to contain only <mtr> rows",
      );
    }
    return contentNodes(row).map((cell) => {
      if (!isElement(cell) || cell.name !== "mtd") {
        throw new UnsupportedMathMLError(
          "Expected <mtr> to contain only <mtd> cells",
        );
      }
      return cell;
    });
  });
  const columnCount = Math.max(1, ...rows.map((cells) => cells.length));

  const alignments = (element.attributes.columnalign ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((alignment) =>
      alignment === "left" || alignment === "right" ? alignment : "center",
    );

  // Column specification: one entry when all columns align the same way,
  // one per column otherwise.
  let columnSpec: OmmlElement | null = null;
  if (alignments.length > 0) {
    const uniform = alignments.every(
      (alignment) => alignment === alignments[0],
    );
    const columns = uniform
      ? [
          el("m:mc", undefined, [
            el("m:mcPr", undefined, [
              val("m:count", String(columnCount)),
              val("m:mcJc", alignments[0]),
            ]),
          ]),
        ]
      : Array.from({ length: columnCount }, (_, index) =>
          el("m:mc", undefined, [
            el("m:mcPr", undefined, [
              val("m:count", "1"),
              val("m:mcJc", alignments[Math.min(index, alignments.length - 1)]),
            ]),
          ]),
        );
    columnSpec = el("m:mPr", undefined, [el("m:mcs", undefined, columns)]);
  }

  return el("m:m", undefined, [
    ...(columnSpec ? [columnSpec] : []),
    ...rows.map((cells) =>
      el("m:mr", undefined, [
        ...cells.map((cell) =>
          el("m:e", undefined, convertNodes(contentNodes(cell))),
        ),
        // Pad ragged rows so the matrix stays rectangular.
        ...Array.from({ length: columnCount - cells.length }, () => el("m:e")),
      ]),
    ),
  ]);
}

function convertEnclose(element: XmlElement, children: XmlNode[]): OmmlNode[] {
  const notations = new Set(
    (element.attributes.notation ?? "").trim().split(/\s+/).filter(Boolean),
  );
  // OMML has no rounded corners; a rounded box degrades to a plain one.
  const box = notations.has("box") || notations.has("roundedbox");
  const sides = {
    top: notations.has("top"),
    bottom: notations.has("bottom"),
    left: notations.has("left"),
    right: notations.has("right"),
  };
  const hasSides = sides.top || sides.bottom || sides.left || sides.right;
  const strikes: OmmlElement[] = [];
  if (notations.has("horizontalstrike")) {
    strikes.push(val("m:strikeH", "1"));
  }
  if (notations.has("verticalstrike")) {
    strikes.push(val("m:strikeV", "1"));
  }
  if (notations.has("updiagonalstrike")) {
    strikes.push(val("m:strikeBLTR", "1"));
  }
  if (notations.has("downdiagonalstrike")) {
    strikes.push(val("m:strikeTLBR", "1"));
  }
  if (!box && !hasSides && strikes.length === 0) {
    // Unsupported decoration (circles, arrows, ...): keep the content.
    return convertNodes(children);
  }

  // A full box shows all borders; individual sides hide the others; a pure
  // strike hides all of them.
  const properties: OmmlElement[] = [];
  if (!box) {
    if (!sides.top) {
      properties.push(val("m:hideTop", "1"));
    }
    if (!sides.bottom) {
      properties.push(val("m:hideBot", "1"));
    }
    if (!sides.left) {
      properties.push(val("m:hideLeft", "1"));
    }
    if (!sides.right) {
      properties.push(val("m:hideRight", "1"));
    }
  }
  properties.push(...strikes);
  return [
    el("m:borderBox", undefined, [
      ...(properties.length > 0
        ? [el("m:borderBoxPr", undefined, properties)]
        : []),
      arg("m:e", children),
    ]),
  ];
}

/**
 * `mmultiscripts`: a base followed by (subscript, superscript) pairs, and —
 * after an `mprescripts` marker — (presubscript, presuperscript) pairs.
 * Postscript pairs chain as `m:sSub`/`m:sSup`/`m:sSubSup` (skipping `none`
 * placeholders); prescript pairs wrap the result in `m:sPre`.
 */
function convertMultiscripts(children: XmlNode[]): OmmlNode[] {
  if (children.length === 0) {
    throw new UnsupportedMathMLError("Expected <mmultiscripts> to have a base");
  }
  const isMarker = (node: XmlNode, name: string): boolean =>
    isElement(node) && node.name === name;
  const prescriptsIndex = children.findIndex((child) =>
    isMarker(child, "mprescripts"),
  );
  const postScripts = children.slice(
    1,
    prescriptsIndex === -1 ? children.length : prescriptsIndex,
  );
  const preScripts =
    prescriptsIndex === -1 ? [] : children.slice(prescriptsIndex + 1);
  // `none` placeholders and missing trailing scripts (an odd pair — see
  // `requireBase` for the arity policy) count as absent.
  const presentScript = (node: XmlNode | undefined): XmlNode | null =>
    node === undefined || isMarker(node, "none") ? null : node;

  let result: OmmlNode[] = convertNodes([children[0]]);
  for (let index = 0; index < postScripts.length; index += 2) {
    const subscript = presentScript(postScripts[index]);
    const superscript = presentScript(postScripts[index + 1]);
    const base = el("m:e", undefined, result);
    if (subscript && superscript) {
      result = [
        el("m:sSubSup", undefined, [
          base,
          arg("m:sub", [subscript]),
          arg("m:sup", [superscript]),
        ]),
      ];
    } else if (subscript) {
      result = [el("m:sSub", undefined, [base, arg("m:sub", [subscript])])];
    } else if (superscript) {
      result = [el("m:sSup", undefined, [base, arg("m:sup", [superscript])])];
    }
  }
  for (let index = 0; index < preScripts.length; index += 2) {
    const subscript = presentScript(preScripts[index]);
    const superscript = presentScript(preScripts[index + 1]);
    if (!subscript && !superscript) {
      continue;
    }
    result = [
      el("m:sPre", undefined, [
        el("m:sub", undefined, subscript ? convertNodes([subscript]) : []),
        el("m:sup", undefined, superscript ? convertNodes([superscript]) : []),
        el("m:e", undefined, result),
      ]),
    ];
  }
  return result;
}

const containsLetter = (text: string): boolean => /[A-Za-zΑ-ω]/.test(text);

interface RunOptions {
  style?: OmmlRunStyle;
  normalText?: boolean;
  wordBold?: boolean;
  wordItalic?: boolean;
}

const makeText = (text: string): OmmlElement =>
  el("m:t", text === text.trim() ? undefined : { "xml:space": "preserve" }, [
    { text },
  ]);

function run(text: string, options: RunOptions = {}): OmmlElement {
  const children: OmmlNode[] = [];
  // Bold/italic on normal text uses WordprocessingML run properties.
  // `w:rPr` before `m:rPr` mirrors reference converter output.
  if (options.wordBold || options.wordItalic) {
    children.push(
      el("w:rPr", undefined, [
        ...(options.wordBold ? [el("w:b")] : []),
        ...(options.wordItalic ? [el("w:i")] : []),
      ]),
    );
  }
  const properties: OmmlElement[] = [];
  if (options.normalText) {
    properties.push(el("m:nor"));
  }
  // Note: ECMA-376 treats `m:nor` and `m:sty` as alternatives, but Word
  // accepts both together and reference converters emit both for bold
  // normal text — keep that shape (the conformance corpus relies on it).
  if (options.style && (options.normalText || containsLetter(text))) {
    properties.push(val("m:sty", options.style));
  }
  if (properties.length > 0) {
    children.push(el("m:rPr", undefined, properties));
  }
  children.push(makeText(text));
  return el("m:r", undefined, children);
}

const isRun = (node: OmmlNode): node is OmmlElement =>
  isOmmlElement(node) && node.name === "m:r";

const runProperties = (node: OmmlElement): string =>
  node.children
    .filter((child) => !isOmmlElement(child) || child.name !== "m:t")
    .map(serializeOmml)
    .join("");

const runText = (node: OmmlElement): string => {
  const textElement = node.children.find(
    (child): child is OmmlElement =>
      isOmmlElement(child) && child.name === "m:t",
  );
  return (
    textElement?.children
      .map((child) => (isOmmlElement(child) ? "" : child.text))
      .join("") ?? ""
  );
};

/**
 * Merges adjacent runs with identical properties into a single run, the way
 * Word itself serializes math (e.g. one `<m:t>j=1</m:t>` run instead of
 * three).
 */
function mergeAdjacentRuns(element: OmmlElement): void {
  for (const child of element.children) {
    if (isOmmlElement(child)) {
      mergeAdjacentRuns(child);
    }
  }
  const merged: OmmlNode[] = [];
  for (const child of element.children) {
    const previous = merged[merged.length - 1];
    if (
      previous !== undefined &&
      isRun(child) &&
      isRun(previous) &&
      runProperties(child) === runProperties(previous)
    ) {
      const properties = previous.children.filter(
        (node) => isOmmlElement(node) && node.name !== "m:t",
      );
      previous.children = [
        ...properties,
        makeText(runText(previous) + runText(child)),
      ];
    } else {
      merged.push(child);
    }
  }
  element.children = merged;
}

const usesWordNamespace = (nodes: OmmlNode[]): boolean =>
  nodes.some(
    (node) =>
      isOmmlElement(node) &&
      (node.name.startsWith("w:") || usesWordNamespace(node.children)),
  );
