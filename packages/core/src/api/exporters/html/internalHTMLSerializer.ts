import { DOMSerializer, Fragment, Node, Schema } from "prosemirror-model";
import type { BlockNoteEditor } from "../../../editor/BlockNoteEditor";
import {
  BlockSchema,
  InlineContentSchema,
  PartialBlock,
  StyleSchema,
} from "../../../schema";
import { blockToNode } from "../../nodeConversions/nodeConversions";
import {
  serializeNodeInner,
  serializeProseMirrorFragment,
} from "./util/sharedHTMLConversion";

// Used to serialize BlockNote blocks and ProseMirror nodes to HTML without
// losing data. Blocks are exported using the `toInternalHTML` method in their
// `blockSpec`.
//
// The HTML created by this serializer is the same as what's rendered by the
// editor to the DOM. This means that it retains the same structure as the
// editor, including the `blockGroup` and `blockContainer` wrappers. This also
// means that it can be converted back to the original blocks without any data
// loss.
//
// The serializer has 2 main methods:
// `serializeFragment`: Serializes a ProseMirror fragment to HTML. This is
// mostly useful if you want to serialize a selection which may not start/end at
// the start/end of a block.
// `serializeBlocks`: Serializes an array of blocks to HTML.
export interface InternalHTMLSerializer<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> {
  // TODO: Ideally we would expand the BlockNote API to support partial
  //  selections so we don't need this.
  serializeProseMirrorFragment: (fragment: Fragment) => string;
  serializeBlocks: (blocks: PartialBlock<BSchema, I, S>[]) => string;
}

export const createInternalHTMLSerializer = <
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  schema: Schema,
  editor: BlockNoteEditor<BSchema, I, S>
): InternalHTMLSerializer<BSchema, I, S> => {
  const serializer = DOMSerializer.fromSchema(schema) as DOMSerializer & {
    serializeNodeInner: (
      node: Node,
      options: { document?: Document }
    ) => HTMLElement;
    serializeBlocks: (blocks: PartialBlock<BSchema, I, S>[]) => string;
    serializeProseMirrorFragment: (
      fragment: Fragment,
      options?: { document?: Document | undefined } | undefined,
      target?: HTMLElement | DocumentFragment | undefined
    ) => string;
  };

  serializer.serializeNodeInner = (
    node: Node,
    options: { document?: Document }
  ) => serializeNodeInner(node, options, serializer, editor, false);

  serializer.serializeProseMirrorFragment = (fragment: Fragment) =>
    serializeProseMirrorFragment(fragment, serializer);

  serializer.serializeBlocks = (blocks: PartialBlock<BSchema, I, S>[]) => {
    const nodes = blocks.map((block) =>
      blockToNode(block, schema, editor.styleSchema)
    );
    const blockGroup = schema.nodes["blockGroup"].create(null, nodes);

    return serializer.serializeProseMirrorFragment(Fragment.from(blockGroup));
  };

  return serializer;
};
