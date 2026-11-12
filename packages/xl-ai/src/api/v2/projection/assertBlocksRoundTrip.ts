import type { BlockNoteEditor } from "@blocknote/core";

import { alignmentKey } from "../alignment/index.js";
import type { LensBlock } from "../model.js";
import { blockToText } from "../util/blocks/index.js";
import type { TextFormat } from "../formats/index.js";
import { roundTripAlone, type ViewBlock } from "./projectDocument.js";

/**
 * Throws if the parse of a text gave a block that the format does not show:
 * the round trip of that block alone gives no block. Such a block is a bug of
 * the format: its parse must give only blocks that its serialize shows (see
 * `TextFormat`). Else, the write would add the block, the view would not show
 * it, and each later write of the same text would add it again (PutTwice).
 *
 * Only a block without text and without children can be such a block: a
 * block with text shows its text. Of these, a block whose key a view block
 * has needs no round trip: each view block comes from a document block (see
 * `projectWithParts`), thus the format shows such a block.
 */
export function assertBlocksRoundTrip(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
  blocks: readonly LensBlock[],
  view: readonly ViewBlock[],
  text: string,
): void {
  const viewKeys = new Set(view.map(({ block }) => alignmentKey(block)));
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
