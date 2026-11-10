import type { BlockNoteEditor } from "@blocknote/core";

import type { LensBlock } from "../model.js";

/**
 * A text form of a document that clients can read and write back, for example
 * markdown. The text form can lose data, for example block IDs and colors.
 * When a client writes back text, the lens gets that data from the document.
 *
 * A format can hide blocks of a document (for example, plain text hides
 * images). But its parse must give only blocks that its serialize shows: the
 * round trip of each block of a parse gives a block again. Else, a write of a
 * text with such a block would add it again each time. The lens examines this
 * and throws for a format that breaks it (see `assertBlocksRoundTrip`). If a
 * format hides a block with text, a view block next to it must not have the
 * same text and content shape (see `shownBlocks` in `projectDocument.ts`).
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
