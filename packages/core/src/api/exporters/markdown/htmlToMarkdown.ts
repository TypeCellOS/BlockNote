import { parseAutolinkLiteral } from "../../parsers/markdown/autolink.js";
import { wrapWithDelimiter } from "./wrapWithDelimiter.js";

/**
 * Custom HTML-to-Markdown serializer for BlockNote.
 * Replaces the unified/rehype-remark pipeline with a direct DOM-based implementation.
 *
 * Input: HTML string from createExternalHTMLExporter
 * Output: GFM-compatible markdown string
 */

/**
 * How the serializer writes the characters in text that markdown reads as
 * syntax:
 * - `"markdown"`: with escapes (for example `\*` and `https\://`), so that a
 *   markdown parser reads the text as text. An empty paragraph is a `<br>`
 *   line, so that a markdown parser makes an empty paragraph from it.
 * - `"none"`: as they are, with no escapes. An empty paragraph is a blank
 *   line. Use this for plain text that a person reads (for example the
 *   clipboard). A markdown parser can read some of this text as syntax.
 */
export type TextEscapes = "markdown" | "none";

export type HTMLToMarkdownOptions = {
  /** How to write the syntax characters in text. The default is `"markdown"`. */
  escapes?: TextEscapes;
};

/**
 * Returns the child elements of an element. In jsdom, the time of each
 * indexed access to `children` grows with the number of children. Thus,
 * `Array.from(element.children)` is slow for a large document on a server.
 * A walk over the siblings is linear.
 */
function childElements(element: Element): Element[] {
  const result: Element[] = [];
  for (
    let child = element.firstElementChild;
    child !== null;
    child = child.nextElementSibling
  ) {
    result.push(child);
  }
  return result;
}

/**
 * Convert an HTML string (from BlockNote's external HTML exporter) to markdown.
 */
export function htmlToMarkdown(
  html: string,
  options: HTMLToMarkdownOptions = {},
): string {
  // Use a temporary element to parse HTML. This works in both browser and
  // server (JSDOM) environments, unlike `new DOMParser()` which may not be
  // globally available in Node.js.
  const container = document.createElement("div");
  container.innerHTML = html;
  for (const list of Array.from(container.querySelectorAll("ul, ol"))) {
    splitListAtLevelChanges(list);
  }
  nestListItemChildren(container);
  for (const element of [container, ...container.querySelectorAll("*")]) {
    joinAdjacentLists(element);
  }
  const result = serializeChildren(container, {
    indent: "",
    inListItem: false,
    escapes: options.escapes ?? "markdown",
  });
  return result.trim() + "\n";
}

// ─── List Item Children ──────────────────────────────────────────────────────

/**
 * The external HTML exporter puts only the nested lists of a list item into
 * its `<li>`. It puts the other children of the list item (for example a
 * paragraph) after the list, with a `data-nesting-level` attribute. Markdown
 * can nest these children in the list item, so move each one back into its
 * list item. If they stay after the list, the markdown loses the nesting.
 */
function nestListItemChildren(parent: Element) {
  if (parent.tagName === "DETAILS") {
    restoreToggleChildrenOrder(parent);
  }
  for (const child of childElements(parent)) {
    const listItem = findParentListItem(child);
    if (listItem) {
      listItem.append(child);
    }
    nestListItemChildren(child);
  }
}

/**
 * For a toggle list item, the external HTML exporter puts the children in two
 * locations. The nested lists at the start of the children go after the
 * `<details>` element. The other children go into the `<details>` element.
 * Move these lists back into the `<details>` element, before the other
 * children. This restores the order of the children.
 */
function restoreToggleChildrenOrder(details: Element) {
  const summary = details.querySelector(":scope > summary");
  if (!summary || details.parentElement?.tagName !== "LI") {
    return;
  }
  let insertAfter: Element = summary;
  let next = details.nextElementSibling;
  while (next && isListElement(next)) {
    const list = next;
    next = list.nextElementSibling;
    insertAfter.after(list);
    insertAfter = list;
  }
}

/**
 * Join each list to the next list of the same type. The exporter split such
 * lists with the children of a list item. `nestListItemChildren` moved these
 * children back into the list item, so now the lists are adjacent.
 */
function joinAdjacentLists(parent: Element) {
  for (const list of childElements(parent)) {
    if (list.parentNode !== parent || !isListElement(list)) {
      continue;
    }
    let next = list.nextElementSibling;
    while (
      next &&
      next.tagName === list.tagName &&
      !next.hasAttribute("start") &&
      list.nextSibling === next
    ) {
      list.append(...Array.from(next.childNodes));
      next.remove();
      next = list.nextElementSibling;
    }
  }
}

/**
 * The external HTML exporter moves some children of a list item out of the
 * list item (see `nestListItemChildren`). Then it can add the next list item
 * to the list of these children, also if the next list item has a lower
 * nesting level. Split the list where the nesting level changes, so that each
 * list has one nesting level.
 */
