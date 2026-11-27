import { escapeHtml } from "../../../util/escapeHtml.js";
import { isVideoUrl } from "../../../util/string.js";
import { findLinks } from "../../../extensions/tiptap-extensions/Link/helpers/linkDetector.js";
import { parseAutolinkLiteral } from "./autolink.js";

/**
 * Custom markdown-to-HTML converter for BlockNote.
 * Replaces the unified/remark/rehype pipeline with a direct, minimal implementation
 * that handles exactly the markdown features BlockNote needs.
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isAlphanumeric(char: string | undefined): boolean {
  if (!char) {
    return false;
  }
  return /\w/.test(char);
}

/**
 * Returns true when an underscore delimiter at position `i` is "intraword",
 * meaning the characters on both sides are alphanumeric (e.g. `snake_case`).
 * In that case the underscore should NOT be treated as emphasis per CommonMark.
 */
function isIntraword(text: string, i: number, delimLen: number): boolean {
  const before = i > 0 ? text[i - 1] : undefined;
  const after = i + delimLen < text.length ? text[i + delimLen] : undefined;
  return isAlphanumeric(before) && isAlphanumeric(after);
}

// ─── Inline Parser ───────────────────────────────────────────────────────────

type InlineTokenizer = (
  text: string,
  i: number,
  allowLinks: boolean,
) => { html: string; end: number } | null;

/** The characters that a backslash escapes. */
const ESCAPABLE_CHARACTERS = "\\`*_{}[]()#+-.!~|<>";

function skipIndent(text: string, i: number): number {
  while (text[i] === " " || text[i] === "\t") {
    i++;
  }
  return i;
}

function tryBackslashEscape(
  text: string,
  i: number,
): { html: string; end: number } | null {
  if (text[i] !== "\\" || i + 1 >= text.length) {
    return null;
  }
  const next = text[i + 1];
  // Hard line break: backslash at end of line. No newline follows the `<br>`:
  // the HTML parser reads that newline as a space at the start of the next
  // line.
  if (next === "\n") {
    return { html: "<br>", end: skipIndent(text, i + 2) };
  }
  // Escapable characters
  if (ESCAPABLE_CHARACTERS.includes(next)) {
    return { html: escapeHtml(next), end: i + 2 };
  }
  return null;
}

