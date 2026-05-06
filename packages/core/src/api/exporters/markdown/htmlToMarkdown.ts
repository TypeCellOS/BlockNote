/**
 * Custom HTML-to-Markdown serializer for BlockNote.
 * Replaces the unified/rehype-remark pipeline with a direct DOM-based implementation.
 *
 * Input: HTML string from createExternalHTMLExporter
 * Output: GFM-compatible markdown string
 */

/**
 * Convert an HTML string (from BlockNote's external HTML exporter) to markdown.
 */
export function htmlToMarkdown(html: string): string {
  // Use a temporary element to parse HTML. This works in both browser and
  // server (JSDOM) environments, unlike `new DOMParser()` which may not be
  // globally available in Node.js.
  const container = document.createElement("div");
  container.innerHTML = html;
  const result = serializeChildren(container, {
    indent: "",
    inListItem: false,
  });
  return result.trim() + "\n";
}

interface SerializeContext {
  indent: string; // current indentation prefix for list nesting
  // True when the current node is being serialized as continuation content
  // of a parent list item. Used to suppress trailing blank lines that would
  // otherwise turn the parent list into a "loose" list.
  inListItem: boolean;
}

// ─── Main Serializer ─────────────────────────────────────────────────────────

function serializeChildren(node: Node, ctx: SerializeContext): string {
  let result = "";
  const children = Array.from(node.childNodes);

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    result += serializeNode(child, ctx);
  }

  return result;
}

function serializeNode(node: Node, ctx: SerializeContext): string {
  if (node.nodeType === 3 /* Node.TEXT_NODE */) {
    return node.textContent || "";
  }

  if (node.nodeType !== 1 /* Node.ELEMENT_NODE */) {
    return "";
  }

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  switch (tag) {
    case "p":
      return serializeParagraph(el, ctx);
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6":
      return serializeHeading(el, ctx);
    case "blockquote":
      return serializeBlockquote(el, ctx);
    case "pre":
      return serializeCodeBlock(el, ctx);
    case "ul":
      return serializeUnorderedList(el, ctx);
    case "ol":
      return serializeOrderedList(el, ctx);
    case "table":
      return serializeTable(el, ctx);
    case "hr":
      return ctx.indent + "***\n\n";
    case "img":
      return serializeImage(el, ctx);
    case "video":
      return serializeVideo(el, ctx);
    case "audio":
      return serializeAudio(el, ctx);
    case "embed":
      return serializeEmbed(el, ctx);
    case "figure":
      return serializeFigure(el, ctx);
    case "a":
      // Block-level link (file block)
      return serializeBlockLink(el, ctx);
    case "details":
      return serializeDetails(el, ctx);
    case "div":
      // Page break or generic container — serialize children
      return serializeChildren(el, ctx);
    case "br":
      return "";
    default:
      return serializeChildren(el, ctx);
  }
}

// ─── Block Serializers ───────────────────────────────────────────────────────

function serializeParagraph(el: HTMLElement, ctx: SerializeContext): string {
  const content = serializeInlineContent(el);
  // Trim leading/trailing hard breaks (matching remark behavior)
  const trimmed = trimHardBreaks(content);
  if (ctx.inListItem) {
    return trimmed;
  }
  return ctx.indent + trimmed + "\n\n";
}

function serializeHeading(el: HTMLElement, ctx: SerializeContext): string {
  const level = parseInt(el.tagName[1], 10);
  const prefix = "#".repeat(level) + " ";
  const content = serializeInlineContent(el);
  return ctx.indent + prefix + content + "\n\n";
}

