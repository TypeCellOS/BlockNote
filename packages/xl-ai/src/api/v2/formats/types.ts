import type { BlockNoteEditor } from "@blocknote/core";

import type { LensBlock } from "../blocks/types.js";

/**
 * A text form of a document that clients can read and write back, for example
 * markdown. The text form can lose data, for example block IDs and colors.
 * When a client writes back text, the lens gets that data from the document.
 */
export interface TextFormat {
  /** Renders blocks as text (the "get" of the lens). The same blocks must always give the same text. */
  serialize(
    editor: BlockNoteEditor<any, any, any>,
    blocks: readonly LensBlock[],
  ): string;
  /**
   * Parses text into blocks. The lens does not use the block IDs in the
   * result. The same text must always give equal blocks.
   */
  parse(editor: BlockNoteEditor<any, any, any>, text: string): LensBlock[];
}