function tryInlineCode(
  text: string,
  i: number,
): { html: string; end: number } | null {
  if (text[i] !== "`") {
    return null;
  }
  const backticks = /`+/g;
  backticks.lastIndex = i;
  const opening = backticks.exec(text)![0];
  const codeStart = backticks.lastIndex;

  for (
    let closing = backticks.exec(text);
    closing;
    closing = backticks.exec(text)
  ) {
    if (closing[0].length !== opening.length) {
      continue;
    }

    // A code span keeps indentation after a newline; only the newline itself
    // becomes a space. Trim one space from each end unless it is all spaces.
    let code = text.slice(codeStart, closing.index).replace(/\n/g, " ");
    if (code.startsWith(" ") && code.endsWith(" ") && /[^ ]/.test(code)) {
      code = code.slice(1, -1);
    }
    return {
      html: `<code>${escapeHtml(code)}</code>`,
      end: backticks.lastIndex,
    };
  }

  // Consume the whole unmatched run so a suffix cannot become another opener.
  return { html: opening, end: codeStart };
}

function tryImage(
  text: string,
  i: number,
): { html: string; end: number } | null {
  if (text[i] !== "!" || text[i + 1] !== "[") {
    return null;
  }
  return parseImage(text, i);
}

function tryLink(
  text: string,
  i: number,
): { html: string; end: number } | null {
  if (text[i] !== "[") {
    return null;
  }
  return parseLink(text, i);
}

function tryAutolink(
  text: string,
  i: number,
): { html: string; end: number } | null {
  const rest = text.substring(i);

  // CommonMark autolinks: <scheme:destination> and <email@example.com>.
  if (text[i] === "<") {
    const urlMatch = rest.match(/^<([a-zA-Z][a-zA-Z0-9+.-]{1,31}:[^\s<>]*)>/);
    if (urlMatch) {
      const url = urlMatch[1];
      return {
        html: `<a href="${escapeHtml(url)}">${escapeHtml(url)}</a>`,
        end: i + urlMatch[0].length,
      };
    }

    const emailMatch = rest.match(/^<([^\s<>]+)>/);
    const email = emailMatch?.[1];
    const detectedEmail = email
      ? findLinks(email).find(
          (match) =>
            match.type === "email" &&
            match.start === 0 &&
            match.end === email.length,
        )
      : undefined;
    if (emailMatch && email && detectedEmail) {
      return {
        html: `<a href="${escapeHtml(detectedEmail.href)}">${escapeHtml(email)}</a>`,
        end: i + emailMatch[0].length,
      };
    }

    return null;
  }

  // GFM autolink literals. Only start at a word boundary, so URL-like text
  // embedded in a larger word remains plain text.
  if (i > 0 && /[a-zA-Z0-9_]/.test(text[i - 1])) {
    return null;
  }

  const literalMatch = rest.match(/^(https?:\/\/|www\.)[^\s<>]+/i);
  if (!literalMatch) {
    return null;
  }

  const autolink = parseAutolinkLiteral(literalMatch[0]);
  if (!autolink) {
    return null;
  }

  return {
    html: `<a href="${escapeHtml(autolink.href)}">${escapeHtml(autolink.value)}</a>`,
    end: i + autolink.value.length,
  };
}

function tryStrikethrough(
  text: string,
  i: number,
  allowLinks: boolean,
): { html: string; end: number } | null {
  if (text[i] !== "~" || text[i + 1] !== "~") {
    return null;
  }
  return parseDelimited(text, i, "~~", "<del>", "</del>", allowLinks);
}

function tryBoldItalic(
  text: string,
  i: number,
  allowLinks: boolean,
): { html: string; end: number } | null {
  if (
    (text[i] === "*" && text[i + 1] === "*" && text[i + 2] === "*") ||
    (text[i] === "_" &&
      text[i + 1] === "_" &&
      text[i + 2] === "_" &&
      !isIntraword(text, i, 3))
  ) {
    const delimiter = text.substring(i, i + 3);
    return parseDelimited(
      text,
      i,
      delimiter,
      "<strong><em>",
      "</em></strong>",
      allowLinks,
    );
  }
  return null;
}

function tryBold(
  text: string,
  i: number,
  allowLinks: boolean,
): { html: string; end: number } | null {
  if (
    (text[i] === "*" && text[i + 1] === "*") ||
    (text[i] === "_" && text[i + 1] === "_" && !isIntraword(text, i, 2))
  ) {
    const delimiter = text.substring(i, i + 2);
    return parseDelimited(
      text,
      i,
      delimiter,
      "<strong>",
      "</strong>",
      allowLinks,
    );
  }
  return null;
}

function tryItalic(
  text: string,
  i: number,
  allowLinks: boolean,
): { html: string; end: number } | null {
  if (text[i] === "*" || (text[i] === "_" && !isIntraword(text, i, 1))) {
    return parseDelimited(text, i, text[i], "<em>", "</em>", allowLinks);
  }
  return null;
}

// Inline raw HTML: pass through tags, comments, CDATA, processing
// instructions, and declarations verbatim so authors can mix HTML into
// markdown (e.g. `text <em>foo</em> more`). Anything that doesn't match
// these shapes falls through and gets HTML-escaped as plain text.
const INLINE_HTML_TAG_RE =
  /^<\/?[a-zA-Z][a-zA-Z0-9-]*(?:\s+[a-zA-Z_:][a-zA-Z0-9_.:-]*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*\s*\/?>/;
const HTML_COMMENT_RE = /^<!--[\s\S]*?-->/;
const HTML_CDATA_RE = /^<!\[CDATA\[[\s\S]*?\]\]>/;
const HTML_PI_RE = /^<\?[\s\S]*?\?>/;
const HTML_DECL_RE = /^<![A-Za-z][\s\S]*?>/;

function tryInlineHtml(
  text: string,
  i: number,
): { html: string; end: number } | null {
  if (text[i] !== "<") {
    return null;
  }
  const rest = text.substring(i);
  for (const re of [
    HTML_COMMENT_RE,
    HTML_CDATA_RE,
    HTML_PI_RE,
    HTML_DECL_RE,
    INLINE_HTML_TAG_RE,
  ]) {
    const m = rest.match(re);
    if (m) {
      return { html: m[0], end: i + m[0].length };
    }
  }
  return null;
}

/** Characters that can start an inline syntax token. */
const SPECIAL_CHARS = new Set("\\`![~*_\n<");

function canStartInlineToken(text: string, position: number): boolean {
  const char = text[position];
  if (SPECIAL_CHARS.has(char)) {
    return true;
  }
  if (char === "h") {
    return (
      text.startsWith("http://", position) ||
      text.startsWith("https://", position)
    );
  }
  if (char === "w") {
    return text.startsWith("www.", position);
  }
  return false;
}

/**
 * Ordered array of inline tokenizers, tried in priority order.
 * The first match wins.
 */
const inlineTokenizers: InlineTokenizer[] = [
  tryBackslashEscape,
  tryInlineCode,
  tryImage,
  tryLink,
  tryAutolink,
  tryStrikethrough,
  tryBoldItalic, // *** / ___
  tryBold, // ** / __
  tryItalic, // * / _
  tryInlineHtml,
];

const linkTextTokenizers = inlineTokenizers.filter(
  (tokenizer) => tokenizer !== tryLink && tokenizer !== tryAutolink,
);

/**
 * Parse inline markdown syntax and return HTML.
 * Handles: bold, italic, bold+italic, strikethrough, inline code,
 * links, images (with video detection), hard line breaks, backslash escapes.
 */
function parseInline(text: string, allowLinks = true): string {
  let result = "";
  let i = 0;
  const tokenizers = allowLinks ? inlineTokenizers : linkTextTokenizers;

  while (i < text.length) {
    // BlockNote renders both soft breaks and hard breaks as <br>. An inline
    // code span consumes its own newlines before they reach this branch.
    if (text[i] === "\n") {
      if (text[i - 1] === " " && text[i - 2] === " ") {
        result = result.replace(/ +$/, "");
      }
      result += "<br>";
      i = skipIndent(text, i + 1);
      continue;
    }

    // Try each tokenizer in priority order
    let matched = false;
    if (canStartInlineToken(text, i)) {
      for (const tokenizer of tokenizers) {
        const r = tokenizer(text, i, allowLinks);
        if (r) {
          result += r.html;
          i = r.end;
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      // Batch consecutive plain-text characters and escape once
      const runStart = i;
      i++;
      while (i < text.length && !canStartInlineToken(text, i)) {
        i++;
      }
      result += escapeHtml(text.substring(runStart, i));
    }
  }

  return result;
}

function parseImage(
  text: string,
  start: number,
): { html: string; end: number } | null {
  const resource = findResource(text, start + 1);
  if (!resource) {
    return null;
  }

  const alt = removeBackslashEscapes(text.slice(start + 2, resource.labelEnd));
  const { url, title } = parseDestinationAndTitle(
    text.slice(resource.labelEnd + 2, resource.end - 1),
    "media",
  );

  if (isVideoUrl(url)) {
    // Use the alt text as the video's display name (falling back to the
    // title) so a video link written with the standard `![name](url)` form
    // round-trips into BlockNote's video block. Captioned videos go through
    // raw `<figure>` HTML instead, see htmlToMarkdown.serializeMediaFigure.
    const name = alt || title;
    return {
      html: `<video src="${escapeHtml(url)}"${name ? ` data-name="${escapeHtml(name)}"` : ""} data-url="${escapeHtml(url)}" controls></video>`,
      end: resource.end,
    };
  }

  const titleAttr = title !== undefined ? ` title="${escapeHtml(title)}"` : "";
  return {
    html: `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}"${titleAttr}>`,
    end: resource.end,
  };
}

function parseLink(
  text: string,
  start: number,
): { html: string; end: number } | null {
  const resource = findResource(text, start);
  if (!resource) {
    return null;
  }

  const linkText = text.slice(start + 1, resource.labelEnd);
  const { url, title } = parseDestinationAndTitle(
    text.slice(resource.labelEnd + 2, resource.end - 1),
    "link",
  );

  const titleAttr = title !== undefined ? ` title="${escapeHtml(title)}"` : "";
  return {
    html: `<a href="${escapeHtml(url)}"${titleAttr}>${parseInline(linkText, false)}</a>`,
    end: resource.end,
  };
}

function findResource(text: string, open: number) {
  const labelEnd = findClosingBracket(text, open);
  if (labelEnd === -1 || text[labelEnd + 1] !== "(") {
    return null;
  }
  const destinationEnd = findLinkEnd(text, labelEnd + 2);
  return destinationEnd === -1 ? null : { labelEnd, end: destinationEnd + 1 };
}

function findClosingBracket(text: string, openPos: number): number {
  let depth = 0;
  for (let i = openPos; i < text.length; i++) {
    if (text[i] === "\\" && i + 1 < text.length) {
      i++; // skip escaped
      continue;
    }
    if (text[i] === "[") {
      depth++;
    }
    if (text[i] === "]") {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}

const LINK_TITLE = /^"([^"]*)"$|^'([^']*)'$|^\(([^)]*)\)$/;
const LINK_END = /^\s*(?:(?:"[^"]*"|'[^']*'|\([^)]*\))\s*)?\)/;

function findLinkEnd(text: string, start: number): number {
  let destStart = start;
  while (/\s/.test(text[destStart] ?? "")) {
    destStart++;
  }
  if (text[destStart] === "<") {
    const angleEnd = findClosingAngle(text, destStart);
    if (angleEnd !== -1) {
      const end = text.slice(angleEnd + 1).match(LINK_END);
      if (end) {
        return angleEnd + end[0].length;
      }
    }
  }
  // If the angle form is incomplete, still accept the older lenient syntax.
  return findClosingParen(text, start);
}

function findClosingParen(text: string, start: number): number {
  let depth = 1;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "\\" && i + 1 < text.length) {
      i++;
      continue;
    }
    if (depth === 1 && /\s/.test(text[i])) {
      const end = text.slice(i).match(LINK_END);
      if (end) {
        return i + end[0].length - 1;
      }
    }
    if (text[i] === "(") {
      depth++;
    }
    if (text[i] === ")") {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}

function findClosingAngle(
  text: string,
  openPos: number,
  allowInnerAngle = false,
): number {
  for (let i = openPos + 1; i < text.length; i++) {
    if (text[i] === "\n" || (text[i] === "\\" && text[i + 1] === "\n")) {
      return -1;
    }
    if (text[i] === "\\" && i + 1 < text.length) {
      i++;
    } else if (text[i] === ">") {
      return i;
    } else if (text[i] === "<" && !allowInnerAngle) {
      return -1;
    }
  }
  return -1;
}

/**
 * Parse the inside of `(...)` from a link/image (the URL and optional title).
 * Handles two URL forms:
 *   - bare:           `/uri` or `/uri "title"`
 *   - angle-bracket:  `<url>` or `<url> "title"` (brackets are stripped)
 * And three title-quote forms:  `"..."`, `'...'`, `(...)`.
 */
function parseDestinationAndTitle(
  raw: string,
  kind: "link" | "media",
): {
  url: string;
  title?: string;
} {
  raw = raw.trim();
  let url: string;
  let rest: string;

  if (raw.startsWith("<")) {
    const close = findClosingAngle(raw, 0, true);
    if (close === -1) {
      // Unmatched `<` — treat the whole thing as the URL minus the `<`.
      url = raw.substring(1);
      rest = "";
    } else {
      url = raw.substring(1, close);
      rest = raw.substring(close + 1).trim();
    }
  } else {
    // Split at first unescaped whitespace.
    let split = raw.length;
    for (let i = 0; i < raw.length; i++) {
      if (raw[i] === "\\" && i + 1 < raw.length) {
        i++;
        continue;
      }
      if (raw[i] === " " || raw[i] === "\t" || raw[i] === "\n") {
        split = i;
        break;
      }
    }
    url = raw.substring(0, split);
    rest = raw.substring(split).trim();
  }

  const title = rest.match(LINK_TITLE);
  // Older exports left Windows media paths bare, with literal backslashes.
  const isLegacyWindowsPath =
    kind === "media" && !raw.startsWith("<") && /^(?:[a-z]:\\|\\\\)/i.test(url);
  return {
    url: isLegacyWindowsPath ? url : removeBackslashEscapes(url),
    title: title?.[1] ?? title?.[2] ?? title?.[3],
  };
}

/**
 * Link destinations recognize the same escaped punctuation as inline text.
 */
function removeBackslashEscapes(text: string): string {
  return text.replace(/\\(.)/g, (match, char: string) =>
    ESCAPABLE_CHARACTERS.includes(char) ? char : match,
  );
}

function parseDelimited(
  text: string,
  start: number,
  delimiter: string,
  openTag: string,
  closeTag: string,
  allowLinks: boolean,
): { html: string; end: number } | null {
  const len = delimiter.length;
  const afterOpen = start + len;

  if (afterOpen >= text.length) {
    return null;
  }

  // Opening delimiter must not be followed by whitespace
  if (text[afterOpen] === " " || text[afterOpen] === "\t") {
    return null;
  }

  // Find closing delimiter
  let j = afterOpen;
  while (j < text.length) {
    // Skip escaped characters
    if (text[j] === "\\" && j + 1 < text.length) {
      j += 2;
      continue;
    }

    // A delimiter belongs to the token that contains it. In particular a
    // backtick in a destination or HTML attribute cannot open a code span.
    const token =
      tryInlineCode(text, j) ??
      (text[j] === "<"
        ? ((allowLinks ? tryAutolink(text, j) : null) ?? tryInlineHtml(text, j))
        : text[j] === "!" && text[j + 1] === "["
          ? findResource(text, j + 1)
          : allowLinks && text[j] === "["
            ? findResource(text, j)
            : null);
    if (token) {
      j = token.end;
      continue;
    }

    if (text.substring(j, j + len) === delimiter) {
      // Closing delimiter must not be preceded by whitespace
      if (text[j - 1] === " " || text[j - 1] === "\t") {
        j++;
        continue;
      }

      // For single-char delimiters, don't accept closer if it's part of a
      // multi-char run (e.g., don't treat the * in ** as italic closer)
      if (
        len === 1 &&
        ((j > 0 &&
          text[j - 1] === delimiter[0] &&
          !(j >= 2 && text[j - 2] === "\\")) ||
          (j + len < text.length && text[j + len] === delimiter[0]))
      ) {
        j++;
        continue;
      }

      const inner = text.substring(afterOpen, j);
      if (inner.length === 0) {
        j++;
        continue;
      }

      return {
        html: openTag + parseInline(inner, allowLinks) + closeTag,
        end: j + len,
      };
    }
    j++;
  }

  return null;
}

// ─── Block-Level Types ───────────────────────────────────────────────────────

interface BlockToken {
  type: string;
}

interface HeadingToken extends BlockToken {
  type: "heading";
  level: number;
  content: string;
}

interface ParagraphToken extends BlockToken {
  type: "paragraph";
  content: string;
}

interface CodeBlockToken extends BlockToken {
  type: "codeBlock";
  language: string;
  code: string;
}

interface BlockquoteToken extends BlockToken {
  type: "blockquote";
  children: Token[];
}

interface HorizontalRuleToken extends BlockToken {
  type: "hr";
}

interface ListItemToken extends BlockToken {
  type: "listItem";
  listType: "bullet" | "ordered" | "task";
  indent: number;
  content: string;
  start?: number; // for ordered lists
  checked?: boolean; // for task lists
  childContent?: string; // recursively parsed content within this item
}

interface TableToken extends BlockToken {
  type: "table";
  headers: string[];
  rows: string[][];
  alignments: ("left" | "center" | "right" | null)[];
}

interface RawHtmlToken extends BlockToken {
  type: "rawHtml";
  content: string;
}

type Token =
  | HeadingToken
  | ParagraphToken
  | CodeBlockToken
  | BlockquoteToken
  | HorizontalRuleToken
  | ListItemToken
  | TableToken
  | RawHtmlToken;

/**
 * HTML block-level tag names (from the CommonMark type-6 list, plus `audio`
 * which BlockNote serializes as raw HTML since markdown has no shorthand
 * for it). When a line starts with `<` followed by one of these tag names,
 * the run of non-blank lines is emitted verbatim as raw HTML rather than
 * wrapped in a paragraph.
 */
const HTML_BLOCK_TAGS = new Set([
  "address",
  "article",
  "aside",
  "audio",
  "base",
  "basefont",
  "blockquote",
  "body",
  "caption",
  "center",
  "col",
  "colgroup",
  "dd",
  "details",
  "dialog",
  "dir",
  "div",
  "dl",
  "dt",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "frame",
  "frameset",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hr",
  "html",
  "iframe",
  "legend",
  "li",
  "link",
  "main",
  "menu",
  "menuitem",
  "nav",
  "noframes",
  "ol",
  "optgroup",
  "option",
  "p",
  "param",
  "section",
  "source",
  "summary",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "title",
  "tr",
  "track",
  "ul",
]);

function isHtmlBlockStart(line: string): boolean {
  // <!-- ..., <?..., <![CDATA[..., <!DOCTYPE, etc.
  if (/^ {0,3}<(!--|\?|![A-Za-z]|!\[CDATA\[)/.test(line)) {
    return true;
  }
  const m = line.match(/^ {0,3}<\/?([a-zA-Z][a-zA-Z0-9-]*)(?:\s|\/?>|$)/);
  if (!m) {
    return false;
  }
  return HTML_BLOCK_TAGS.has(m[1].toLowerCase());
}

// ─── Block-Level Tokenizer ──────────────────────────────────────────────────

// A backtick fence's info string cannot contain backticks, unlike its tilde
// counterpart's. A line starting with a complete code span is therefore prose.
const CODE_FENCE_OPENING = /^ {0,3}(`{3,}(?=[^`]*$)|~{3,})(.*)$/;

function codeFenceClosing(fence: string): RegExp {
  return new RegExp(`^ {0,3}${fence[0]}{${fence.length},}\\s*$`);
}

function legacyCodeFence(lines: string[], start: number) {
  const opening = lines[start].match(/^ {0,3}(`{3,})([^`]*`.*)$/);
  if (!opening || /^ {0,3}`+.*`{3,}\s*$/.test(lines[start])) {
    return null;
  }
  // Older BlockNote exports allowed backticks in info strings. Recover
  // explicitly closed blocks without interpreting ordinary code spans as fences.
  const closing = codeFenceClosing(opening[1]);
  return lines.slice(start + 1).some((line) => closing.test(line))
    ? opening
    : null;
}

function quoteMarker(line: string): boolean {
  return /^ {0,3}>/.test(line);
}

function canContinueParagraph(line: string): boolean {
  return (
    line.trim() !== "" &&
    !/^(#{1,6})\s/.test(line) &&
    !CODE_FENCE_OPENING.test(line) &&
    !/^\s{0,3}>/.test(line) &&
    !/^(\s{0,3})([-*_])\s*(\2\s*){2,}$/.test(line) &&
    !/^\s*([-*+]|\d+[.)])\s+/.test(line) &&
    !/^\s*\|(.+\|)+\s*$/.test(line) &&
    !isHtmlBlockStart(line)
  );
}

function tokenize(markdown: string): Token[] {
  // A line ends with "\n", "\r\n" or "\r" (CommonMark). A file from Windows
  // has "\r\n".
  const lines = markdown.split(/\r\n?|\n/);
  const tokens: Token[] = [];
  let i = 0;
  let prevLineWasBlank = true; // treat start of document as after blank

  while (i < lines.length) {
    const line = lines[i];

    // Blank line — skip
    if (line.trim() === "") {
      prevLineWasBlank = true;
      i++;
      continue;
    }

    const fenceMatch =
      line.match(CODE_FENCE_OPENING) ??
      (prevLineWasBlank ? legacyCodeFence(lines, i) : null);
    if (fenceMatch) {
      const fence = fenceMatch[1];
      const closing = codeFenceClosing(fence);
      const language = fenceMatch[2].trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length) {
        if (closing.test(lines[i])) {
          i++;
          break;
        }
        codeLines.push(lines[i]);
        i++;
      }
      tokens.push({
        type: "codeBlock",
        language: language || "",
        code: codeLines.join("\n"),
      });
      prevLineWasBlank = false;
      continue;
    }

    // ATX Heading.
    // - Closing `#` sequence requires a preceding space (so `### foo###`
    //   keeps the trailing #s as text, while `### foo ###` strips them).
    // - Trailing whitespace is always stripped from the heading content.
    const headingMatch = line.match(/^(#{1,6})\s+(.+?)(?:\s+#+\s*|\s*)$/);
    if (headingMatch) {
      tokens.push({
        type: "heading",
        level: headingMatch[1].length,
        content: headingMatch[2],
      });
      prevLineWasBlank = false;
      i++;
      continue;
    }

    // Horizontal rule: ---, ***, ___ (3+ chars, optionally with spaces)
    if (/^(\s{0,3})([-*_])\s*(\2\s*){2,}$/.test(line)) {
      // Setext H2: --- immediately after a paragraph (no blank line between)
      const prevToken = tokens.at(-1);
      if (
        !prevLineWasBlank &&
        line.trim().match(/^-+$/) &&
        prevToken &&
        prevToken.type === "paragraph"
      ) {
        const para = prevToken as ParagraphToken;
        tokens[tokens.length - 1] = {
          type: "heading",
          level: 2,
          content: para.content,
        };
        prevLineWasBlank = false;
        i++;
        continue;
      }
      tokens.push({ type: "hr" });
      prevLineWasBlank = false;
      i++;
      continue;
    }

    // Setext heading detection: check if next line is === or ---
    if (i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      if (/^={1,}\s*$/.test(nextLine) && line.trim().length > 0) {
        tokens.push({
          type: "heading",
          level: 1,
          content: line.trim(),
        });
        prevLineWasBlank = false;
        i += 2;
        continue;
      }
      // Setext H2 --- handled in HR section above
    }

    // Table: detect by looking for separator row
    const tableResult = tryParseTable(lines, i);
    if (tableResult) {
      tokens.push(tableResult.token);
      i = tableResult.nextLine;
      prevLineWasBlank = false;
      continue;
    }

    // Blockquote
    if (quoteMarker(line)) {
      const quoteLines: string[] = [];
      let children: Token[];
      let hasUntokenizedContinuation: boolean;
      do {
        while (i < lines.length && quoteMarker(lines[i])) {
          quoteLines.push(lines[i++].replace(/^ {0,3}>[ \t]?/, ""));
        }
        children = tokenize(quoteLines.join("\n"));
        const beforeContinuation = i;
        // Only a paragraph can continue without the container marker.
        if (
          quoteLines.at(-1)?.trim() &&
          children.at(-1)?.type === "paragraph"
        ) {
          while (i < lines.length && canContinueParagraph(lines[i])) {
            quoteLines.push(lines[i++]);
          }
        }
        hasUntokenizedContinuation = i !== beforeContinuation;
      } while (i < lines.length && quoteMarker(lines[i]));
      if (hasUntokenizedContinuation) {
        children = tokenize(quoteLines.join("\n"));
      }
      tokens.push({ type: "blockquote", children });
      prevLineWasBlank = false;
      continue;
    }

    // List item (bullet, ordered, or task)
    const listItemMatch = line.match(
      /^(\s*)([-*+]|\d+[.)])(\s+)(\[[ xX]\] )?(.*)$/,
    );
    if (listItemMatch) {
      const indent = listItemMatch[1].length;
      const marker = listItemMatch[2];
      const markerSpaces = listItemMatch[3];
      const checkbox = listItemMatch[4];
      const firstLineContent = listItemMatch[5];

      let listType: "bullet" | "ordered" | "task";
      let start: number | undefined;
      let checked: boolean | undefined;

      if (checkbox) {
        listType = "task";
        checked = checkbox.trim() !== "[ ]";
      } else if (/^\d+[.)]$/.test(marker)) {
        listType = "ordered";
        start = parseInt(marker, 10);
      } else {
        listType = "bullet";
      }

      // The checkbox is inline content, not part of the list marker.
      const contentIndent = indent + marker.length + markerSpaces.length;

      // Minimum indent for child content: anything indented past the marker
      // (sub-lists can start at indent > marker position)
      const minChildIndent = indent + 1;

      // Helper to check if a line belongs to this list item
      const belongsToItem = (lineStr: string): boolean => {
        if (lineStr.trim() === "") {
          return true;
        } // blank lines checked separately
        const lineInd = lineStr.match(/^\s*/)![0].length;
        // Lines at contentIndent are continuation text
        if (lineInd >= contentIndent) {
          return true;
        }
        // Lines between marker and content column that start a sub-list
        if (
          lineInd >= minChildIndent &&
          lineStr.match(/^\s*([-*+]|\d+[.)])\s+/)
        ) {
          return true;
        }
        return false;
      };

      // Consume ALL subsequent lines that belong to this list item
      i++;
      const subLines: string[] = [];
      while (i < lines.length) {
        const cur = lines[i];

        if (cur.trim() === "") {
          // Blank line: include if followed by content that belongs to this item
          let lookAhead = i + 1;
          while (lookAhead < lines.length && lines[lookAhead].trim() === "") {
            lookAhead++;
          }
          if (lookAhead < lines.length && belongsToItem(lines[lookAhead])) {
            subLines.push("");
            i++;
            continue;
          }
          break;
        }

        if (!belongsToItem(cur)) {
          break;
        }

        // Strip indent: for lines at contentIndent+, strip contentIndent chars;
        // for sub-list lines between minChildIndent and contentIndent, strip minChildIndent
        const lineIndent = cur.match(/^\s*/)![0].length;
        if (lineIndent >= contentIndent) {
          subLines.push(cur.substring(contentIndent));
        } else {
          // Sub-list item between minChildIndent and contentIndent
          subLines.push(cur.substring(minChildIndent));
        }
        i++;
      }

      // Build the list item token
      // If there are sub-lines, they become child content (recursively tokenized)
      // Don't trim — preserve relative indentation of sub-lines
      const childContent = subLines.join("\n").replace(/^\n+|\n+$/g, "");
      tokens.push({
        type: "listItem",
        listType,
        indent,
        content: firstLineContent.trim(),
        start,
        checked,
        childContent: childContent || undefined,
      });
      prevLineWasBlank = false;
      continue;
    }

    // Block-level raw HTML: a line starting with `<tag>` (block-level tag),
    // `<!-- ... -->`, `<?...?>`, `<!DOCTYPE ...>`, or `<![CDATA[...]]>`.
    // Lines are emitted verbatim until the next blank line.
    if (isHtmlBlockStart(line)) {
      const htmlLines: string[] = [];
      while (i < lines.length && lines[i].trim() !== "") {
        htmlLines.push(lines[i]);
        i++;
      }
      tokens.push({
        type: "rawHtml",
        content: htmlLines.join("\n"),
      });
      prevLineWasBlank = false;
      continue;
    }

    // Paragraph (default)
    // Keep continuation indentation until inline parsing can distinguish a
    // line break in prose from a newline inside a code span.
    const paraLines = [line.replace(/^ {1,3}/, "")];
    i++;
    while (i < lines.length && canContinueParagraph(lines[i])) {
      // Check if next-next line is setext marker
      if (i + 1 < lines.length && /^[=-]+\s*$/.test(lines[i + 1])) {
        break;
      }
      paraLines.push(lines[i]);
      i++;
    }
    // Strip trailing whitespace from the final line so a trailing
    // hard-break sequence (`  \n` at end of paragraph) doesn't leak as
    // literal trailing spaces in the rendered output.
    tokens.push({
      type: "paragraph",
      content: paraLines.join("\n").replace(/[ \t]+$/, ""),
    });
    prevLineWasBlank = false;
  }

  return tokens;
}

function tryParseTable(
  lines: string[],
  start: number,
): { token: TableToken; nextLine: number } | null {
  // A table needs at least a header row and a separator row
  if (start + 1 >= lines.length) {
    return null;
  }

  const headerLine = lines[start];
  const separatorLine = lines[start + 1];

  // Check separator line format: | --- | --- | or --- | --- (outer pipes optional)
  // Must contain at least one pipe and only dashes, colons, pipes, and whitespace
  if (
    !separatorLine.includes("|") ||
    !/^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(separatorLine)
  ) {
    return null;
  }

  // Check header line has at least one pipe (required to distinguish from plain text)
  if (!headerLine.includes("|")) {
    return null;
  }

  const headers = parsePipeCells(headerLine);
  const alignments = parseAlignments(separatorLine);

  const rows: string[][] = [];
  let i = start + 2;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.includes("|")) {
      break;
    }
    rows.push(parsePipeCells(line));
    i++;
  }

  return {
    token: {
      type: "table",
      headers,
      rows,
      alignments,
    },
    nextLine: i,
  };
}

function parsePipeCells(line: string): string[] {
  // Trim leading/trailing pipes and split
  const trimmed = line.trim();
  const withoutOuterPipes = trimmed.startsWith("|")
    ? trimmed.substring(1)
    : trimmed;
  const content = withoutOuterPipes.endsWith("|")
    ? withoutOuterPipes.substring(0, withoutOuterPipes.length - 1)
    : withoutOuterPipes;

  // Split by pipes, handling escaped pipes
  const cells: string[] = [];
  let current = "";
  for (let i = 0; i < content.length; i++) {
    if (
      content[i] === "\\" &&
      i + 1 < content.length &&
      content[i + 1] === "|"
    ) {
      current += "|";
      i++;
    } else if (content[i] === "|") {
      cells.push(current.trim());
      current = "";
    } else {
      current += content[i];
    }
  }
  cells.push(current.trim());

  return cells;
}

function parseAlignments(
  separatorLine: string,
): ("left" | "center" | "right" | null)[] {
  const cells = parsePipeCells(separatorLine);
  return cells.map((cell) => {
    const trimmed = cell.trim();
    const left = trimmed.startsWith(":");
    const right = trimmed.endsWith(":");
    if (left && right) {
      return "center";
    }
    if (right) {
      return "right";
    }
    if (left) {
      return "left";
    }
    return null;
  });
}

// ─── HTML Emitter ────────────────────────────────────────────────────────────

function tokensToHtml(tokens: Token[]): string {
  let html = "";
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];

    switch (token.type) {
      case "heading": {
        const t = token as HeadingToken;
        html += `<h${t.level}>${parseInline(t.content)}</h${t.level}>`;
        i++;
        break;
      }

      case "paragraph": {
        const t = token as ParagraphToken;
        html += `<p>${parseInline(t.content)}</p>`;
        i++;
        break;
      }

      case "codeBlock": {
        const t = token as CodeBlockToken;
        const langAttr = t.language
          ? ` data-language="${escapeHtml(t.language)}"`
          : "";
        html += `<pre><code${langAttr}>${escapeHtml(t.code)}</code></pre>`;
        i++;
        break;
      }

      case "blockquote": {
        const t = token as BlockquoteToken;
        const innerHtml = tokensToHtml(t.children);
        html += `<blockquote>${innerHtml}</blockquote>`;
        i++;
        break;
      }

      case "hr":
        html += `<hr>`;
        i++;
        break;

      case "listItem": {
        // Collect consecutive list items and build nested list structure
        const listHtml = emitListItems(tokens, i);
        html += listHtml.html;
        i = listHtml.nextIndex;
        break;
      }

      case "table": {
        const t = token as TableToken;
        html += emitTable(t);
        i++;
        break;
      }

      case "rawHtml": {
        const t = token as RawHtmlToken;
        html += t.content;
        i++;
        break;
      }

      default:
        i++;
    }
  }

  return html;
}