function serializeBlockquote(el: HTMLElement, ctx: SerializeContext): string {
  // Check if blockquote contains block-level elements (like <p>)
  const blockChildren = Array.from(el.children).filter((child) => {
    const tag = child.tagName.toLowerCase();
    return ["p", "ul", "ol", "pre", "blockquote", "table", "hr"].includes(tag);
  });

  let content: string;
  if (blockChildren.length > 0) {
    // Has block-level children — serialize each
    const parts: string[] = [];
    for (const child of blockChildren) {
      const tag = child.tagName.toLowerCase();
      if (tag === "p") {
        parts.push(serializeInlineContent(child as HTMLElement));
      } else {
        const innerCtx: SerializeContext = { indent: "", inListItem: false };
        parts.push(serializeNode(child, innerCtx).trim());
      }
    }
    content = parts.join("\n\n");
  } else {
    // No block-level children — treat entire content as inline
    content = serializeInlineContent(el);
  }

  const lines = content.split("\n");
  return lines.map((line) => ctx.indent + "> " + line).join("\n") + "\n\n";
}

function serializeCodeBlock(el: HTMLElement, ctx: SerializeContext): string {
  const codeEl = el.querySelector("code");
  if (!codeEl) {return "";}

  const language =
    codeEl.getAttribute("data-language") ||
    extractLanguageFromClass(codeEl.className) ||
    "";

  // Extract code content, handling <br> elements as newlines
  const code = extractCodeContent(codeEl);

  // Use a fence longer than the longest backtick run in the code
  const longestRun = Math.max(
    0,
    ...((code.match(/`+/g) ?? []).map((run) => run.length))
  );
  const fence = "`".repeat(Math.max(3, longestRun + 1));

  // For empty code blocks, don't add a newline between the fences
  if (!code) {
    return ctx.indent + fence + language + "\n" + fence + "\n\n";
  }

  return (
    ctx.indent +
    fence +
    language +
    "\n" +
    code +
    (code.endsWith("\n") ? "" : "\n") +
    fence +
    "\n\n"
  );
}

function extractCodeContent(el: Element): string {
  let result = "";
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === 3 /* Node.TEXT_NODE */) {
      result += child.textContent || "";
    } else if (child.nodeType === 1 /* Node.ELEMENT_NODE */) {
      const tag = (child as HTMLElement).tagName.toLowerCase();
      if (tag === "br") {
        result += "\n";
      } else {
        result += extractCodeContent(child as Element);
      }
    }
  }
  return result;
}

function extractLanguageFromClass(className: string): string {
  const match = className.match(/language-(\S+)/);
  return match ? match[1] : "";
}

function serializeUnorderedList(
  el: HTMLElement,
  ctx: SerializeContext
): string {
  let result = "";
  const items = Array.from(el.children).filter(
    (child) => child.tagName.toLowerCase() === "li"
  );

  for (const item of items) {
    result += serializeListItem(item as HTMLElement, "bullet", ctx);
  }

  // Trailing blank line separates the list from the next block. Skip when
  // this list is nested inside another list item — adding it would convert
  // the parent list into a "loose" list (or break tightness).
  if (!ctx.inListItem) {
    result += "\n";
  }
  return result;
}

function serializeOrderedList(el: HTMLElement, ctx: SerializeContext): string {
  let result = "";
  const items = Array.from(el.children).filter(
    (child) => child.tagName.toLowerCase() === "li"
  );
  const startNum = parseInt(el.getAttribute("start") || "1", 10);

  for (let i = 0; i < items.length; i++) {
    const num = startNum + i;
    result += serializeListItem(items[i] as HTMLElement, "ordered", ctx, num);
  }

  if (!ctx.inListItem) {
    result += "\n";
  }
  return result;
}

function serializeListItem(
  el: HTMLElement,
  listType: "bullet" | "ordered",
  ctx: SerializeContext,
  num?: number
): string {
  // Check for checkbox (task list) - direct children only
  let checkbox: HTMLInputElement | null = null;
  let details: HTMLElement | null = null;

  for (const child of Array.from(el.children)) {
    const tag = child.tagName.toLowerCase();
    if (tag === "input" && (child as HTMLInputElement).type === "checkbox") {
      checkbox = child as HTMLInputElement;
    }
    if (tag === "details") {
      details = child as HTMLElement;
    }
  }

  let marker: string;
  let markerWidth: number;

  if (checkbox) {
    const state = checkbox.checked ? "[x]" : "[ ]";
    marker = `* ${state} `;
    // For child indentation, use bullet width (2), not full checkbox marker width
    markerWidth = 2;
  } else if (listType === "ordered") {
    marker = `${num}. `;
    markerWidth = marker.length;
  } else {
    marker = "* ";
    markerWidth = 2;
  }

  // Collect the item's inline content
  let inlineContent: string;
  let firstContentEl: Element | null;

  if (details) {
    // Toggle item: get content from summary
    const summary = details.querySelector("summary");
    const summaryP = summary?.querySelector("p");
    firstContentEl = details;
    inlineContent = summaryP ? serializeInlineContent(summaryP) : "";
  } else {
    firstContentEl = getFirstContentElement(el, checkbox);
    inlineContent = firstContentEl ? serializeInlineContent(firstContentEl) : "";
  }

  // The marker line ends with a single `\n` so that consecutive list items
  // produce a "tight" list (no blank line between markers). Continuation
  // content within the item (nested lists, continuation paragraphs, other
  // blocks) injects its own spacing as needed.
  let result = ctx.indent + marker + inlineContent + "\n";

  // Serialize child content (nested lists, continuation paragraphs, etc.)
  const childIndent = ctx.indent + " ".repeat(markerWidth);
  const childCtx: SerializeContext = { indent: childIndent, inListItem: true };

  // For toggle items, also serialize children inside the details element
  if (details) {
    const summary = details.querySelector("summary");
    for (const child of Array.from(details.children)) {
      if (child === summary) {continue;}
      const childTag = child.tagName.toLowerCase();
      if (childTag === "p") {
        const content = serializeInlineContent(child as HTMLElement);
        // Continuation paragraph needs a blank line to separate it from the
        // previous content; CommonMark would otherwise treat it as a soft
        // wrap of that content.
        result += "\n" + childIndent + content + "\n";
      } else {
        result += serializeNode(child, childCtx);
      }
    }
  }

  const children = Array.from(el.children);
  for (const child of children) {
    const childTag = child.tagName.toLowerCase();

    // Skip the first content element and checkbox
    if (child === firstContentEl || (child as HTMLElement) === checkbox) {continue;}
    if (childTag === "input") {continue;}

    // Nested lists and other block content
    if (childTag === "ul" || childTag === "ol") {
      // Nested list flows directly under the parent marker — no blank line.
      result += serializeNode(child, childCtx);
    } else if (childTag === "p") {
      // Continuation paragraph within list item — requires blank line before
      // so it isn't read as part of the marker line's text.
      const content = serializeInlineContent(child as HTMLElement);
      result += "\n" + childIndent + content + "\n";
    } else {
      // Other block-level children (code blocks, blockquotes, etc.) already
      // emit their own separating newlines; prefix with a blank line so they
      // are recognized as separate blocks.
      result += "\n" + serializeNode(child, childCtx);
    }
  }

  return result;
}

function getFirstContentElement(
  li: HTMLElement,
  checkbox: HTMLInputElement | null
): HTMLElement | null {
  for (const child of Array.from(li.children)) {
    if (child === checkbox) {continue;}
    if (child.tagName.toLowerCase() === "input") {continue;}
    const tag = child.tagName.toLowerCase();
    if (tag === "p" || tag === "span") {return child as HTMLElement;}
  }
  return null;
}

// ─── Table Serializer ────────────────────────────────────────────────────────

function serializeTable(el: HTMLElement, ctx: SerializeContext): string {
  // First, determine column count from colgroup or first row
  const colgroup = el.querySelector("colgroup");
  let colCount = 0;

  if (colgroup) {
    colCount = colgroup.querySelectorAll("col").length;
  }

  const rows: string[][] = [];
  let hasHeader = false;

  // Collect all rows, handling colspan/rowspan
  const trElements = el.querySelectorAll("tr");
  // Build a grid to handle colspan/rowspan
  const grid: (string | null)[][] = [];

  trElements.forEach((tr, rowIdx) => {
    if (!grid[rowIdx]) {grid[rowIdx] = [];}
    const cellElements = tr.querySelectorAll("th, td");
    let gridCol = 0;

    cellElements.forEach((cell) => {
      // Find next empty column in this row
      while (grid[rowIdx][gridCol] !== undefined) {gridCol++;}

      if (rowIdx === 0 && cell.tagName.toLowerCase() === "th") {
        hasHeader = true;
      }

      const content = escapeTableCell(
        serializeInlineContent(cell as HTMLElement).trim()
      );
      const colspan = parseInt(cell.getAttribute("colspan") || "1", 10);
      const rowspan = parseInt(cell.getAttribute("rowspan") || "1", 10);

      // Fill the grid
      for (let r = 0; r < rowspan; r++) {
        for (let c = 0; c < colspan; c++) {
          const ri = rowIdx + r;
          if (!grid[ri]) {grid[ri] = [];}
          grid[ri][gridCol + c] = r === 0 && c === 0 ? content : "";
        }
      }

      gridCol += colspan;
    });

    // Update colCount
    if (grid[rowIdx]) {
      colCount = Math.max(colCount, grid[rowIdx].length);
    }
  });

  // Convert grid to rows
  for (const gridRow of grid) {
    const row: string[] = [];
    for (let c = 0; c < colCount; c++) {
      row.push(gridRow && gridRow[c] !== undefined ? (gridRow[c] ?? "") : "");
    }
    rows.push(row);
  }

  if (rows.length === 0) {return "";}

  // Determine column widths
  const colWidths: number[] = [];
  for (let c = 0; c < colCount; c++) {
    let maxWidth = 3; // minimum width for separator "---"
    for (const row of rows) {
      const cellWidth = c < row.length ? row[c].length : 0;
      maxWidth = Math.max(maxWidth, cellWidth);
    }
    // Use minimum of 10 to match remark output
    colWidths.push(Math.max(maxWidth, 10));
  }

  let result = "";

  if (hasHeader) {
    result += ctx.indent + formatTableRow(rows[0], colWidths, colCount) + "\n";
    result += ctx.indent + formatSeparatorRow(colWidths, colCount) + "\n";
    for (let r = 1; r < rows.length; r++) {
      result +=
        ctx.indent + formatTableRow(rows[r], colWidths, colCount) + "\n";
    }
  } else {
    // No header — emit empty header + separator
    const emptyRow = new Array(colCount).fill("");
    result += ctx.indent + formatTableRow(emptyRow, colWidths, colCount) + "\n";
    result += ctx.indent + formatSeparatorRow(colWidths, colCount) + "\n";
    for (const row of rows) {
      result +=
        ctx.indent + formatTableRow(row, colWidths, colCount) + "\n";
    }
  }

  result += "\n";
  return result;
}

function escapeTableCell(text: string): string {
  return text.replace(/\|/g, "\\|");
}

function formatTableRow(
  cells: string[],
  colWidths: number[],
  colCount: number
): string {
  const parts: string[] = [];
  for (let c = 0; c < colCount; c++) {
    const cell = c < cells.length ? cells[c] : "";
    parts.push(" " + cell.padEnd(colWidths[c]) + " ");
  }
  return "|" + parts.join("|") + "|";
}

function formatSeparatorRow(colWidths: number[], colCount: number): string {
  const parts: string[] = [];
  for (let c = 0; c < colCount; c++) {
    parts.push(" " + "-".repeat(colWidths[c]) + " ");
  }
  return "|" + parts.join("|") + "|";
}

// ─── Media Serializers ───────────────────────────────────────────────────────

function serializeImage(el: HTMLElement, ctx: SerializeContext): string {
  const src = el.getAttribute("src") || "";
  const alt = el.getAttribute("alt") || "";
  // Empty placeholder — preserve the block-level break, matching how
  // serializeParagraph/serializeHeading emit `\n\n` for empty content.
  if (!src) {return "\n\n";}
  return ctx.indent + `![${alt}](${src})\n\n`;
}

function serializeVideo(el: HTMLElement, ctx: SerializeContext): string {
  const src =
    el.getAttribute("src") || el.getAttribute("data-url") || "";
  const name = el.getAttribute("data-name") || el.getAttribute("title") || "";
  if (!src) {return "\n\n";}
  return ctx.indent + `![${name}](${src})\n\n`;
}

function serializeAudio(el: HTMLElement, ctx: SerializeContext): string {
  const src = el.getAttribute("src") || "";
  if (!src) {return "\n\n";}
  // Audio has no visible representation in markdown; output as link with empty text
  return ctx.indent + `[](${src})\n\n`;
}

function serializeEmbed(el: HTMLElement, ctx: SerializeContext): string {
  const src = el.getAttribute("src") || "";
  if (!src) {return "\n\n";}
  return ctx.indent + `[](${src})\n\n`;
}

function serializeFigure(el: HTMLElement, ctx: SerializeContext): string {
  let result = "";

  // Find the media element
  const img = el.querySelector("img");
  const video = el.querySelector("video");
  const audio = el.querySelector("audio");
  const link = el.querySelector("a");

  if (img) {
    const src = img.getAttribute("src") || "";
    const alt = img.getAttribute("alt") || "";
    result += ctx.indent + `![${alt}](${src})\n\n`;
  } else if (video) {
    const src =
      video.getAttribute("src") || video.getAttribute("data-url") || "";
    const name =
      video.getAttribute("data-name") || video.getAttribute("title") || "";
    result += ctx.indent + `![${name}](${src})\n\n`;
  } else if (audio) {
    const src = audio.getAttribute("src") || "";
    result += ctx.indent + `[](${src})\n\n`;
  } else if (link) {
    result += serializeBlockLink(link as HTMLElement, ctx);
  }

  // Caption
  const figcaption = el.querySelector("figcaption");
  if (figcaption) {
    const caption = figcaption.textContent?.trim() || "";
    if (caption) {
      result += ctx.indent + caption + "\n\n";
    }
  }

  return result;
}

function serializeBlockLink(el: HTMLElement, ctx: SerializeContext): string {
  const href = el.getAttribute("href") || "";
  const text = el.textContent?.trim() || "";
  if (!href) {return ctx.indent + text + "\n\n";}
  return ctx.indent + formatLink(text, href) + "\n\n";
}

/**
 * Render a link, mirroring the remark-stringify behavior from
 * TypeCellOS/BlockNote#2661: when the link label equals the URL (or is
 * empty), emit the bare URL so that pasting the link into another input
 * produces a valid href instead of `<url>`-autolink brackets or redundant
 * `[url](url)` markup. Otherwise emit `[text](url)` with the URL escaped so
 * a `)` inside the URL does not prematurely close the destination.
 */
function formatLink(text: string, href: string): string {
  if (!text || text === href) {
    return href;
  }
  return `[${text}](${escapeLinkDestination(href)})`;
}

function escapeLinkDestination(url: string): string {
  return url.replace(/[\\()]/g, "\\$&");
}

function serializeDetails(el: HTMLElement, ctx: SerializeContext): string {
  // Toggle heading or toggle list item
  const summary = el.querySelector("summary");
  if (!summary) {return serializeChildren(el, ctx);}

  // Check if summary contains a heading
  const heading = summary.querySelector("h1, h2, h3, h4, h5, h6");
  if (heading) {
    let result = serializeHeading(heading as HTMLElement, ctx);
    // Also serialize non-summary children of details
    for (const child of Array.from(el.children)) {
      if (child !== summary) {
        result += serializeNode(child, ctx);
      }
    }
    return result;
  }

  // Otherwise serialize the summary content
  return serializeChildren(summary, ctx);
}

// ─── Inline Content Serializer ───────────────────────────────────────────────

function serializeInlineContent(el: Element): string {
  let result = "";

  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === 3 /* Node.TEXT_NODE */) {
      result += child.textContent || "";
    } else if (child.nodeType === 1 /* Node.ELEMENT_NODE */) {
      const childEl = child as HTMLElement;
      const tag = childEl.tagName.toLowerCase();

      switch (tag) {
        case "strong":
        case "b": {
          const inner = serializeInlineContent(childEl);
          const { content, trailing } = extractTrailingWhitespace(inner);
          if (content) {
            result += `**${content}**${trailing}`;
          } else {
            // All whitespace — just output it without emphasis
            result += trailing;
          }
          break;
        }
        case "em":
        case "i": {
          const inner = serializeInlineContent(childEl);
          const { content, trailing } = extractTrailingWhitespace(inner);
          if (content) {
            result += `*${content}*${trailing}`;
          } else {
            result += trailing;
          }
          break;
        }
        case "s":
        case "del":
          result += `~~${serializeInlineContent(childEl)}~~`;
          break;
        case "code": {
          const text = childEl.textContent || "";
          const longestRun = Math.max(
            0,
            ...((text.match(/`+/g) ?? []).map((run) => run.length))
          );
          const fence = "`".repeat(longestRun + 1);
          const needsPadding =
            text.startsWith("`") || text.endsWith("`");
          result += fence + (needsPadding ? ` ${text} ` : text) + fence;
          break;
        }
        case "u":
          // No markdown equivalent — strip the tag, keep content
          result += serializeInlineContent(childEl);
          break;
        case "a": {
          const href = childEl.getAttribute("href") || "";
          const text = serializeInlineContent(childEl);
          result += formatLink(text, href);
          break;
        }
        case "br":
          result += "\\\n";
          break;
        case "span":
          // Color spans, etc. — strip the tag, keep content
          result += serializeInlineContent(childEl);
          break;
        case "img": {
          const src = childEl.getAttribute("src") || "";
          const alt = childEl.getAttribute("alt") || "";
          result += `![${alt}](${src})`;
          break;
        }
        case "video": {
          const src =
            childEl.getAttribute("src") ||
            childEl.getAttribute("data-url") ||
            "";
          const name =
            childEl.getAttribute("data-name") ||
            childEl.getAttribute("title") ||
            "";
          result += `![${name}](${src})`;
          break;
        }
        case "p":
          // Paragraph inside inline context (e.g., table cell)
          result += serializeInlineContent(childEl);
          break;
        case "input":
          // Checkbox in task list — handled at block level
          break;
        default:
          result += serializeInlineContent(childEl);
          break;
      }
    }
  }

  return result;
}

/**
 * Extract trailing whitespace from emphasis content.
 * Moves trailing spaces outside the emphasis delimiters to produce valid markdown.
 * E.g., `<strong>Bold </strong>` → `**Bold** ` instead of `**Bold **`.
 */
function extractTrailingWhitespace(text: string): {
  content: string;
  trailing: string;
} {
  const match = text.match(/^(.*?)(\s*)$/);
  if (match) {
    return { content: match[1], trailing: match[2] };
  }
  return { content: text, trailing: "" };
}

/**
 * Escape leading character after emphasis if it could break parsing.
 * For example, "Heading" after "**Bold **" — the 'H' should be escaped
 * if the trailing space was escaped.
 */

/**
 * Trim leading/trailing hard breaks from inline content.
 * Matches remark behavior where <br> at start/end of paragraph is dropped.
 */
function trimHardBreaks(content: string): string {
  // Remove leading hard breaks
  let result = content.replace(/^(\\\n)+/, "");
  // Remove trailing hard breaks produced by `<br>`
  result = result.replace(/(\\\n)+$/, "");
  return result;
}
