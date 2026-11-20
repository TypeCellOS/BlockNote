import type { Node } from "prosemirror-model";

/**
 * A heading listed in the table of contents.
 */
export type TableOfContentsEntry = {
  /** The id of the heading block. */
  readonly blockId: string;
  /** The heading's text, trimmed. */
  readonly title: string;
  /** The heading's `level` prop. */
  readonly level: number;
  /**
   * The entry's depth in the outline: 0 for the shallowest heading level in
   * the document, 1 for the level below it, and so on.
   */
  readonly depth: number;
};

type Heading = {
  blockId: string;
  title: string;
  level: number;
  /** Position of the heading's `blockContainer`. */
  pos: number;
};

/**
 * The document's headings with text, in document order, including headings
 * nested in other blocks (list items, toggles, columns). Only block nodes are
 * visited, never inline content.
 */
export function collectHeadings(doc: Node): Heading[] {
  const headings: Heading[] = [];
  doc.descendants((node, pos, parent) => {
    if (!node.type.isInGroup("blockContent")) {
      return true;
    }
    const level = node.attrs.level;
    const blockId = parent?.attrs.id;
    if (
      node.type.name === "heading" &&
      typeof level === "number" &&
      typeof blockId === "string"
    ) {
      const title = node.textContent.trim();
      if (title) {
        // The content node is the first child of its `blockContainer`.
        headings.push({ blockId, title, level, pos: pos - 1 });
      }
    }
    // A block's children are siblings of its content node, so this only
    // skips the inline content.
    return false;
  });
  return headings;
}

/**
 * The entries for the document's headings. Depths count from the shallowest
 * heading level present, since documents rarely use every level from 1 down,
 * and headings deeper than `maxDepth` are left out.
 */
export function getTableOfContentsEntries(
  doc: Node,
  maxDepth: number,
): TableOfContentsEntry[] {
  const headings = collectHeadings(doc);
  const minLevel = Math.min(...headings.map((heading) => heading.level));
  const entries: TableOfContentsEntry[] = [];
  for (const { blockId, title, level } of headings) {
    const depth = level - minLevel;
    if (depth <= maxDepth) {
      entries.push({ blockId, title, level, depth });
    }
  }
  return entries;
}

export function areEntriesEqual(
  a: readonly TableOfContentsEntry[],
  b: readonly TableOfContentsEntry[],
): boolean {
  return (
    a.length === b.length &&
    a.every(
      (entry, i) =>
        entry.blockId === b[i].blockId &&
        entry.title === b[i].title &&
        entry.level === b[i].level &&
        entry.depth === b[i].depth,
    )
  );
}

/**
 * Whether going from `before` to `after` can have changed the headings: a
 * heading overlaps the part of either document that differs. Both documents
 * share every node a change leaves alone, so finding that part only compares
 * node identities up to the change, and a keystroke in a paragraph costs no
 * walk of the whole document.
 */
export function mayHaveChangedHeadings(before: Node, after: Node): boolean {
  const start = before.content.findDiffStart(after.content);
  if (start === null) {
    return false;
  }
  const end = before.content.findDiffEnd(after.content)!;
  // With repeated content around the change, the end found from the back can
  // lie before `start`. The span between the two covers the change either way.
  return (
    hasHeadingBetween(before, Math.min(start, end.a), Math.max(start, end.a)) ||
    hasHeadingBetween(after, Math.min(start, end.b), Math.max(start, end.b))
  );
}

function hasHeadingBetween(doc: Node, from: number, to: number): boolean {
  let found = false;
  doc.nodesBetween(from, to, (node) => {
    found ||= node.type.name === "heading";
    return !found && !node.type.isInGroup("blockContent");
  });
  return found;
}