function emitListItems(
  tokens: Token[],
  startIdx: number,
): { html: string; nextIndex: number } {
  let html = "";
  let i = startIdx;
  let currentListType: "bullet" | "ordered" | null = null;

  while (i < tokens.length && tokens[i].type === "listItem") {
    const item = tokens[i] as ListItemToken;
    const effectiveType = getEffectiveListType(item.listType);

    // Check if we need to switch list type
    if (currentListType !== null && currentListType !== effectiveType) {
      // Close current list, open new one
      html += `</${currentListType === "ordered" ? "ol" : "ul"}>`;
      currentListType = null;
    }

    // Open list if needed
    if (currentListType === null) {
      if (effectiveType === "ordered") {
        const startAttr =
          item.start !== undefined && item.start !== 1
            ? ` start="${item.start}"`
            : "";
        html += `<ol${startAttr}>`;
      } else {
        html += `<ul>`;
      }
      currentListType = effectiveType;
    }

    // Emit list item
    if (item.listType === "task") {
      const checkedAttr = item.checked ? " checked" : "";
      html += `<li><input type="checkbox" disabled${checkedAttr}><p>${parseInline(item.content)}</p>`;
    } else {
      html += `<li><p>${parseInline(item.content)}</p>`;
    }

    // Render child content (nested items, continuation paragraphs, etc.)
    if (item.childContent) {
      const childTokens = tokenize(item.childContent);
      html += tokensToHtml(childTokens);
    }

    html += `</li>`;
    i++;
  }

  // Close the list
  if (currentListType !== null) {
    html += `</${currentListType === "ordered" ? "ol" : "ul"}>`;
  }

  return { html, nextIndex: i };
}

