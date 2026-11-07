import type { BlockNoteEditor } from "@blocknote/core";

import { alignmentKey } from "../alignment/alignBlocks.js";
import { flattenBlocks } from "../blocks/flatten.js";
import { blockToText } from "../blocks/text.js";
import type { FlatBlock, LensBlock } from "../blocks/types.js";
import { toStoredBlocks } from "../formats/stored.js";
import type { TextFormat } from "../formats/types.js";
import { roundTripAlone } from "../projection/projectDocument.js";

/**
 * Stage 2 (Parse): the blocks of the text of a client, in the form of the
 * view, as a flat list. The alignment compares them with the view blocks,
 * thus the two sides must be in the same form:
 *
 * - The blocks are in the form that the document stores them (see
 *   `toStoredBlocks`). If they do not fit the schema, the result is the
 *   error `"invalid-document"`.
 * - The blocks that the format does not show go (see
 *   {@link withoutHiddenBlocks}).
 */
export function parseText(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
  text: string,
  view: readonly FlatBlock[],
): { error?: undefined; blocks: FlatBlock[] } | { error: "invalid-document" } {
  const parsed = toStoredBlocks(editor, format.parse(editor, text));
  if (parsed === undefined) {
    return { error: "invalid-document" };
  }
  return {
    blocks: flattenBlocks(
      withoutHiddenBlocks(editor, format, parsed, view, text),
    ),
  };
}

/**
 * Returns the text without a byte order mark at its start (for example of a
 * file): the mark is not content, unless the text of the document starts
 * with that character.
 */
export function withoutByteOrderMark(
  text: string,
  documentText: string,
): string {
  return text.startsWith("\uFEFF") && !documentText.startsWith("\uFEFF")
    ? text.slice(1)
    : text;
}

/**
 * Returns the blocks of a text without the blocks that the format does not
 * show: the round trip of such a block alone gives no block. An example is
 * an image without a URL in markdown, which a broken HTML tag in the text
 * can give. The text cannot keep such a block: after the write, the view
 * does not show it, thus each later write of the same text would add it
 * again (PutTwice). Only a block without text and without children that no
 * view block shows (by key) needs the round trip.
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
  const parts = roundTripAlone(editor, format, candidates, text, {
    before: true,
    after: true,
  });
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
