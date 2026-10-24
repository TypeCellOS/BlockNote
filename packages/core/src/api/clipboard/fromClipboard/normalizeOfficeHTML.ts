import { EMPTY_BLOCK_PLACEHOLDER } from "../../exporters/html/util/serializeBlocksExternalHTML.js";

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
    let previous = paragraph.previousSibling;
    while (
      previous &&
      (previous.nodeType === 8 ||
        (previous.nodeType === 3 && !previous.textContent?.trim()))
    ) {
      previous = previous.previousSibling;
    }
    if (id !== listID || previous !== stack[0]?.element) {
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
    const ordered = /^(?:[0-9]+[.)]|\([0-9]+\))$/.test(marker);
    // Do not discard labels we cannot represent, such as multilevel "1.2.".
    // Leave these as paragraphs with their original marker and formatting.
    if (!ordered && marker && !/^[·•o▪●○■□‣⁃\-\uF0B7]$/u.test(marker)) {
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
      stack[stack.length - 1].element.tagName.toLowerCase() !== tag
    ) {
      stack.pop();
    }

    const item = root.ownerDocument.createElement("li");
    // Block properties are parsed from the li, while the paragraph below keeps
    // its styles for inline-content parsing.
    item.setAttribute("style", paragraph.getAttribute("style")!);
    let current = stack[stack.length - 1];
    if (!current || current.level !== level) {
      const element = root.ownerDocument.createElement(tag);
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
 */
export function normalizeOfficeHTML(html: string): string {
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
    // Direct BRs represent blank paragraphs only in block-level fragments.
    if (
      Array.from(wrapper.childNodes).some(
        (node) =>
          (node.nodeType === 3 && !!node.textContent?.trim()) ||
          (node.nodeType === 1 &&
            !/^(BR|P|DIV|H[1-6]|UL|OL|TABLE|BLOCKQUOTE|PRE|HR|FIGURE)$/.test(
              node.nodeName,
            )),
      )
    ) {
      continue;
    }
    for (const child of wrapper.querySelectorAll(":scope > br")) {
      const paragraph = document.createElement("p");
      paragraph.textContent = EMPTY_BLOCK_PLACEHOLDER;
      child.replaceWith(paragraph);
    }
  }
  return root.innerHTML;
}
