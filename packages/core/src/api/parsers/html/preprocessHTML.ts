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
    for (const span of Array.from(paragraph.querySelectorAll("span[style]"))) {
      if (getMSOList(span)?.toLowerCase() === "ignore") {
        marker += span.textContent;
        span.remove();
      }
    }
    marker = marker.trim();
    const tag = /^(?:\d+|[a-z]+)[.)]$/i.test(marker) ? "ol" : "ul";

    while (stack.length && stack[stack.length - 1].level > level) {
      stack.pop();
    }
    if (
      stack[stack.length - 1]?.level === level &&
      stack[stack.length - 1].element.tagName.toLowerCase() !== tag
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
      const start = Number.parseInt(marker, 10);
      if (tag === "ol" && start > 1) {
        element.setAttribute("start", String(start));
      }
      if (current) {
        current.lastItem.append(element);
      } else {
        paragraph.before(element);
      }
      current = { element, level, lastItem: item };
      stack.push(current);
    }

    current.element.append(item);
    current.lastItem = item;
    item.append(paragraph);
  }
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
    for (const child of Array.from(wrapper.children)) {
      if (child.tagName === "BR") {
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
