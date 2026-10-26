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

function getWordListInfo(element: Element) {
  const match = getMSOList(element)?.match(/^l(\d+)\s+level(\d+)\s+lfo(\d+)$/i);
  return match
    ? { level: Number(match[2]), id: `${match[1]}:${match[3]}` }
    : undefined;
}

function isWordListWhitespace(node: Node) {
  return (
    node.nodeType === 8 || (node.nodeType === 3 && !node.textContent?.trim())
  );
}

// Word sometimes wraps a native level-two list in an otherwise empty list.
// Only peel those wrappers when they contain nothing else (including text).
function getWordNativeList(outer: Element) {
  let list = outer;
  while (true) {
    const children = Array.from(list.childNodes).filter(
      (node) => !isWordListWhitespace(node),
    );
    const child = children[0];
    if (
      children.length !== 1 ||
      !(child instanceof Element) ||
      !/^(UL|OL)$/.test(child.tagName)
    ) {
      break;
    }
    list = child;
  }
  const items = Array.from(list.childNodes).filter(
    (node) => !isWordListWhitespace(node),
  );
  if (!items.every((item) => item instanceof HTMLLIElement)) {
    return undefined;
  }
  const first = items[0];
  const info = first && getWordListInfo(first);
  if (
    !info ||
    !items.every((item) => {
      const itemInfo = getWordListInfo(item);
      return itemInfo?.id === info.id && itemInfo.level === info.level;
    })
  ) {
    return undefined;
  }
  return { list, items, ...info };
}

function normalizeWordLists(root: HTMLElement) {
  const stack: {
    element: Element;
    level: number;
    lastItem: HTMLLIElement;
  }[] = [];
  let listID: string | undefined;

  for (const paragraph of root.querySelectorAll("p[style], ul, ol")) {
    // Native list content already has its own structure. In particular, do not
    // turn a styled paragraph inside an li into a second list item.
    if (paragraph.parentElement?.closest("ul, ol, li")) {
      continue;
    }
    const native = paragraph.tagName !== "P";
    const nativeList = native ? getWordNativeList(paragraph) : undefined;
    const info = native ? nativeList : getWordListInfo(paragraph);
    if (!info) {
      continue;
    }
    const { level, id } = info;
    let previous = paragraph.previousSibling;
    while (previous && isWordListWhitespace(previous)) {
      previous = previous.previousSibling;
    }
    if (id !== listID || previous !== stack[0]?.element) {
      stack.length = 0;
    }
    listID = id;

    while (stack.length && stack[stack.length - 1].level > level) {
      stack.pop();
    }

    if (nativeList) {
      const current = stack[stack.length - 1];
      const lastItem = nativeList.items[nativeList.items.length - 1];
      if (current?.level === level) {
        if (current.element.tagName !== nativeList.list.tagName) {
          stack.length = 0;
          continue;
        }
        current.element.append(...nativeList.list.childNodes);
        current.lastItem = lastItem;
        paragraph.remove();
      } else if (current && level === current.level + 1) {
        current.lastItem.append(nativeList.list);
        if (paragraph !== nativeList.list) {
          paragraph.remove();
        }
        stack.push({ element: nativeList.list, level, lastItem });
      } else if (!current && paragraph === nativeList.list) {
        stack.push({ element: nativeList.list, level, lastItem });
      } else {
        // A missing parent or a skipped level is not enough evidence to move
        // an existing list under an unrelated preceding item.
        stack.length = 0;
      }
      continue;
    }

    let marker = "";
    const markers: Element[] = [];
    for (const span of paragraph.querySelectorAll("span[style]")) {
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
    // Firefox can put the source ID on the selected paragraph itself. Its BRs
    // are hard breaks, not sibling paragraphs. Only fragment containers can
    // expand direct BRs into paragraphs (never textblocks or inline spans).
    if (
      !wrapper.matches("b, div") ||
      wrapper.parentElement?.closest("p, h1, h2, h3, h4, h5, h6, pre")
    ) {
      continue;
    }
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
