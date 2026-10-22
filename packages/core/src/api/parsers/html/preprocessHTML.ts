import { EMPTY_BLOCK_PLACEHOLDER } from "../../exporters/html/util/serializeBlocksExternalHTML.js";

/** Transforms source HTML before BlockNote parses its blocks and inline content. */
export type HTMLPreprocessor = (html: string) => string;

// Check the original string: attributes on <html> are lost when parsing a fragment.
const wordHTML =
  /urn:schemas-microsoft-com:office:word|<meta\b[^>]*Word\.Document|mso-list\s*:\s*l\d+\s+level\d+/i;
const googleDocsWrapper = '[id^="docs-internal-guid-"]';

// Unknown CSS declarations such as mso-list are discarded by CSSStyleDeclaration.
function getMSOList(element: Element): string | undefined {
  return element
    .getAttribute("style")
    ?.match(/(?:^|;)\s*mso-list\s*:\s*([^;]+)/i)?.[1]
    .trim();
}

function normalizeWordLists(root: HTMLElement) {
  const stack: {
    element: HTMLElement;
    level: number;
    lastItem: HTMLLIElement;
    nextNumber: number | undefined;
  }[] = [];
  let listID: string | undefined;

  for (const paragraph of Array.from(root.querySelectorAll("p[style]"))) {
    const declaration = getMSOList(paragraph);
    const match = declaration?.match(/^l(\d+)\s+level(\d+)\s+lfo(\d+)$/i);
    if (!match) {
      continue;
    }

    const level = Number(match[2]);
    const id = `${match[1]}:${match[3]}`;
    if (
      id !== listID ||
      paragraph.previousElementSibling !== stack[0]?.element
    ) {
      stack.length = 0;
    }
    listID = id;

    let marker = "";
    const markers: Element[] = [];
    for (const span of Array.from(paragraph.querySelectorAll("span[style]"))) {
      if (
        getMSOList(span)?.toLowerCase() === "ignore" &&
        !markers.some((parent) => parent.contains(span))
      ) {
        marker += span.textContent;
        markers.push(span);
      }
    }
    marker = marker.trim();
    const numericMarker = marker.match(/^(?:([0-9]+)[.)]|\(([0-9]+)\))$/);
    const start = numericMarker
      ? Number(numericMarker[1] ?? numericMarker[2])
      : undefined;
    const ordered = numericMarker || /^[a-z]+[.)]$/i.test(marker);
    // Do not discard labels we cannot represent, such as multilevel "1.2.".
    // Leave these as paragraphs with their original marker and formatting.
    if (
      (!ordered && marker && !/^[·•o▪●○■□‣⁃\-\uF000-\uF8FF]$/u.test(marker)) ||
      (start !== undefined && !Number.isSafeInteger(start))
    ) {
      stack.length = 0;
      continue;
    }
    const tag = ordered ? "ol" : "ul";
    for (const span of markers) {
      span.remove();
    }

    while (stack.length && stack[stack.length - 1].level > level) {
      stack.pop();
    }
    if (
      stack[stack.length - 1]?.level === level &&
      (stack[stack.length - 1].element.tagName.toLowerCase() !== tag ||
        (start !== undefined && stack[stack.length - 1].nextNumber !== start))
    ) {
      stack.pop();
    }

    const item = root.ownerDocument.createElement("li");
    // Block properties are parsed from the li, while the paragraph below keeps
    // its styles for inline-content parsing.
    const style = paragraph.getAttribute("style");
    if (style) {
      item.setAttribute("style", style);
    }
    let current = stack[stack.length - 1];
    if (!current || current.level !== level) {
      const element = root.ownerDocument.createElement(tag);
      if (start !== undefined) {
        element.setAttribute("start", String(start));
      }
      if (current) {
        current.lastItem.append(element);
      } else {
        paragraph.before(element);
      }
      current = { element, level, lastItem: item, nextNumber: undefined };
      stack.push(current);
    }

    current.element.append(item);
    current.lastItem = item;
    current.nextNumber = start === undefined ? undefined : start + 1;
    item.append(paragraph);
  }
}

// Google Docs uses direct BR children for empty blocks, but copied inline
// fragments use those same BR elements for hard breaks. Only replace breaks
// bounded by blocks, other breaks, or the edge of the wrapper.
function isBlockBoundary(node: ChildNode | undefined): boolean {
  if (!node) {
    return true;
  }
  return (
    node.nodeType === 1 &&
    /^(BR|P|DIV|H[1-6]|UL|OL|TABLE|BLOCKQUOTE|PRE|HR|FIGURE)$/.test(
      node.nodeName,
    )
  );
}

/**
 * Normalizes Microsoft Word lists and paragraph ends, and Google Docs blank
 * paragraphs. Other HTML is left unchanged. This is not an HTML sanitizer.
 *
 * Call this from a custom `preprocessHTML` callback to extend the built-in behavior.
 */
export function defaultHTMLPreprocessor(html: string): string {
  const isWord = wordHTML.test(html);
  if (!isWord && !html.includes("docs-internal-guid-")) {
    return html;
  }

  // Keep imported resources inert, as in nestedListsToBlockNoteStructure.
  const document = globalThis.document.implementation.createHTMLDocument("");
  const root = document.createElement("div");
  root.innerHTML = html;

  if (isWord) {
    for (const end of Array.from(root.getElementsByTagName("o:p"))) {
      const paragraph = end.closest("p");
      end.remove();
      if (
        paragraph &&
        !paragraph.textContent?.trim() &&
        !paragraph.querySelector(
          "br, img, svg, video, audio, iframe, object, input",
        )
      ) {
        paragraph.append(EMPTY_BLOCK_PLACEHOLDER);
      }
    }
    normalizeWordLists(root);
  }

  for (const wrapper of root.querySelectorAll(googleDocsWrapper)) {
    const children = Array.from(wrapper.childNodes).filter(
      (node) =>
        node.nodeType !== 8 &&
        (node.nodeType !== 3 || !!node.textContent?.trim()),
    );
    for (const [index, child] of children.entries()) {
      if (
        child.nodeName === "BR" &&
        isBlockBoundary(children[index - 1]) &&
        isBlockBoundary(children[index + 1])
      ) {
        const paragraph = document.createElement("p");
        // The schema drops empty paragraphs; use the same temporary placeholder
        // as the HTML exporter. HTMLToBlocks removes it after parsing.
        paragraph.textContent = EMPTY_BLOCK_PLACEHOLDER;
        child.replaceWith(paragraph);
      }
    }
  }
  return root.innerHTML;
}