function splitListAtLevelChanges(list: Element) {
  const items = childElements(list);
  const level = getNestingLevel(list);
  const splitIndex = items.findIndex(
    (item) => item.tagName === "LI" && getNestingLevel(item) !== level,
  );
  if (splitIndex <= 0) {
    return;
  }
  const rest = list.ownerDocument.createElement(list.tagName);
  rest.append(...items.slice(splitIndex));
  list.after(rest);
  splitListAtLevelChanges(rest);
}

/**
 * Find the list item that is the parent of a block that the external HTML
 * exporter moved out of the list item. This is the last list item at a lower
 * nesting level in the list right before the block. Returns `undefined` if
 * the block does not come right after a list, or if it is at the top level.
 */
function findParentListItem(block: Element): Element | undefined {
  const level = getNestingLevel(block);
  let list = block.previousElementSibling;
  let parent: Element | undefined;
  while (list && isListElement(list)) {
    const lastItem = list.lastElementChild;
    if (
      !lastItem ||
      lastItem.tagName !== "LI" ||
      getNestingLevel(lastItem) >= level
    ) {
      break;
    }
    parent = lastItem;
    list = lastItem.lastElementChild;
  }
  return parent;
}

function isListElement(element: Element): boolean {
  return element.tagName === "UL" || element.tagName === "OL";
}

/**
 * The nesting level of a block in the external HTML. For a list, this is the
 * nesting level of its list items.
 */
function getNestingLevel(element: Element): number {
  const block = isListElement(element) ? element.firstElementChild : element;
  return parseInt(block?.getAttribute("data-nesting-level") ?? "0", 10);
}

interface SerializeContext {
  indent: string; // current indentation prefix for list nesting
  // True when the current node is being serialized as continuation content
  // of a parent list item. Used to suppress trailing blank lines that would
  // otherwise turn the parent list into a "loose" list.
  inListItem: boolean;
  escapes: TextEscapes;
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
    case "math":
      return serializeMathBlock(el, ctx);
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
  const content = serializeParagraphText(el, ctx.escapes);
  if (ctx.inListItem) {
    return content;
  }
  return ctx.indent + content + "\n\n";
}

