// TODO: IMO this should be part of the formatConversions file since the custom
//  serializer is used for all HTML & markdown conversions. I think this would
//  also clean up testing converting to clean HTML.
import { DOMSerializer, Fragment, Node, Schema } from "prosemirror-model";
import {
  blockToNode,
  nodeToBlock,
} from "../../nodeConversions/nodeConversions";
import { BlockNoteEditor } from "../../../BlockNoteEditor";
import {
  Block,
  BlockSchema,
  PartialBlock,
} from "../../../extensions/Blocks/api/blockTypes";
import { doc } from "./shared";

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
// `serializeBlocks`: Serializes an array of blocks to HTML.
// `serializeFragment`: Serializes a ProseMirror fragment to HTML. This is
// mostly useful if you want to serialize a selection which may not start/end at
// the start/end of a block.
export interface InternalHTMLSerializer<BSchema extends BlockSchema> {
  serializeBlocks: (blocks: PartialBlock<BSchema>[]) => string;
  // TODO: Ideally we would expand the BlockNote API to support partial
  //  selections so we don't need this.
  serializeProseMirrorFragment: (fragment: Fragment) => string;
}

export const createInternalHTMLSerializer = <BSchema extends BlockSchema>(
  schema: Schema,
  editor: BlockNoteEditor<BSchema>
): InternalHTMLSerializer<BSchema> => {
  const customSerializer = DOMSerializer.fromSchema(schema) as DOMSerializer & {
    serializeNodeInner: (
      node: Node,
      options: { document?: Document }
    ) => HTMLElement;
    serializeBlocks: (blocks: PartialBlock<BSchema>[]) => string;
    serializeProseMirrorFragment: (
      fragment: Fragment,
      options?: { document?: Document | undefined } | undefined,
      target?: HTMLElement | DocumentFragment | undefined
    ) => string;
  };

  customSerializer.serializeNodeInner = (
    node: Node,
    options: { document?: Document }
  ) => {
    const { dom, contentDOM } = DOMSerializer.renderSpec(
      doc(options),
      customSerializer.nodes[node.type.name](node)
    );

    if (contentDOM) {
      if (node.isLeaf) {
        throw new RangeError("Content hole not allowed in a leaf node spec");
      }

      // Checks if the block type is custom. Custom blocks don't implement a
      // `renderHTML` function in their TipTap node type, so `toDOM` also isn't
      // implemented in their ProseMirror node type.
      if (node.type.name === "blockContainer") {
        const blockSpec =
          editor.schema[node.firstChild!.type.name as keyof BSchema];
        // Renders block content using the custom `blockSpec`'s `serialize`
        // function.
        const blockContent = DOMSerializer.renderSpec(
          doc(options),
          blockSpec.toInternalHTML(
            nodeToBlock<BlockSchema, keyof BlockSchema>(
              node,
              editor.schema,
              editor.blockCache as WeakMap<Node, Block<BlockSchema>>
            ),
            editor as BlockNoteEditor<BlockSchema>
          )
        );

        // Renders inline content.
        if (blockContent.contentDOM) {
          if (node.isLeaf) {
            throw new RangeError(
              "Content hole not allowed in a leaf node spec"
            );
          }

          blockContent.contentDOM.appendChild(
            customSerializer.serializeFragment(
              node.firstChild!.content,
              options
            )
          );
        }

        contentDOM.appendChild(blockContent.dom);

        // Renders nested blocks.
        if (node.childCount === 2) {
          customSerializer.serializeFragment(
            Fragment.from(node.content.lastChild),
            options,
            contentDOM
          );
        }
      } else {
        // Renders the block normally, i.e. using `toDOM`.
        customSerializer.serializeFragment(node.content, options, contentDOM);
      }
    }

    return dom as HTMLElement;
  };

  customSerializer.serializeBlocks = (blocks: PartialBlock<BSchema>[]) => {
    const nodes = blocks.map((block) =>
      blockToNode(block, editor._tiptapEditor.schema)
    );
    const blockGroup = editor._tiptapEditor.schema.nodes["blockGroup"].create(
      null,
      nodes
    );

    return customSerializer.serializeProseMirrorFragment(
      Fragment.from(blockGroup)
    );
  };

  customSerializer.serializeProseMirrorFragment = (fragment: Fragment) => {
    const internalHTML = customSerializer.serializeFragment(fragment);
    const parent = document.createElement("div");
    parent.appendChild(internalHTML);

    return parent.innerHTML;
  };

  return customSerializer;
};