function getEffectiveListType(
  listType: "bullet" | "ordered" | "task",
): "bullet" | "ordered" {
  return listType === "ordered" ? "ordered" : "bullet";
}

function emitTable(table: TableToken): string {
  let html = "<table>";

  // BlockNote tables have no required header row, but the markdown table
  // syntax does. When we serialize a headerless BlockNote table to markdown
  // we emit an empty header row; on re-parse, treat that empty header as
  // "no header" so the round-trip is stable (issue #739).
  const headerIsEmpty = table.headers.every((h) => h.trim() === "");
  const colCount = table.headers.length;

  if (!headerIsEmpty) {
    html += "<thead><tr>";
    for (let c = 0; c < colCount; c++) {
      const align = table.alignments[c];
      const alignAttr = align ? ` align="${align}"` : "";
      html += `<th${alignAttr}>${parseInline(table.headers[c])}</th>`;
    }
    html += "</tr></thead>";
  }

  if (table.rows.length > 0) {
    html += "<tbody>";
    for (const row of table.rows) {
      html += "<tr>";
      for (let c = 0; c < colCount; c++) {
        const cell = c < row.length ? row[c] : "";
        const align = table.alignments[c];
        const alignAttr = align ? ` align="${align}"` : "";
        html += `<td${alignAttr}>${parseInline(cell)}</td>`;
      }
      html += "</tr>";
    }
    html += "</tbody>";
  }

  html += "</table>";
  return html;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Convert a markdown string to an HTML string.
 * This is a direct replacement for the unified/remark/rehype pipeline.
 */
export function markdownToHtml(markdown: string): string {
  const tokens = tokenize(markdown);
  return tokensToHtml(tokens);
}
