import { isVideoUrl } from "../../../util/string.js";

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
  const after =
    i + delimLen < text.length ? text[i + delimLen] : undefined;
  return isAlphanumeric(before) && isAlphanumeric(after);
}

// ─── Inline Parser ───────────────────────────────────────────────────────────

type InlineTokenizer = (
  text: string,
  i: number
) => { html: string; end: number } | null;

function tryBackslashEscape(
  text: string,
  i: number
): { html: string; end: number } | null {
  if (text[i] !== "\\" || i + 1 >= text.length) {return null;}
  const next = text[i + 1];
  // Hard line break: backslash at end of line
  if (next === "\n") {
    return { html: "<br>\n", end: i + 2 };
  }
  // Escapable characters
  if ("\\`*_{}[]()#+-.!~|>".includes(next)) {
    return { html: escapeHtml(next), end: i + 2 };
  }
  return null;
}

function tryInlineCode(
  text: string,
  i: number
): { html: string; end: number } | null {
  if (text[i] !== "`") {return null;}
  return parseInlineCode(text, i);
}

function tryImage(
  text: string,
  i: number
): { html: string; end: number } | null {
  if (text[i] !== "!" || text[i + 1] !== "[") {return null;}
  return parseImage(text, i);
}

function tryLink(
  text: string,
  i: number
): { html: string; end: number } | null {
  if (text[i] !== "[") {return null;}
  return parseLink(text, i);
}

function tryStrikethrough(
  text: string,
  i: number
): { html: string; end: number } | null {
  if (text[i] !== "~" || text[i + 1] !== "~") {return null;}
  return parseDelimited(text, i, "~~", "<del>", "</del>");
}

function tryBoldItalic(
  text: string,
  i: number
): { html: string; end: number } | null {
  if (
    (text[i] === "*" && text[i + 1] === "*" && text[i + 2] === "*") ||
    (text[i] === "_" &&
      text[i + 1] === "_" &&
      text[i + 2] === "_" &&
      !isIntraword(text, i, 3))
  ) {
    const delimiter = text.substring(i, i + 3);
    return parseDelimited(text, i, delimiter, "<strong><em>", "</em></strong>");
  }
  return null;
}

function tryBold(
  text: string,
  i: number
): { html: string; end: number } | null {
  if (
    (text[i] === "*" && text[i + 1] === "*") ||
    (text[i] === "_" && text[i + 1] === "_" && !isIntraword(text, i, 2))
  ) {
    const delimiter = text.substring(i, i + 2);
    return parseDelimited(text, i, delimiter, "<strong>", "</strong>");
  }
  return null;
}

function tryItalic(
  text: string,
  i: number
): { html: string; end: number } | null {
  if (text[i] === "*" || (text[i] === "_" && !isIntraword(text, i, 1))) {
    return parseDelimited(text, i, text[i], "<em>", "</em>");
  }
  return null;
}

function trySoftBreak(
  text: string,
  i: number
): { html: string; end: number } | null {
  if (text[i] === "\n") {
    return { html: "\n", end: i + 1 };
  }
  return null;
}

/** Characters that can start an inline syntax token. */
const SPECIAL_CHARS = new Set("\\`![~*_\n");

/**
 * Ordered array of inline tokenizers, tried in priority order.
 * The first match wins.
 */
const inlineTokenizers: InlineTokenizer[] = [
  tryBackslashEscape,
  tryInlineCode,
  tryImage,
  tryLink,
  tryStrikethrough,
  tryBoldItalic, // *** / ___
  tryBold, // ** / __
  tryItalic, // * / _
  trySoftBreak,
];

/**
 * Parse inline markdown syntax and return HTML.
 * Handles: bold, italic, bold+italic, strikethrough, inline code,
 * links, images (with video detection), hard line breaks, backslash escapes.
 */
