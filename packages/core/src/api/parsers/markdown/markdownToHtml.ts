import { isVideoUrl } from "../../../util/string.js";
import { findLinks } from "../../../extensions/tiptap-extensions/Link/helpers/linkDetector.js";
import { EMPTY_BLOCK_PLACEHOLDER } from "../../exporters/html/util/serializeBlocksExternalHTML.js";
import { parseAutolinkLiteral } from "./autolink.js";

/**
 * Custom markdown-to-HTML converter for BlockNote.
 * Replaces the unified/remark/rehype pipeline with a direct, minimal implementation
 * that handles exactly the markdown features BlockNote needs.
 */

// ─── HTML Escaping ───────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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

/**
 * The ASCII punctuation characters. As in CommonMark, a backslash before one
 * of these characters gives the literal character.
 */
const ASCII_PUNCTUATION = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";

function tryBackslashEscape(
  text: string,
  i: number,
): { html: string; end: number } | null {
  if (text[i] !== "\\" || i + 1 >= text.length) {
    return null;
  }
  const next = text[i + 1];
  // A backslash at the end of a line is a hard break. Do not put a newline
  // after the `<br>`, because the HTML parser changes it into a space at the
  // start of the next line.
  if (next === "\n") {
    return { html: "<br>", end: i + 2 };
  }
  if (ASCII_PUNCTUATION.includes(next)) {
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
  return parseInlineCode(text, i);
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

function trySoftBreak(
  text: string,
  i: number,
): { html: string; end: number } | null {
  if (text[i] === "\n") {
    return { html: "<br>", end: i + 1 };
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
  trySoftBreak,
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
    // Hard line break: 2+ trailing spaces immediately before a newline.
    // (The other hard-break form, backslash + newline, is handled by
    // tryBackslashEscape.) Strip the trailing spaces from the accumulated
    // result before emitting the <br>.
    if (
      text[i] === "\n" &&
      i >= 2 &&
      text[i - 1] === " " &&
      text[i - 2] === " "
    ) {
      result = result.replace(/ +$/, "");
      result += "<br>";
      i++;
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

function parseInlineCode(
  text: string,
  start: number,
): { html: string; end: number } | null {
  // Count opening backticks
  let openCount = 0;
  let i = start;
  while (i < text.length && text[i] === "`") {
    openCount++;
    i++;
  }

  // Find matching closing backticks
  let j = i;
  while (j < text.length) {
    if (text[j] === "`") {
      let closeCount = 0;
      const closeStart = j;
      while (j < text.length && text[j] === "`") {
        closeCount++;
        j++;
      }
      if (closeCount === openCount) {
        let code = text.substring(i, closeStart);
        // Per CommonMark: line endings inside a code span are converted to
        // single spaces, then if the result starts AND ends with a space and
        // is not all-spaces, one leading + trailing space is stripped (so
        // `` ` `foo` ` `` is `<code>`foo`</code>`).
        code = code.replace(/\n/g, " ");
        if (
          code.length >= 2 &&
          code[0] === " " &&
          code.at(-1) === " " &&
          /[^ ]/.test(code)
        ) {
          code = code.substring(1, code.length - 1);
        }
        return {
          html: `<code>${escapeHtml(code)}</code>`,
          end: j,
        };
      }
    } else {
      j++;
    }
  }
  return null;
}

function parseImage(
  text: string,
  start: number,
): { html: string; end: number } | null {
  // ![alt](url) or ![alt](url "title")
  // Use balanced bracket matching to handle nested/escaped brackets in alt text
  const altEnd = findClosingBracket(text, start + 1);
  if (altEnd === -1) {
    return null;
  }
  const altStart = start + 2; // after ![

  if (text[altEnd + 1] !== "(") {
    return null;
  }

  const urlStart = altEnd + 2;
  const parenEnd = findClosingParen(text, urlStart - 1);
  if (parenEnd === -1) {
    return null;
  }

  const alt = text.substring(altStart, altEnd);
  const { url, title } = parseDestinationAndTitle(
    text.substring(urlStart, parenEnd),
  );

  if (isVideoUrl(url)) {
    // Use the alt text as the video's display name (falling back to the
    // title) so a video link written with the standard `![name](url)` form
    // round-trips into BlockNote's video block. Captioned videos go through
    // raw `<figure>` HTML instead, see htmlToMarkdown.serializeMediaFigure.
    const name = alt || title;
    return {
      html: `<video src="${escapeHtml(url)}"${name ? ` data-name="${escapeHtml(name)}"` : ""} data-url="${escapeHtml(url)}" controls></video>`,
      end: parenEnd + 1,
    };
  }

  const titleAttr = title !== undefined ? ` title="${escapeHtml(title)}"` : "";
  return {
    html: `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}"${titleAttr}>`,
    end: parenEnd + 1,
  };
}

function parseLink(
  text: string,
  start: number,
): { html: string; end: number } | null {
  // [text](url)
  const textStart = start + 1;
  const textEnd = findClosingBracket(text, start);
  if (textEnd === -1) {
    return null;
  }

  if (text[textEnd + 1] !== "(") {
    return null;
  }

  const urlStart = textEnd + 2;
  const parenEnd = findClosingParen(text, textEnd + 1);
  if (parenEnd === -1) {
    return null;
  }

  const linkText = text.substring(textStart, textEnd);
  const { url, title } = parseDestinationAndTitle(
    text.substring(urlStart, parenEnd),
  );

  const titleAttr = title !== undefined ? ` title="${escapeHtml(title)}"` : "";
  return {
    html: `<a href="${escapeHtml(url)}"${titleAttr}>${parseInline(linkText, false)}</a>`,
    end: parenEnd + 1,
  };
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

function findClosingParen(text: string, openPos: number): number {
  let depth = 0;
  for (let i = openPos; i < text.length; i++) {
    if (text[i] === "\\" && i + 1 < text.length) {
      i++;
      continue;
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

/**
 * Parse the inside of `(...)` from a link/image (the URL and optional title).
 * Handles three URL forms:
 *   - bare:           `/uri` or `/uri "title"`
 *   - angle-bracket:  `<url>` or `<url> "title"` (brackets are stripped)
 * And three title-quote forms:  `"..."`, `'...'`, `(...)`.
 */
function parseDestinationAndTitle(raw: string): {
  url: string;
  title?: string;
} {
  raw = raw.trim();
  let url: string;
  let rest: string;

  if (raw.startsWith("<")) {
    const close = raw.indexOf(">");
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

  let title: string | undefined;
  if (rest.length > 0) {
    const titleMatch = rest.match(/^"([^"]*)"$|^'([^']*)'$|^\(([^)]*)\)$/);
    if (titleMatch) {
      title = titleMatch[1] ?? titleMatch[2] ?? titleMatch[3];
    }
  }

  // As in CommonMark, backslash escapes also apply in the URL and the title.
  return {
    url: removeBackslashEscapes(url),
    title: title === undefined ? undefined : removeBackslashEscapes(title),
  };
}

/**
 * Remove the backslash from each backslash escape (a backslash before an
 * ASCII punctuation character).
 */
function removeBackslashEscapes(text: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    if (
      text[i] === "\\" &&
      i + 1 < text.length &&
      ASCII_PUNCTUATION.includes(text[i + 1])
    ) {
      i++;
    }
    result += text[i];
  }
  return result;
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
  content: string;
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

/**
 * Match the opening line of a fenced code block. As in CommonMark, the info
 * string after a backtick fence cannot contain a backtick. Thus a line that
 * starts with a code span (for example ```` ```a``` ````) is not a fence.
 */
function matchCodeFence(line: string): RegExpMatchArray | null {
  return line.match(/^ {0,3}(?:(`{3,})([^`]*)|(~{3,})(.*))$/);
}

/** Returns true if the line starts a block, which ends a paragraph. */
function interruptsParagraph(line: string): boolean {
  return (
    /^#{1,6}(?:[ \t]|$)/.test(line) ||
    /^(?:`{3,}[^`]*|~{3,}.*)$/.test(line) ||
    /^\s{0,3}>/.test(line) ||
    /^(\s{0,3})([-*_])\s*(\2\s*){2,}$/.test(line) ||
    /^\s*([-*+]|\d+[.)])\s+/.test(line) ||
    /^\s*\|(.+\|)+\s*$/.test(line) ||
    isHtmlBlockStart(line)
  );
}

function tokenize(markdown: string): Token[] {
  const lines = markdown.split("\n");
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

    // Fenced code block (0-3 leading spaces allowed per CommonMark)
    const fenceMatch = matchCodeFence(line);
    if (fenceMatch) {
      const fence = fenceMatch[1] ?? fenceMatch[3];
      const fenceChar = fence[0];
      const fenceLen = fence.length;
      const language = (fenceMatch[2] ?? fenceMatch[4]).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length) {
        const closingMatch = lines[i].match(
          new RegExp(`^ {0,3}${fenceChar}{${fenceLen},}\\s*$`),
        );
        if (closingMatch) {
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
    // - A line with only the `#` sequence is an empty heading (as in
    //   CommonMark).
    const headingMatch = line.match(
      /^(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/,
    );
    if (headingMatch) {
      tokens.push({
        type: "heading",
        level: headingMatch[1].length,
        content: headingMatch[2] ?? "",
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
    if (/^\s{0,3}>/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^\s{0,3}>/.test(lines[i])) {
        // Remove the > prefix
        quoteLines.push(lines[i].replace(/^\s{0,3}>\s?/, ""));
        i++;
      }
      // Lazy continuation: collect non-blank lines that don't start a new
      // block-level element (per CommonMark spec)
      while (i < lines.length) {
        const cur = lines[i];
        if (cur.trim() === "") {
          break;
        }
        // Stop on block-level markers
        if (/^\s{0,3}>/.test(cur)) {
          break;
        } // new blockquote
        if (/^(#{1,6})\s/.test(cur)) {
          break;
        } // heading
        if (/^(`{3,}|~{3,})/.test(cur)) {
          break;
        } // code fence
        if (/^(\s{0,3})([-*_])\s*(\2\s*){2,}$/.test(cur)) {
          break;
        } // hr
        if (/^\s*([-*+]|\d+[.)])\s+/.test(cur)) {
          break;
        } // list item
        if (/^\s*\|(.+\|)+\s*$/.test(cur)) {
          break;
        } // table
        quoteLines.push(cur);
        i++;
      }
      tokens.push({
        type: "blockquote",
        content: quoteLines.join("\n"),
      });
      prevLineWasBlank = false;
      continue;
    }

    // List item (bullet, ordered, or task)
    // The marker and the checkbox can be at the end of the line, as in an
    // empty list item.
    const listItemMatch = line.match(
      /^(\s*)([-*+]|\d+[.)])(\s+|$)(\[[ xX]\](?:[ \t]+|$))?(.*)$/,
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

      // The content indent is the column where the content starts. For a task
      // list item, the checkbox is a part of the content (as in GFM). The
      // child blocks align with the checkbox, not with the text after it.
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

      // The lines right after the first line continue its paragraph (for
      // example after a hard break), up to a blank line or a line that starts
      // a block. This is the same as for a paragraph outside a list. Also, a
      // line with only a list marker (an empty list item at the end of the
      // document) starts a block here.
      let paragraphLineCount = 0;
      if (firstLineContent.trim() !== "") {
        while (
          paragraphLineCount < subLines.length &&
          subLines[paragraphLineCount].trim() !== "" &&
          !interruptsParagraph(subLines[paragraphLineCount]) &&
          !/^\s*([-*+]|\d+[.)])$/.test(subLines[paragraphLineCount])
        ) {
          paragraphLineCount++;
        }
      }
      const paragraphLines = [
        firstLineContent,
        ...subLines
          .slice(0, paragraphLineCount)
          .map((l) => l.replace(/^[ \t]+/, "")),
      ];

      // Build the list item token
      // If there are sub-lines, they become child content (recursively tokenized)
      // Don't trim — preserve relative indentation of sub-lines
      const childContent = subLines
        .slice(paragraphLineCount)
        .join("\n")
        .replace(/^\n+|\n+$/g, "");
      tokens.push({
        type: "listItem",
        listType,
        indent,
        content: paragraphLines.join("\n").trim(),
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
    const paraLines: string[] = [line];
    i++;
    while (i < lines.length) {
      const nextLine = lines[i];
      // Stop paragraph on blank line
      if (nextLine.trim() === "") {
        break;
      }
      // Stop on block-level element
      if (interruptsParagraph(nextLine)) {
        break;
      }
      // Check if next-next line is setext marker
      if (
        i + 1 < lines.length &&
        /^[=-]+\s*$/.test(lines[i + 1]) &&
        nextLine.trim().length > 0
      ) {
        break;
      }
      paraLines.push(nextLine);
      i++;
    }
    // CommonMark removes the spaces and tabs at the start of each paragraph
    // line. This parser has no indented code blocks, thus a line with 4 or
    // more spaces is also a paragraph line. Without this, a paragraph with
    // only an indented `<br>` is not an empty paragraph (see
    // `EMPTY_PARAGRAPH`).
    // Also strip trailing whitespace from the final line so a trailing
    // hard-break sequence (`  \n` at end of paragraph) doesn't leak as
    // literal trailing spaces in the rendered output.
    tokens.push({
      type: "paragraph",
      content: paraLines
        .map((l) => l.replace(/^[ \t]+/, ""))
        .join("\n")
        .replace(/[ \t]+$/, ""),
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

/** Options for the HTML that `markdownToHtml` makes. */
export type MarkdownToHtmlOptions = {
  /**
   * The reader of the HTML:
   * - `"html"` (the default): any HTML reader.
   * - `"blocks"`: BlockNote's HTML parser, which makes blocks from the HTML.
   *   The HTML then has these changes:
   *   - An empty block (an empty list item, an empty heading, or a paragraph
   *     with only a `<br>` tag) gets `EMPTY_BLOCK_PLACEHOLDER`. Without it,
   *     the HTML parser drops the block or makes a hard break. The HTML
   *     parser removes the placeholder after the parse.
   *   - An image in text moves out of the text (see `moveImagesOutOfText`).
   *     BlockNote has no inline images, so the HTML parser drops them.
   *   - The whitespace and the hard breaks at the start and at the end of a
   *     text, and the whitespace after a hard break, are removed (see
   *     `trimText`). The markdown exporter does not write them. Thus, the
   *     parse gives the same blocks as a round trip of these blocks.
   */
  target?: "html" | "blocks";
};

/** A paragraph with only a `<br>` tag, which is an empty paragraph. */
const EMPTY_PARAGRAPH = /^<br\s*\/?>$/i;

function tokensToHtml(tokens: Token[], options: MarkdownToHtmlOptions): string {
  let html = "";
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];

    switch (token.type) {
      case "heading": {
        const t = token as HeadingToken;
        const content =
          t.content === "" && options.target === "blocks"
            ? EMPTY_BLOCK_PLACEHOLDER
            : parseInline(t.content);
        html += `<h${t.level}>${content}</h${t.level}>`;
        i++;
        break;
      }

      case "paragraph": {
        const t = token as ParagraphToken;
        const content =
          options.target === "blocks" && EMPTY_PARAGRAPH.test(t.content)
            ? EMPTY_BLOCK_PLACEHOLDER
            : parseInline(t.content);
        html += `<p>${content}</p>`;
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
        // Recursively parse blockquote content as markdown
        const innerTokens = tokenize(t.content);
        const innerHtml = tokensToHtml(innerTokens, options);
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
        const listHtml = emitListItems(tokens, i, options);
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
  options: MarkdownToHtmlOptions,
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
    const inlineHtml = parseInline(item.content);
    const content =
      inlineHtml === "" && options.target === "blocks"
        ? EMPTY_BLOCK_PLACEHOLDER
        : inlineHtml;
    if (item.listType === "task") {
      const checkedAttr = item.checked ? " checked" : "";
      html += `<li><input type="checkbox" disabled${checkedAttr}><p>${content}</p>`;
    } else {
      html += `<li><p>${content}</p>`;
    }

    // Render child content (nested items, continuation paragraphs, etc.)
    if (item.childContent) {
      const childTokens = tokenize(item.childContent);
      html += tokensToHtml(childTokens, options);
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
export function markdownToHtml(
  markdown: string,
  options: MarkdownToHtmlOptions = {},
): string {
  const tokens = tokenize(markdown);
  const html = tokensToHtml(tokens, options);
  return options.target === "blocks" ? prepareForBlocks(html) : html;
}

/** The elements that contain the text of a block, or of a table cell. */
const TEXT_ELEMENTS = "p, h1, h2, h3, h4, h5, h6, td, th";

/** Changes the HTML for BlockNote's HTML parser (see `MarkdownToHtmlOptions`). */
function prepareForBlocks(html: string): string {
  // Use a document that is not the active document, so that the HTML from
  // the markdown does not load images or run event handlers (see
  // `nestedListsToBlockNoteStructure`).
  const container = document.implementation
    .createHTMLDocument("title")
    .createElement("div");
  container.innerHTML = html;
  // A `<br>` outside a text, for example after an HTML block, is an empty
  // paragraph, as a `<br>` line is. Without this, the HTML parser makes a
  // paragraph with a hard break, which a round trip changes.
  for (const br of Array.from(container.children)) {
    if (br.tagName === "BR") {
      const paragraph = container.ownerDocument.createElement("p");
      paragraph.textContent = EMPTY_BLOCK_PLACEHOLDER;
      br.replaceWith(paragraph);
    }
  }
  moveImagesOutOfText(container);
  for (const element of Array.from(container.querySelectorAll(TEXT_ELEMENTS))) {
    trimText(element);
  }
  return container.innerHTML;
}

/**
 * Removes the whitespace and the hard breaks at the start and at the end of
 * the text, and the whitespace after each hard break. The markdown exporter
 * does not write them. A block that becomes empty gets
 * `EMPTY_BLOCK_PLACEHOLDER`, as an empty paragraph does. Without it, the HTML
 * parser drops the block.
 */
function trimText(element: Element) {
  if (element.childNodes.length === 0) {
    return;
  }
  trimParagraphEdge(element, "start");
  trimParagraphEdge(element, "end");
  for (const br of Array.from(element.getElementsByTagName("br"))) {
    const next = br.nextSibling;
    if (next?.nodeType === 3) {
      next.textContent = (next.textContent ?? "").trimStart();
    }
  }
  if (
    element.childNodes.length === 0 &&
    element.tagName !== "TD" &&
    element.tagName !== "TH"
  ) {
    element.textContent = EMPTY_BLOCK_PLACEHOLDER;
  }
}

// ─── Images In Text ──────────────────────────────────────────────────────────

/**
 * BlockNote has no inline images: an image is a block. Thus move each image
 * (or video) out of the text, so that the HTML parser does not drop it:
 * - In a paragraph block, split the paragraph around the image. The result is
 *   a paragraph, an image block and a paragraph.
 * - In other text (for example in a link, in emphasis, in a heading or in the
 *   text of a list item), replace the image with a link to it. In a link (for
 *   example a README badge `[![x](y)](z)`), replace the image with its alt
 *   text, so that the link stays.
 *
 * An image that is the only content of a paragraph block stays, because the
 * HTML parser makes an image block from it. An image that is not in text (for
 * example in a `<figure>`) also stays.
 */
function moveImagesOutOfText(container: Element) {
  for (const media of Array.from(container.querySelectorAll("img, video"))) {
    const textElement = media.closest(TEXT_ELEMENTS);
    if (!textElement) {
      continue;
    }
    if (
      media.parentElement === textElement &&
      isParagraphBlock(textElement, container)
    ) {
      if (hasOtherContent(textElement, media)) {
        splitParagraphAt(media);
      }
    } else {
      replaceWithLink(media);
    }
  }
}

/**
 * Returns true if the element is a paragraph block: a `<p>` at the top level,
 * or a child `<p>` of a list item (not the first `<p>`, which is the text of
 * the list item).
 */
function isParagraphBlock(element: Element, container: Element): boolean {
  if (element.tagName !== "P") {
    return false;
  }
  const parent = element.parentElement;
  return (
    parent === container ||
    (parent?.tagName === "LI" && parent.querySelector(":scope > p") !== element)
  );
}

/** Returns true if the paragraph has content other than the image. */
function hasOtherContent(paragraph: Element, media: Element): boolean {
  return Array.from(paragraph.childNodes).some(
    (node) =>
      node !== media &&
      !(node.nodeType === 3 && node.textContent?.trim() === "") &&
      !(node.nodeType === 1 && (node as Element).tagName === "BR"),
  );
}

/**
 * Split the paragraph of the image into the paragraph before the image, the
 * image, and a new paragraph after the image. Remove the whitespace and the
 * hard breaks at the split, and remove a paragraph that becomes empty.
 */
function splitParagraphAt(media: Element) {
  const before = media.parentElement!;
  const after = before.ownerDocument.createElement("p");
  while (media.nextSibling) {
    after.append(media.nextSibling);
  }
  before.after(media, after);
  trimParagraphEdge(before, "end");
  trimParagraphEdge(after, "start");
  for (const paragraph of [before, after]) {
    if (paragraph.childNodes.length === 0) {
      paragraph.remove();
    }
  }
}

/** Remove the whitespace and the `<br>` tags at one edge of a paragraph. */
function trimParagraphEdge(paragraph: Element, edge: "start" | "end") {
  for (;;) {
    const node = edge === "start" ? paragraph.firstChild : paragraph.lastChild;
    if (!node) {
      return;
    }
    if (node.nodeType === 1 && (node as Element).tagName === "BR") {
      node.remove();
    } else if (node.nodeType === 3) {
      const text = node.textContent ?? "";
      const trimmed = edge === "start" ? text.trimStart() : text.trimEnd();
      if (trimmed === "") {
        node.remove();
      } else {
        node.textContent = trimmed;
        return;
      }
    } else {
      return;
    }
  }
}

/**
 * Replace the image with a link to it, with the alt text (or the URL) as the
 * link text. In a link, replace the image with the text only.
 */
function replaceWithLink(media: Element) {
  const url = media.getAttribute("src") || media.getAttribute("data-url") || "";
  const text =
    media.getAttribute("alt") || media.getAttribute("data-name") || url;
  const doc = media.ownerDocument;
  if (media.closest("a")) {
    media.replaceWith(doc.createTextNode(text));
    return;
  }
  const link = doc.createElement("a");
  link.setAttribute("href", url);
  link.textContent = text;
  media.replaceWith(link);
}
