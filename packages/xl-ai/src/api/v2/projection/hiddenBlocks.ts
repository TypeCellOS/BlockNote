import type { BlockNoteEditor } from "@blocknote/core";

import { alignmentKey } from "../alignment/alignBlocks.js";
import { blockToText } from "../blocks/text.js";
import type { FlatBlock, LensBlock } from "../blocks/types.js";
import type { TextFormat } from "../formats/types.js";
import { roundTripAlone } from "./projectDocument.js";

/**
 * Returns the blocks of a text without the blocks that the format does not
 * show: the round trip of such a block alone gives no block. An example is
 * an image without a URL in markdown, which a broken HTML tag in the text
 * can give. The text cannot keep such a block: after the write, the view
 * does not show it, thus each later write of the same text would add it
 * again (PutTwice). Only a block without text and without children needs the
 * round trip, and only if no view block has its key: the view shows such
 * blocks, thus the format shows them (a shortcut).
 */
export function withoutHiddenBlocks(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
  blocks: readonly LensBlock[],
  view: readonly FlatBlock[],
  text: string,
): readonly LensBlock[] {
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
  const hidden = new Set(candidates.filter((_, k) => parts[k].length === 0));
  if (hidden.size === 0) {
    return blocks;
  }
  function keep(list: readonly LensBlock[]): LensBlock[] {
    return list.flatMap((block) =>
      hidden.has(block) ? [] : [{ ...block, children: keep(block.children) }],
    );
  }
  return keep(blocks);
}
