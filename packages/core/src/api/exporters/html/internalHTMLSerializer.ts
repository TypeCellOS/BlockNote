import { DOMSerializer, Schema } from "prosemirror-model";
import { PartialBlock } from "../../../blocks/defaultBlocks";
import type { BlockNoteEditor } from "../../../editor/BlockNoteEditor";
import { BlockSchema, InlineContentSchema, StyleSchema } from "../../../schema";
import { serializeBlocks } from "./util/sharedHTMLConversion";
// Used to serialize BlockNote blocks and ProseMirror nodes to HTML without
// losing data. Blocks are exported using the `toInternalHTML` method in their
// `blockSpec`.
//
// The HTML created by this serializer is the same as what's rendered by the
// editor to the DOM. This means that it retains the same structure as the
// editor, including the `blockGroup` and `blockContainer` wrappers. This also
// means that it can be converted back to the original blocks without any data
// loss.
export const createInternalHTMLSerializer = <
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  schema: Schema,
  editor: BlockNoteEditor<BSchema, I, S>
) => {
  // TODO: maybe cache this serializer (default prosemirror serializer is cached)?
  const serializer = new DOMSerializer(
    DOMSerializer.nodesFromSchema(schema),
    DOMSerializer.marksFromSchema(schema)
  ) as DOMSerializer;

  return {
    serializeBlocks: (
      blocks: PartialBlock<BSchema, I, S>[],
      options: { document?: Document }
    ) => {
      return serializeBlocks(editor, blocks, serializer, false, options)
        .outerHTML;
    },
  };
};