function parseInline(text: string): string {
  let result = "";
  let i = 0;

  while (i < text.length) {
    // Try each tokenizer in priority order
    let matched = false;
    if (SPECIAL_CHARS.has(text[i])) {
      for (const tokenizer of inlineTokenizers) {
        const r = tokenizer(text, i);
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
      while (i < text.length && !SPECIAL_CHARS.has(text[i])) {
        i++;
      }
      result += escapeHtml(text.substring(runStart, i));
    }
  }

  return result;
}

function parseInlineCode(
  text: string,
  start: number
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
        // Strip one leading and one trailing space if both exist
        if (
          code.length >= 2 &&
          code[0] === " " &&
          code[code.length - 1] === " "
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
  start: number
): { html: string; end: number } | null {
  // ![alt](url) or ![alt](url "title")
  // Use balanced bracket matching to handle nested/escaped brackets in alt text
  const altEnd = findClosingBracket(text, start + 1);
  if (altEnd === -1) {return null;}
  const altStart = start + 2; // after ![

  if (text[altEnd + 1] !== "(") {return null;}

  const urlStart = altEnd + 2;
  const parenEnd = findClosingParen(text, urlStart - 1);
  if (parenEnd === -1) {return null;}

  const alt = text.substring(altStart, altEnd);
  let urlContent = text.substring(urlStart, parenEnd).trim();
  let title: string | undefined;

  // Check for title in quotes
  const titleMatch = urlContent.match(/^(\S+)\s+"([^"]*)"$/);
  if (titleMatch) {
    urlContent = titleMatch[1];
    title = titleMatch[2];
  }

  const url = urlContent;

  if (isVideoUrl(url)) {
    // Match remark-rehype behavior: data-name comes from the title, not alt
    return {
      html: `<video src="${escapeHtml(url)}"${title !== undefined ? ` data-name="${escapeHtml(title)}"` : ""} data-url="${escapeHtml(url)}" controls></video>`,
      end: parenEnd + 1,
    };
  }

  return {
    html: `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}">`,
    end: parenEnd + 1,
  };
}

function parseLink(
  text: string,
  start: number
): { html: string; end: number } | null {
  // [text](url)
  const textStart = start + 1;
  const textEnd = findClosingBracket(text, start);
  if (textEnd === -1) {return null;}

  if (text[textEnd + 1] !== "(") {return null;}

  const urlStart = textEnd + 2;
  const parenEnd = findClosingParen(text, textEnd + 1);
  if (parenEnd === -1) {return null;}

  const linkText = text.substring(textStart, textEnd);
  const url = extractDestination(text.substring(urlStart, parenEnd).trim());

  return {
    html: `<a href="${escapeHtml(url)}">${parseInline(linkText)}</a>`,
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
    if (text[i] === "[") {depth++;}
    if (text[i] === "]") {
      depth--;
      if (depth === 0) {return i;}
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
    if (text[i] === "(") {depth++;}
    if (text[i] === ")") {
      depth--;
      if (depth === 0) {return i;}
    }
  }
  return -1;
}

/**
 * Extract the destination URL from a link/image URL+title string.
 * Handles angle-bracket destinations and strips optional titles.
 * E.g., `<url>` → `url`, `url "title"` → `url`
 */
function extractDestination(raw: string): string {
  // Angle-bracket destination: <url>
  if (raw.startsWith("<") && raw.endsWith(">")) {
    return raw.substring(1, raw.length - 1);
  }
  if (raw.startsWith("<")) {
    const close = raw.indexOf(">");
    if (close !== -1) {
      return raw.substring(1, close);
    }
  }
  // Split at first unescaped whitespace to separate destination from title
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === "\\" && i + 1 < raw.length) {
      i++; // skip escaped char
      continue;
    }
    if (raw[i] === " " || raw[i] === "\t" || raw[i] === "\n") {
      return raw.substring(0, i);
    }
  }
  return raw;
}

