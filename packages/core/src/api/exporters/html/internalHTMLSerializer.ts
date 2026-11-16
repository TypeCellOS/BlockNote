import { DOMSerializer, Schema } from "prosemirror-model";

import { PartialBlock } from "../../../blocks/defaultBlocks.js";
import type { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../schema/index.js";
import { serializeBlocksInternalHTML } from "./util/serializeBlocksInternalHTML.js";

// Serializes to the editor's HTML structure, retaining blockGroup and
// blockContainer wrappers so the document can be parsed back without data loss.
// Block-owned post-processing is part of the shared serialization pipeline.
export const createInternalHTMLSerializer = <
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  schema: Schema,
  editor: BlockNoteEditor<BSchema, I, S>,
) => {
  const serializer = DOMSerializer.fromSchema(schema);

  return {
    serializeBlocks: (
      blocks: PartialBlock<BSchema, I, S>[],
      options: { document?: Document },
    ) =>
      serializeBlocksInternalHTML(editor, blocks, serializer, options)
        .outerHTML,
  };
};
