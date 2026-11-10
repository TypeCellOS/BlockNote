import type { BlockNoteEditor } from "@blocknote/core";

import { alignmentKey } from "../alignment/alignBlocks.js";
import { blockToText } from "../blocks/text.js";
import type { LensBlock } from "../blocks/types.js";
import type { TextFormat } from "../formats/types.js";
import { roundTripAlone, type ViewBlock } from "./projectDocument.js";

/**
 * Throws if the parse of a text gave a block that the format does not show:
 * the round trip of that block alone gives no block. Such a block is a bug of
 * the format: its parse must give only blocks that its serialize shows (see
 * `TextFormat`). Else, the write would add the block, the view would not show
 * it, and each later write of the same text would add it again (PutTwice).
 *
 * Only a block without text and without children can be such a block: a
 * block with text shows its text. Of these, a block whose key a linked view
 * block has needs no round trip: that view block came from the round trip of
 * a document block, thus the format shows such a block. An unlinked view
 * block is no proof: the parse of a format with this bug also gives it.
 */
export function assertBlocksRoundTrip(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
  blocks: readonly LensBlock[],
  view: readonly ViewBlock[],
  text: string,
): void {
  const viewKeys = new Set(
    view.flatMap(({ block, sourceId }) =>
      sourceId === undefined ? [] : [alignmentKey(block)],
    ),
  );
  const candidates: LensBlock[] = [];
  function collect(list: readonly LensBlock[]) {
    for (const block of list) {
      if (
        block.children.length === 0 &&
        blockToText(block).trim() === "" &&
        !viewKeys.has(alignmentKey(block))
      ) {
        candidates.push(block);
      }
      collect(block.children);
    }
  }
  collect(blocks);
  const parts = roundTripAlone(editor, format, candidates, text);
  const hidden = candidates.find((_, k) => parts[k].length === 0);
  if (hidden !== undefined) {
    throw new Error(
      `The format gave a block that it does not show (type "${hidden.type}"). The parse of a format must give only blocks that its serialize shows.`,
    );
  }
}