function parseDelimited(
  text: string,
  start: number,
  delimiter: string,
  openTag: string,
  closeTag: string
): { html: string; end: number } | null {
  const len = delimiter.length;
  const afterOpen = start + len;

  if (afterOpen >= text.length) {return null;}

  // Opening delimiter must not be followed by whitespace
  if (text[afterOpen] === " " || text[afterOpen] === "\t") {return null;}

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
        ((j > 0 && text[j - 1] === delimiter[0] && !(j >= 2 && text[j - 2] === "\\")) ||
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
        html: openTag + parseInline(inner) + closeTag,
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

type Token =
  | HeadingToken
  | ParagraphToken
  | CodeBlockToken
  | BlockquoteToken
  | HorizontalRuleToken
  | ListItemToken
  | TableToken;

// ─── Block-Level Tokenizer ──────────────────────────────────────────────────

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
    const fenceMatch = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (fenceMatch) {
      const fence = fenceMatch[1];
      const fenceChar = fence[0];
      const fenceLen = fence.length;
      const language = fenceMatch[2].trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length) {
        const closingMatch = lines[i].match(
          new RegExp(`^ {0,3}${fenceChar}{${fenceLen},}\\s*$`)
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

    // ATX Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+?)(?:\s+#+)?$/);
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
      const prevToken = tokens[tokens.length - 1];
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
        if (cur.trim() === "") {break;}
        // Stop on block-level markers
        if (/^\s{0,3}>/.test(cur)) {break;} // new blockquote
        if (/^(#{1,6})\s/.test(cur)) {break;} // heading
        if (/^(`{3,}|~{3,})/.test(cur)) {break;} // code fence
        if (/^(\s{0,3})([-*_])\s*(\2\s*){2,}$/.test(cur)) {break;} // hr
        if (/^\s*([-*+]|\d+[.)])\s+/.test(cur)) {break;} // list item
        if (/^\s*\|(.+\|)+\s*$/.test(cur)) {break;} // table
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
    const listItemMatch = line.match(
      /^(\s*)([-*+]|\d+[.)])(\s+)(\[[ xX]\] )?(.*)$/
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

      // Content indent = column where content actually starts
      const contentIndent =
        indent +
        marker.length +
        markerSpaces.length +
        (checkbox ? checkbox.length : 0);

      // Minimum indent for child content: anything indented past the marker
      // (sub-lists can start at indent > marker position)
      const minChildIndent = indent + 1;

      // Helper to check if a line belongs to this list item
      const belongsToItem = (lineStr: string): boolean => {
        if (lineStr.trim() === "") {return true;} // blank lines checked separately
        const lineInd = lineStr.match(/^\s*/)![0].length;
        // Lines at contentIndent are continuation text
        if (lineInd >= contentIndent) {return true;}
        // Lines between marker and content column that start a sub-list
        if (
          lineInd >= minChildIndent &&
          lineStr.match(/^\s*([-*+]|\d+[.)])\s+/)
        ) {
          return true;
        }
        return false;
      }

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

        if (!belongsToItem(cur)) {break;}

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

    // Paragraph (default)
    const paraLines: string[] = [line];
    i++;
    while (i < lines.length) {
      const nextLine = lines[i];
      // Stop paragraph on blank line
      if (nextLine.trim() === "") {break;}
      // Stop on block-level element
      if (/^(#{1,6})\s/.test(nextLine)) {break;}
      if (/^(`{3,}|~{3,})/.test(nextLine)) {break;}
      if (/^\s{0,3}>/.test(nextLine)) {break;}
      if (/^(\s{0,3})([-*_])\s*(\2\s*){2,}$/.test(nextLine)) {break;}
      if (/^\s*([-*+]|\d+[.)])\s+/.test(nextLine)) {break;}
      if (/^\s*\|(.+\|)+\s*$/.test(nextLine)) {break;}
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
    tokens.push({
      type: "paragraph",
      content: paraLines.join("\n"),
    });
    prevLineWasBlank = false;
  }

  return tokens;
}

function tryParseTable(
  lines: string[],
  start: number
): { token: TableToken; nextLine: number } | null {
  // A table needs at least a header row and a separator row
  if (start + 1 >= lines.length) {return null;}

  const headerLine = lines[start];
  const separatorLine = lines[start + 1];

  // Check separator line format: | --- | --- | or --- | --- (outer pipes optional)
  // Must contain at least one pipe and only dashes, colons, pipes, and whitespace
  if (
    !separatorLine.includes("|") ||
    !/^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(separatorLine)
  ) {return null;}

  // Check header line has at least one pipe (required to distinguish from plain text)
  if (!headerLine.includes("|")) {return null;}

  const headers = parsePipeCells(headerLine);
  const alignments = parseAlignments(separatorLine);

  const rows: string[][] = [];
  let i = start + 2;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.includes("|")) {break;}
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
    if (content[i] === "\\" && i + 1 < content.length && content[i + 1] === "|") {
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
  separatorLine: string
): ("left" | "center" | "right" | null)[] {
  const cells = parsePipeCells(separatorLine);
  return cells.map((cell) => {
    const trimmed = cell.trim();
    const left = trimmed.startsWith(":");
    const right = trimmed.endsWith(":");
    if (left && right) {return "center";}
    if (right) {return "right";}
    if (left) {return "left";}
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
        // Recursively parse blockquote content as markdown
        const innerTokens = tokenize(t.content);
        const innerHtml = tokensToHtml(innerTokens);
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

      default:
        i++;
    }
  }

  return html;
}

function emitListItems(
  tokens: Token[],
  startIdx: number
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
  listType: "bullet" | "ordered" | "task"
): "bullet" | "ordered" {
  return listType === "ordered" ? "ordered" : "bullet";
}

function emitTable(table: TableToken): string {
  let html = "<table>";

  // Header row
  html += "<thead><tr>";
  for (let c = 0; c < table.headers.length; c++) {
    const align = table.alignments[c];
    const alignAttr = align ? ` align="${align}"` : "";
    html += `<th${alignAttr}>${parseInline(table.headers[c])}</th>`;
  }
  html += "</tr></thead>";

  // Body rows
  if (table.rows.length > 0) {
    html += "<tbody>";
    for (const row of table.rows) {
      html += "<tr>";
      for (let c = 0; c < table.headers.length; c++) {
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
