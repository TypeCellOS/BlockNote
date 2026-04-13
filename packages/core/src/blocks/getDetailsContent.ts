import { DOMParser, Fragment, Schema } from "prosemirror-model";
import { mergeParagraphs } from "./defaultBlockHelpers.js";

/**
 * Parses a `<details>` element into a block's inline content + nested children.
 *
 * Given:
 *   <details>
 *     <summary>inline content here</summary>
 *     <p>child block 1</p>
 *     <p>child block 2</p>
 *   </details>
 *
 * Returns a Fragment shaped like:
 *   [inline content, blockGroup<blockContainer<child1>, blockContainer<child2>>]
 *
 * ProseMirror's "fitting" algorithm will place the inline content into the
 * block node, and lift the blockGroup into the parent blockContainer as
 * nested children. This is the same mechanism used by `getListItemContent`.
 */
export function getDetailsContent(
  details: HTMLElement,
  schema: Schema,
  nodeName: string,
): Fragment {
  const parser = DOMParser.fromSchema(schema);
  const summary = details.querySelector(":scope > summary");

  // Parse inline content from <summary>. mergeParagraphs collapses multiple
  // <p> tags into one with <br> separators so it fits a single inline node.
  let inlineContent: Fragment;
  if (summary) {
    const clone = summary.cloneNode(true) as HTMLElement;
    mergeParagraphs(clone);
    inlineContent = parser.parse(clone, {
      topNode: schema.nodes.paragraph.create(),
      preserveWhitespace: true,
    }).content;
  } else {
    inlineContent = Fragment.empty;
  }

  // Collect everything after <summary> as nested block children.
  const childrenContainer = document.createElement("div");
  childrenContainer.setAttribute("data-node-type", "blockGroup");
  let hasChildren = false;

  for (const child of Array.from(details.childNodes)) {
    if ((child as HTMLElement).tagName === "SUMMARY") {
      continue;
    }
    // Skip whitespace-only text nodes (from HTML formatting) — ProseMirror
    // would otherwise create empty paragraph blocks from them.
    if (child.nodeType === 3 && !child.textContent?.trim()) {
      continue;
    }
    hasChildren = true;
    childrenContainer.appendChild(child.cloneNode(true));
  }

  const contentNode = schema.nodes[nodeName].create({}, inlineContent);

  if (!hasChildren) {
    return contentNode.content;
  }

  // Parse children as a blockGroup. ProseMirror's fitting algorithm will
  // lift this out of the inline content node and into the parent
  // blockContainer as nested children.
  const blockGroup = parser.parse(childrenContainer, {
    topNode: schema.nodes.blockGroup.create(),
  });

  return blockGroup.content.size > 0
    ? contentNode.content.addToEnd(blockGroup)
    : contentNode.content;
}
