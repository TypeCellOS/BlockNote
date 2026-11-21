import type { Block } from "../../blocks/defaultBlocks.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import {
  createExtension,
  createStore,
} from "../../editor/BlockNoteExtension.js";
import {
  isStyledTextInlineContent,
  type InlineContent,
} from "../../schema/index.js";
import { BLOCK_SELECTOR } from "../blockDOM.js";

/**
 * A heading listed in the table of contents.
 */
export type TableOfContentsEntry = {
  /** The id of the heading block. */
  readonly blockId: string;
  /** The heading's text, trimmed, with each run of whitespace as one space. */
  readonly title: string;
  /** The heading's `level` prop. */
  readonly level: number;
  /**
   * How many levels the heading is below the shallowest heading level in the
   * document: 0 for the headings of that level, 1 for the level below it, and
   * so on. For indenting an outline, or leaving its deeper entries out.
   */
  readonly depth: number;
};

export type TableOfContentsState = {
  /**
   * The entries in document order: empty until the editor is mounted, kept up
   * to date while it is. Keeps its identity while the headings stay the same,
   * so editing other blocks doesn't re-render an outline.
   */
  readonly entries: readonly TableOfContentsEntry[];
};

/**
 * Lists the document's headings, kept up to date as the document changes, and
 * scrolls to them. Ships no UI: render `store.state.entries` however you
 * like, and call `scrollToEntry` to navigate.
 */
export const TableOfContentsExtension = createExtension(
  ({ editor }: { editor: BlockNoteEditor<any, any, any> }) => {
    const store = createStore<TableOfContentsState>({ entries: [] });

    function sync() {
      const entries = getTableOfContentsEntries(editor.document);
      if (!areEntriesEqual(entries, store.state.entries)) {
        store.setState({ entries });
      }
    }

    return {
      key: "tableOfContents",
      store,
      mount() {
        sync();
        return editor.onChange(sync);
      },
      /**
       * Scrolls the block with this id (normally an entry's heading) to the
       * top of the element the editor scrolls in, smoothly unless the user
       * prefers reduced motion. Returns whether it scrolled: not when the
       * editor isn't mounted or has no such block.
       */
      scrollToEntry(blockId: string): boolean {
        // Ids are arbitrary strings: compare the attribute instead of building
        // a selector from the id (`CSS.escape` doesn't exist in jsdom).
        let block = Array.from(
          editor.domElement?.querySelectorAll(BLOCK_SELECTOR) ?? [],
        ).find((element) => element.getAttribute("data-id") === blockId);
        // A heading in a collapsed toggle isn't laid out: scroll to the
        // nearest block around it that is.
        while (block && block.getClientRects().length === 0) {
          block = block.parentElement?.closest(BLOCK_SELECTOR) ?? undefined;
        }
        if (!block) {
          return false;
        }
        const reducedMotion =
          block.ownerDocument.defaultView?.matchMedia?.(
            "(prefers-reduced-motion: reduce)",
          ).matches ?? false;
        block.scrollIntoView({
          block: "start",
          behavior: reducedMotion ? "instant" : "smooth",
        });
        return true;
      },
    } as const;
  },
);

/**
 * The entries for the document's headings with text, in document order,
 * including headings nested in other blocks. Depths count from the shallowest
 * heading level present, since documents rarely use every level from 1 down.
 */
export function getTableOfContentsEntries(
  blocks: readonly Block<any, any, any>[],
): TableOfContentsEntry[] {
  const headings: Omit<TableOfContentsEntry, "depth">[] = [];
  function visit(children: readonly Block<any, any, any>[]) {
    for (const block of children) {
      if (block.type === "heading" && Array.isArray(block.content)) {
        const level: unknown = block.props.level;
        const title = inlineContentToText(block.content).trim();
        if (typeof level === "number" && title) {
          headings.push({ blockId: block.id, title, level });
        }
      }
      visit(block.children);
    }
  }
  visit(blocks);

  const minLevel = Math.min(...headings.map((heading) => heading.level));
  return headings.map((heading) => ({
    ...heading,
    depth: heading.level - minLevel,
  }));
}

function inlineContentToText(
  content: readonly InlineContent<any, any>[],
): string {
  return content
    .map((item) => {
      if (isStyledTextInlineContent(item)) {
        return item.text;
      }
      // Links and custom inline content: styled text, plain text, or none.
      if (typeof item.content === "string") {
        return item.content;
      }
      return (item.content ?? []).map((text) => text.text).join("");
    })
    .join("")
    .replace(/\s+/g, " ");
}

/**
 * Whether two lists of entries render the same. A heading keeps its block id
 * when it's renamed or re-leveled, so the id alone isn't enough.
 */
function areEntriesEqual(
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