function serializeHeading(el: HTMLElement, ctx: SerializeContext): string {
  const level = parseInt(el.tagName[1], 10);
  const hashes = "#".repeat(level);
  const text = trimBlockText(serializeInlineContent(el, ctx.escapes))
    // A heading is one line, so a backslash hard break is not possible.
    // Use the HTML `<br>` tag, which the markdown parser reads as a hard
    // break.
    .split(HARD_BREAK)
    .join("<br>");
  // A `#` sequence after a space at the end of a heading line is a closing
  // sequence, and the parser removes it. Escape it to keep it as text.
  const content =
    ctx.escapes === "markdown"
      ? text.replace(/(^|[ \t])(#+)$/, "$1\\$2")
      : text;
  // An empty heading is only the `#` sequence (as in CommonMark).
  if (content === "") {
    return ctx.indent + hashes + "\n\n";
  }
  return ctx.indent + hashes + " " + content + "\n\n";
}

function serializeBlockquote(el: HTMLElement, ctx: SerializeContext): string {
  // Check if blockquote contains block-level elements (like <p>)
  const blockChildren = childElements(el).filter((child) => {
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
        parts.push(serializeBlockText(child, ctx.escapes));
      } else {
        const innerCtx: SerializeContext = {
          ...ctx,
          indent: "",
          inListItem: false,
        };
        parts.push(serializeNode(child, innerCtx).trim());
      }
    }
    content = parts.join("\n\n");
  } else {
    // No block-level children — treat entire content as inline
    content = serializeBlockText(el, ctx.escapes);
  }

  const lines = content.split("\n");
  return lines.map((line) => ctx.indent + "> " + line).join("\n") + "\n\n";
}

function serializeCodeBlock(el: HTMLElement, ctx: SerializeContext): string {
  const codeEl = el.querySelector("code");
  if (!codeEl) {
    return "";
  }

  const language =
    codeEl.getAttribute("data-language") ||
    extractLanguageFromClass(codeEl.className) ||
    "";

  // Extract the code content. A `<br>` element becomes a newline. The markdown
  // parser does not keep newlines at the end of a code block, so remove them.
  const code = extractCodeContent(codeEl).replace(/\n+$/, "");

  // Use a fence longer than the longest backtick run in the code
  const longestRun = Math.max(
    0,
    ...(code.match(/`+/g) ?? []).map((run) => run.length),
  );
  const fence = "`".repeat(Math.max(3, longestRun + 1));

  // For empty code blocks, don't add a newline between the fences
  if (!code) {
    return ctx.indent + fence + language + "\n" + ctx.indent + fence + "\n\n";
  }

  // Every (non-blank) line carries the indent - inside a list item or
  // blockquote, an unindented line would end the parent container. Blank
  // lines stay blank: they don't terminate an indented fence, and indenting
  // them would add trailing whitespace.
  const lines = [fence + language, ...code.split("\n"), fence];
  return (
    lines.map((line) => (line ? ctx.indent + line : line)).join("\n") + "\n\n"
  );
}

// The LaTeX source of a MathML element, taken from the annotation KaTeX
// embeds in its output (also what external HTML parsing reads). Falls back to
// the element's text content for MathML from other sources.
function extractMathLatexSource(el: Element): string {
  const annotation = el.querySelector(
    'annotation[encoding="application/x-tex"]',
  );
  return (annotation?.textContent ?? el.textContent ?? "").trim();
}

function serializeMathBlock(el: HTMLElement, ctx: SerializeContext): string {
  const latex = extractMathLatexSource(el);
  // Every (non-blank) line carries the indent - inside a list item or
  // blockquote, an unindented line would end the parent container.
  return (
    ["$$", ...latex.split("\n"), "$$"]
      .map((line) => (line ? ctx.indent + line : line))
      .join("\n") + "\n\n"
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
  ctx: SerializeContext,
): string {
  let result = "";
  const items = childElements(el).filter(
    (child) => child.tagName.toLowerCase() === "li",
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
  const items = childElements(el).filter(
    (child) => child.tagName.toLowerCase() === "li",
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
  num?: number,
): string {
  // Check for checkbox (task list) - direct children only
  let checkbox: HTMLInputElement | null = null;
  let details: HTMLElement | null = null;

  for (const child of childElements(el)) {
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
    inlineContent = summaryP ? serializeBlockText(summaryP, ctx.escapes) : "";
  } else {
    firstContentEl = getFirstContentElement(el, checkbox);
    inlineContent = firstContentEl
      ? serializeBlockText(firstContentEl, ctx.escapes)
      : "";
  }

  // The indent and the context for the child blocks of the item.
  const childIndent = ctx.indent + " ".repeat(markerWidth);
  const childCtx: SerializeContext = {
    ...ctx,
    indent: childIndent,
    inListItem: true,
  };

  // The marker line ends with one `\n`, so that adjacent list items make a
  // tight list (a list with no blank lines between the items). The child
  // blocks of the item add their own blank lines if necessary.
  let result =
    ctx.indent + marker + indentLines(inlineContent, childIndent) + "\n";

  // For toggle items, also serialize children inside the details element
  if (details) {
    const summary = details.querySelector("summary");
    for (const child of childElements(details)) {
      if (child !== summary) {
        result += serializeListItemChild(child, childCtx);
      }
    }
  }

  const children = childElements(el);
  for (const child of children) {
    const childTag = child.tagName.toLowerCase();

    // Skip the first content element and checkbox
    if (child === firstContentEl || (child as HTMLElement) === checkbox) {
      continue;
    }
    if (childTag === "input") {
      continue;
    }

    result += serializeListItemChild(child, childCtx);
  }

  return result;
}

/** Serialize a child block of a list item (a nested list or another block). */
function serializeListItemChild(
  child: Element,
  childCtx: SerializeContext,
): string {
  const childTag = child.tagName.toLowerCase();
  if (childTag === "ul" || childTag === "ol") {
    // A nested list comes directly after the marker line, with no blank line.
    return serializeNode(child, childCtx);
  }
  if (childTag === "p") {
    // A paragraph in a list item must have a blank line before it. If not,
    // the parser reads it as a part of the text on the marker line.
    const content = serializeParagraphText(child, childCtx.escapes);
    return (
      "\n" + childCtx.indent + indentLines(content, childCtx.indent) + "\n"
    );
  }
  // Other child blocks (for example code blocks and quotes) add their own
  // newlines after them. Put a blank line before them, so that the parser
  // reads them as separate blocks.
  return "\n" + serializeNode(child, childCtx);
}

/**
 * Put the indent at the start of each line after the first. The lines after
 * a hard break in a list item must have the indent of the list item content,
 * or they are not part of the list item.
 */
function indentLines(content: string, indent: string): string {
  return content.split("\n").join("\n" + indent);
}

function getFirstContentElement(
  li: HTMLElement,
  checkbox: HTMLInputElement | null,
): HTMLElement | null {
  for (const child of childElements(li)) {
    if (child === checkbox) {
      continue;
    }
    if (child.tagName.toLowerCase() === "input") {
      continue;
    }
    const tag = child.tagName.toLowerCase();
    if (tag === "p" || tag === "span") {
      return child as HTMLElement;
    }
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
    if (!grid[rowIdx]) {
      grid[rowIdx] = [];
    }
    const cellElements = tr.querySelectorAll("th, td");
    let gridCol = 0;

    cellElements.forEach((cell) => {
      // Find next empty column in this row
      while (grid[rowIdx][gridCol] !== undefined) {
        gridCol++;
      }

      if (rowIdx === 0 && cell.tagName.toLowerCase() === "th") {
        hasHeader = true;
      }

      const content = escapeTableCell(
        serializeInlineContent(cell, ctx.escapes).trim(),
      );
      const colspan = parseInt(cell.getAttribute("colspan") || "1", 10);
      const rowspan = parseInt(cell.getAttribute("rowspan") || "1", 10);

      // Fill the grid
      for (let r = 0; r < rowspan; r++) {
        for (let c = 0; c < colspan; c++) {
          const ri = rowIdx + r;
          if (!grid[ri]) {
            grid[ri] = [];
          }
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

  if (rows.length === 0) {
    return "";
  }

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
      result += ctx.indent + formatTableRow(row, colWidths, colCount) + "\n";
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
  colCount: number,
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
  if (!src) {
    return "\n\n";
  }
  return ctx.indent + `![${alt}](${src})\n\n`;
}

function serializeVideo(el: HTMLElement, ctx: SerializeContext): string {
  const src = el.getAttribute("src") || el.getAttribute("data-url") || "";
  const name = el.getAttribute("data-name") || el.getAttribute("title") || "";
  if (!src) {
    return "\n\n";
  }
  return ctx.indent + `![${name}](${src})\n\n`;
}

function serializeAudio(el: HTMLElement, ctx: SerializeContext): string {
  const src = el.getAttribute("src") || "";
  if (!src) {
    return "\n\n";
  }
  // Audio has no markdown syntax, so emit raw HTML. The markdown parser
  // passes <audio> blocks through verbatim and BlockNote's audio block parser
  // recognizes them, giving a clean round-trip.
  return (
    ctx.indent + `<audio src="${escapeHtmlAttr(src)}" controls></audio>\n\n`
  );
}

function serializeEmbed(el: HTMLElement, ctx: SerializeContext): string {
  const src = el.getAttribute("src") || "";
  if (!src) {
    return "\n\n";
  }
  return ctx.indent + `[](${src})\n\n`;
}

function serializeFigure(el: HTMLElement, ctx: SerializeContext): string {
  const img = el.querySelector("img");
  const video = el.querySelector("video");
  const audio = el.querySelector("audio");
  const link = el.querySelector("a");

  const figcaption = el.querySelector("figcaption");
  const captionText = figcaption?.textContent?.trim() || "";

  if (img) {
    return serializeMediaFigure(
      "img",
      img.getAttribute("src") || "",
      img.getAttribute("alt") || "",
      captionText,
      ctx,
    );
  }
  if (video) {
    const src =
      video.getAttribute("src") || video.getAttribute("data-url") || "";
    const name =
      video.getAttribute("data-name") || video.getAttribute("title") || "";
    return serializeMediaFigure("video", src, name, captionText, ctx);
  }
  if (audio) {
    return serializeMediaFigure(
      "audio",
      audio.getAttribute("src") || "",
      "",
      captionText,
      ctx,
    );
  }
  if (link) {
    return serializeBlockLink(link as HTMLElement, ctx);
  }
  return "";
}

function serializeMediaFigure(
  kind: "img" | "video" | "audio",
  src: string,
  descriptor: string,
  captionText: string,
  ctx: SerializeContext,
): string {
  if (!src) {
    return "";
  }

  // No caption + has a markdown shorthand → use it.
  if (!captionText && kind !== "audio") {
    return ctx.indent + `![${descriptor}](${src})\n\n`;
  }

  // The descriptor (alt / data-name) is dropped when it duplicates the
  // caption text; otherwise on round-trip both `name` and `caption` would
  // get set to the same string (BlockNote's HTML exporter writes alt =
  // name || caption, so a caption-only image has alt === figcaption text).
  const showDescriptor = descriptor && descriptor !== captionText;
  const descAttr = !showDescriptor
    ? ""
    : kind === "img"
      ? ` alt="${escapeHtmlAttr(descriptor)}"`
      : kind === "video"
        ? ` data-name="${escapeHtmlAttr(descriptor)}"`
        : "";

  const tag =
    kind === "img"
      ? `<img${descAttr} src="${escapeHtmlAttr(src)}">`
      : `<${kind} src="${escapeHtmlAttr(src)}"${descAttr} controls></${kind}>`;

  const captionPart = captionText
    ? `<figcaption>${escapeHtmlText(captionText)}</figcaption>`
    : "";
  return ctx.indent + `<figure>${tag}${captionPart}</figure>\n\n`;
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function serializeBlockLink(el: HTMLElement, ctx: SerializeContext): string {
  const href = el.getAttribute("href") || "";
  const text = el.textContent?.trim() || "";
  if (!href) {
    return ctx.indent + text + "\n\n";
  }
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
  if (!text) {
    return href;
  }
  if (text === href) {
    const autolink = parseAutolinkLiteral(href);
    if (
      !/^(https?:\/\/|www\.)/i.test(href) ||
      (autolink?.href === href && autolink.value === href)
    ) {
      return href;
    }
  }
  return `[${text}](${escapeLinkDestination(href)})`;
}

function escapeLinkDestination(url: string): string {
  return url.replace(/[\\()]/g, "\\$&");
}

/**
 * The mark at the start and at the end of a bare URL in serialized inline
 * content. The HTML parser removes the NUL character from text, thus the
 * content cannot contain the mark.
 */
const BARE_URL_MARK = "\0";

/**
 * Select the form of each marked bare URL. The markdown parser reads a bare
 * URL as an autolink, and the autolink continues up to the next whitespace.
 * If text comes right after the URL (for example `https://a.com/x` before
 * `y`), the parser reads a different URL. Also, the parser does not read an
 * autolink right after a letter or a digit. In these conditions, write the
 * URL in angle brackets (`<https://a.com/x>`). The parser reads this form as
 * exactly this URL.
 */
function resolveBareUrls(content: string, escapes: TextEscapes): string {
  let result = content;
  // Start at the end, so that the text after each URL is final.
  let end = result.lastIndexOf(BARE_URL_MARK);
  while (end !== -1) {
    const start = result.lastIndexOf(BARE_URL_MARK, end - 1);
    const url = result.slice(start + 1, end);
    const before = result.slice(0, start);
    const after = result.slice(end + 1);
    // The part that the parser reads as an autolink candidate.
    const autolink = parseAutolinkLiteral(
      (url + after).match(/^[^\s<>]+/)?.[0] ?? url,
    );
    // Plain text (no escapes) always has the bare URL.
    const isBare =
      escapes === "none" ||
      (!/[A-Za-z0-9_]$/.test(before) &&
        autolink?.value === url &&
        autolink.href === url);
    result = before + (isBare ? url : `<${url}>`) + after;
    end = result.lastIndexOf(BARE_URL_MARK, start - 1);
  }
  return result;
}

function serializeDetails(el: HTMLElement, ctx: SerializeContext): string {
  // Toggle heading or toggle list item
  const summary = el.querySelector("summary");
  if (!summary) {
    return serializeChildren(el, ctx);
  }

  // Check if summary contains a heading
  const heading = summary.querySelector("h1, h2, h3, h4, h5, h6");
  if (heading) {
    let result = serializeHeading(heading as HTMLElement, ctx);
    // Also serialize non-summary children of details
    for (const child of childElements(el)) {
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

/** Serialize the inline content of an element (for example a paragraph). */
function serializeInlineContent(el: Element, escapes: TextEscapes): string {
  mergeSameRuns(el, escapes);
  return resolveBareUrls(
    serializeInlineNodes(el, { inLink: false, escapes }),
    escapes,
  );
}

/** The inline elements that have a markdown syntax. */
const MARKDOWN_INLINE_TAGS = new Set([
  "STRONG",
  "B",
  "EM",
  "I",
  "S",
  "DEL",
  "CODE",
  "A",
]);

/**
 * The external HTML exporter writes each run of text with its own elements.
 * Two adjacent runs can have a difference that markdown does not keep.
 * Examples are a text color, an underline, and a link that the serializer
 * writes as plain text. After a parse, these runs are one run, so the
 * markdown changes. To prevent this, remove the elements that have no
 * markdown syntax. Then merge the adjacent runs that have the same elements.
 */
function mergeSameRuns(el: Element, escapes: TextEscapes) {
  for (const link of Array.from(el.querySelectorAll("a"))) {
    if (isWrittenAsText(link, escapes)) {
      link.replaceWith(...Array.from(link.childNodes));
    }
  }
  for (const wrapper of Array.from(el.querySelectorAll("span, u"))) {
    wrapper.replaceWith(...Array.from(wrapper.childNodes));
  }
  el.normalize();
  unwrapWhitespaceRuns(el);
  mergeSameSiblingRuns(el);
}

/** The inline elements with delimiters that need text that is not whitespace. */
const DELIMITER_TAGS = new Set(["STRONG", "B", "EM", "I", "S", "DEL"]);

/**
 * A run of only whitespace cannot have a delimiter of its own: `** **` is
 * not bold. Thus, such a run keeps only the elements that a run next to it
 * continues (the same tag before or after it). The other elements have no
 * effect in markdown, and the exporter removes them. Then, for example,
 * `<s>a</s><strong><s> </s></strong><s>b</s>` becomes one strike run. Without
 * this, the strike run splits at the space.
 */
function unwrapWhitespaceRuns(el: Element) {
  for (const element of Array.from(el.querySelectorAll("*"))) {
    if (
      DELIMITER_TAGS.has(element.tagName) &&
      (element.textContent ?? "").trim() === "" &&
      !continuesNeighbor(element)
    ) {
      element.replaceWith(...Array.from(element.childNodes));
    }
  }
}

/** Returns true if the node before or after the element has the same tag. */
function continuesNeighbor(element: Element): boolean {
  return [element.previousSibling, element.nextSibling].some(
    (neighbor) =>
      neighbor?.nodeType === 1 &&
      (neighbor as Element).tagName === element.tagName,
  );
}

function mergeSameSiblingRuns(parent: Node) {
  let child = parent.firstChild;
  while (child) {
    const next = child.nextSibling;
    const key = getRunKey(child);
    if (next && key !== undefined && key === getRunKey(next)) {
      getRunText(child).appendData(getRunText(next).data);
      next.remove();
      continue;
    }
    if (next && isSameElement(child, next)) {
      // For example `<em><s>a</s></em><em>b</em>`. Without the merge, the
      // markdown closes and opens the same delimiter at one position
      // (`*~~a~~**b*`), and the parser reads `**` as text.
      (child as Element).append(...Array.from(next.childNodes));
      next.remove();
      continue;
    }
    mergeSameSiblingRuns(child);
    child = next;
  }
}

/** Returns true for two elements with the same markdown syntax: the same tag, and the same link. */
function isSameElement(a: Node, b: Node): boolean {
  if (a.nodeType !== 1 || b.nodeType !== 1) {
    return false;
  }
  const x = a as Element;
  const y = b as Element;
  return (
    MARKDOWN_INLINE_TAGS.has(x.tagName) &&
    x.tagName === y.tagName &&
    x.getAttribute("href") === y.getAttribute("href")
  );
}

/**
 * A key for a run of text: the chain of its markdown elements. Returns
 * `undefined` if the node is not a run (an element with more than one
 * child, or an element without markdown syntax).
 */
function getRunKey(node: Node): string | undefined {
  if (node.nodeType === 3 /* Node.TEXT_NODE */) {
    return "";
  }
  if (
    node.nodeType !== 1 /* Node.ELEMENT_NODE */ ||
    node.childNodes.length !== 1
  ) {
    return undefined;
  }
  const el = node as Element;
  if (!MARKDOWN_INLINE_TAGS.has(el.tagName)) {
    return undefined;
  }
  const childKey = getRunKey(el.firstChild!);
  if (childKey === undefined) {
    return undefined;
  }
  return `${el.tagName}[${el.getAttribute("href") ?? ""}]>${childKey}`;
}

/**
 * Returns true if the serializer writes the link as plain text: a link with
 * text that is the same as its URL, if the URL is not an autolink.
 */
function isWrittenAsText(link: Element, escapes: TextEscapes): boolean {
  const href = link.getAttribute("href") || "";
  const text = serializeInlineNodes(link, { inLink: true, escapes });
  const autolink = parseAutolinkLiteral(href);
  return (
    text !== "" &&
    formatLink(text, href) === href &&
    !(autolink?.value === href && autolink.href === href)
  );
}

/** The text node of a run (see `getRunKey`). */
function getRunText(node: Node): Text {
  return node.nodeType === 3 ? (node as Text) : getRunText(node.firstChild!);
}

/** The options for the serialization of inline nodes. */
type InlineOptions = {
  /** True for the text of a link, where the parser does not read autolinks. */
  inLink: boolean;
  escapes: TextEscapes;
};

const BOLD_TAGS = new Set(["STRONG", "B"]);
const ITALIC_TAGS = new Set(["EM", "I"]);

/** A character next to which an underscore delimiter cannot open or close. */
const WORD_CHAR = /[\p{L}\p{N}_]/u;

/**
 * The delimiter of emphasis (`star` is `*` or `**`) at the start or the end
 * of a parent with the other emphasis (`parentTags`). The two delimiters are
 * next to each other there, and give a run like `***` (`**a *b***`), which
 * the parser does not read. Thus, the delimiter is then `_` or `__`
 * (`**a _b_**`), if the underscores can open and close: the character on
 * the other side of the element is not a letter, a digit or `_`. The
 * content must not contain `_`: the parser reads it as a delimiter. An
 * element that is the only child stays with `*` (`***a***`): the parser
 * reads that.
 */
function edgeDelimiter(
  element: Element,
  content: string,
  star: string,
  parentTags: ReadonlySet<string>,
): string {
  const parent = element.parentElement;
  const first = element.previousSibling === null;
  const last = element.nextSibling === null;
  if (
    parent === null ||
    !parentTags.has(parent.tagName) ||
    first === last ||
    content.includes("_")
  ) {
    return star;
  }
  const before = first
    ? ""
    : (element.previousSibling?.textContent ?? "").slice(-1);
  const after = last ? "" : (element.nextSibling?.textContent ?? "").charAt(0);
  return WORD_CHAR.test(before) || WORD_CHAR.test(after)
    ? star
    : star.replaceAll("*", "_");
}

/**
 * The delimiter of a bold run. It is `**`, but after italic text (which ends
 * with `*`) the result would be `*a***b**`, which the parser does not read
 * as italic and bold. Then the delimiter is `__`, if the bold run can close
 * there: the character after it is not a letter, a digit or `_`.
 */
function strongDelimiter(
  before: string,
  content: string,
  next: Node | null,
): string {
  const after = next?.textContent?.[0] ?? "";
  return before.endsWith("*") &&
    !/^\s/.test(content) &&
    !content.includes("_") &&
    !WORD_CHAR.test(after)
    ? "__"
    : "**";
}

/** Serialize inline nodes. */
function serializeInlineNodes(el: Element, options: InlineOptions): string {
  let result = "";

  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === 3 /* Node.TEXT_NODE */) {
      result += escapeMarkdownText(child.textContent || "", options);
    } else if (child.nodeType === 1 /* Node.ELEMENT_NODE */) {
      const childEl = child as HTMLElement;
      const tag = childEl.tagName.toLowerCase();

      switch (tag) {
        case "strong":
        case "b": {
          const content = serializeInlineNodes(childEl, options);
          const edge = edgeDelimiter(childEl, content, "**", ITALIC_TAGS);
          result += wrapWithDelimiter(
            content,
            edge !== "**"
              ? edge
              : strongDelimiter(result, content, childEl.nextSibling),
          );
          break;
        }
        case "em":
        case "i": {
          const content = serializeInlineNodes(childEl, options);
          result += wrapWithDelimiter(
            content,
            edgeDelimiter(childEl, content, "*", BOLD_TAGS),
          );
          break;
        }
        case "s":
        case "del":
          result += wrapWithDelimiter(
            serializeInlineNodes(childEl, options),
            "~~",
          );
          break;
        case "code": {
          const text = childEl.textContent || "";
          const longestRun = Math.max(
            0,
            ...(text.match(/`+/g) ?? []).map((run) => run.length),
          );
          const fence = "`".repeat(longestRun + 1);
          // The parser removes one space from each side of a code span that
          // starts and ends with a space (and has other characters). Add a
          // space on each side to keep these spaces.
          const needsPadding =
            text.startsWith("`") ||
            text.endsWith("`") ||
            (text.startsWith(" ") && text.endsWith(" ") && /[^ ]/.test(text));
          result += fence + (needsPadding ? ` ${text} ` : text) + fence;
          break;
        }
        case "u":
          // No markdown equivalent — strip the tag, keep content
          result += serializeInlineNodes(childEl, options);
          break;
        case "a": {
          const href = childEl.getAttribute("href") || "";
          const text = serializeInlineNodes(childEl, {
            ...options,
            inLink: true,
          });
          const link = formatLink(text, href);
          const autolink = parseAutolinkLiteral(href);
          if (
            link === href &&
            autolink?.value === href &&
            autolink.href === href
          ) {
            // The text after a bare URL can become part of the URL. Mark
            // the URL, and select its form when the text after it is known
            // (see `resolveBareUrls`).
            result += BARE_URL_MARK + href + BARE_URL_MARK;
            break;
          }
          // A `!` before `[` starts an image. Escape a `!` at the end of the
          // text before the link. (A `!` after an odd number of backslashes
          // has an escape already.)
          if (
            options.escapes === "markdown" &&
            link.startsWith("[") &&
            /(^|[^\\])(\\\\)*!$/.test(result)
          ) {
            result = result.slice(0, -1) + "\\!";
          }
          result += link;
          break;
        }
        case "br":
          result += "\\\n";
          break;
        case "math": {
          // Inline math — emit its LaTeX source as a math span. Collapsed to
          // a single line, as $...$ spans cannot contain newlines.
          const latex = extractMathLatexSource(childEl)
            .split("\n")
            .map((line) => line.trim())
            .join(" ");
          result += `$${latex}$`;
          break;
        }
        case "span":
          // Color spans, etc. — strip the tag, keep content
          result += serializeInlineNodes(childEl, options);
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
          result += serializeInlineNodes(childEl, options);
          break;
        case "input":
          // Checkbox in task list — handled at block level
          break;
        default:
          result += serializeInlineNodes(childEl, options);
          break;
      }
    }
  }

  return result;
}

/**
 * Escape the characters in a text node that the markdown parser reads as
 * inline syntax, so that the text stays text:
 *
 * - `*`, `` ` ``, `~`, `[` and `]` always get an escape.
 * - `_` gets an escape, but not between two letters or digits (as in
 *   `snake_case`), where the parser does not read it as emphasis. A `_` next
 *   to a different `_` gets an escape, because the parser sees the backslash
 *   of an escaped `_` as a character that is not a word character.
 * - `<` gets an escape where the parser reads raw HTML or an autolink, so text
 *   like `<details>` stays text. A `<` before a space or a digit stays as it
 *   is, as in `1 < 2`.
 * - `\` gets an escape before an ASCII punctuation character, before
 *   whitespace and at the end of the text node. The serializer can move
 *   whitespace out of emphasis, and the next node can start with
 *   punctuation, so a delimiter can come right after the backslash.
 * - The start of a URL (`http://`, `https://` or `www.`) gets an escape, so
 *   that the parser does not read it as a link. This is not necessary in the
 *   text of a link (`inLink`), where the parser does not read links.
 *
 * If `escapes` is `"none"`, the text stays as it is.
 */
function escapeMarkdownText(text: string, options: InlineOptions): string {
  if (options.escapes === "none") {
    return text;
  }
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    switch (char) {
      case "*":
      case "`":
      case "~":
      case "[":
      case "]":
        result += "\\" + char;
        break;
      case "_":
        result +=
          isLetterOrDigit(text[i - 1]) && isLetterOrDigit(next)
            ? char
            : "\\" + char;
        break;
      case "<":
        result += next !== undefined && /[A-Za-z/!?]/.test(next) ? "\\<" : "<";
        break;
      case "\\":
        result +=
          next === undefined ||
          /\s/.test(next) ||
          ASCII_PUNCTUATION.includes(next)
            ? "\\\\"
            : "\\";
        break;
      default:
        result += char;
    }
  }
  if (!options.inLink) {
    // Put a backslash before the `:` or the `.`. The parser reads an
    // autolink only after a character that is not a word character.
    result = result.replace(
      /(^|[^A-Za-z0-9_])(https?(?=:\/\/)|www(?=\.))/gi,
      "$1$2\\",
    );
  }
  return result;
}

/**
 * The ASCII punctuation characters. A backslash before one of these
 * characters is an escape in markdown.
 */
const ASCII_PUNCTUATION = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";

function isLetterOrDigit(char: string | undefined): boolean {
  return char !== undefined && /[A-Za-z0-9]/.test(char);
}

/**
 * Serialize the inline content of a block, for use as the text of a block
 * line: remove the whitespace that markdown cannot keep, and escape the block
 * syntax at the start of each line.
 */
function serializeBlockText(el: Element, escapes: TextEscapes): string {
  const text = trimBlockText(serializeInlineContent(el, escapes));
  return escapes === "markdown" ? escapeLineStarts(text) : text;
}

/**
 * Serialize the text of a paragraph. Markdown has no syntax for an empty
 * paragraph, so write it as a `<br>` line. The markdown parser makes an empty
 * paragraph from this line. In plain text (`escapes` is `"none"`), an empty
 * paragraph is a blank line.
 */
function serializeParagraphText(el: Element, escapes: TextEscapes): string {
  const text = serializeBlockText(el, escapes);
  return text === "" && escapes === "markdown" ? "<br>" : text;
}

/** A serialized hard break: a backslash at the end of the line. */
const HARD_BREAK = "\\\n";

/**
 * Remove the spaces, tabs and hard breaks at the start and at the end of a
 * block's text. Also remove the spaces and tabs at the start of each line
 * after a hard break. The markdown parser removes all of them. If the
 * serializer keeps them, the result changes after a round trip. Also,
 * markdown has no syntax for a hard break at the end of a block. There, the
 * backslash is a literal character.
 */
function trimBlockText(content: string): string {
  return content
    .replace(/^(?:\\\n|[ \t])+/, "")
    .replace(/(?:\\\n|[ \t])+$/, "")
    .replace(/\\\n[ \t]+/g, HARD_BREAK);
}

/**
 * Escape the start of each line of a block's text where the markdown parser
 * reads block syntax (for example a heading, a quote, a list item or a table
 * row), so that the line stays text.
 */
function escapeLineStarts(content: string): string {
  return content.split(HARD_BREAK).map(escapeLineStart).join(HARD_BREAK);
}

function escapeLineStart(line: string): string {
  // A heading (`# x`), a quote (`> x`), a bullet list item (`- x`, `+ x`), a
  // thematic break (`- - -`), a setext heading underline (`---`, `===`), a
  // table row (`| x |`) or a table delimiter row (`--- | ---`).
  if (
    /^#{1,6}(?=[ \t]|$)/.test(line) ||
    /^>/.test(line) ||
    /^[-+](?=[ \t]|$)/.test(line) ||
    /^-[- \t]*$/.test(line) ||
    /^=+[ \t]*$/.test(line) ||
    /^\|/.test(line) ||
    /^[-:| \t]*\|[-:| \t]*$/.test(line)
  ) {
    return "\\" + line;
  }
  // A numbered list item (`1. x`, `1) x`).
  return line.replace(/^(\d+)([.)])(?=[ \t]|$)/, "$1\\$2");
}
