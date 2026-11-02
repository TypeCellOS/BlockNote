import type { BlockNoteEditor } from "@blocknote/core";

import { linkBlocks } from "../alignment/alignBlocks.js";
import { flattenBlocks } from "../blocks/flatten.js";
import type { FlatBlock, LensBlock } from "../blocks/types.js";
import type { TextFormat } from "../formats/types.js";

export type ViewBlock = FlatBlock & {
  /**
   * The ID of the source block that gave this view block. `undefined` if the
   * projection did not find a link.
   */
  sourceId: string | undefined;
};

/** A document as a text format shows it, with links to the blocks of the document. */
export type Projection = {
  /** The document, rendered in the format. A client reads this text. */
  text: string;
  /** `text`, parsed back into a flat list: the document as the format shows it. */
  view: ViewBlock[];
  /**
   * Source blocks without a link from a view block, because they render as no
   * text (for example empty paragraphs in markdown). The text cannot change
   * them, thus they stay where they are.
   */
  invisibleIds: Set<string>;
  /** Source blocks with links from more than one view block. */
  multiPartIds: Set<string>;
};

/**
 * Renders the document in the format and parses it back. Then links each view
 * block to the source block that gave it (see `linkBlocks`).
 */
export function projectDocument(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
  document: readonly LensBlock[],
): Projection {
  const text = format.serialize(editor, document);
  const viewBlocks = flattenBlocks(format.parse(editor, text));
  const sourceBlocks = flattenBlocks(document);
  const links = linkBlocks(sourceBlocks, viewBlocks);

  const linkCounts = new Map<string, number>();
  const view: ViewBlock[] = viewBlocks.map((flat, v) => {
    const sourceIndex = links[v];
    const sourceId =
      sourceIndex === undefined
        ? undefined
        : sourceBlocks[sourceIndex].block.id;
    if (sourceId !== undefined) {
      linkCounts.set(sourceId, (linkCounts.get(sourceId) ?? 0) + 1);
    }
    return { ...flat, sourceId };
  });

  const invisibleIds = new Set<string>();
  const multiPartIds = new Set<string>();
  for (const { block } of sourceBlocks) {
    const count = linkCounts.get(block.id) ?? 0;
    if (count === 0) {
      invisibleIds.add(block.id);
    } else if (count > 1) {
      multiPartIds.add(block.id);
    }
  }

  return { text, view, invisibleIds, multiPartIds };
}
