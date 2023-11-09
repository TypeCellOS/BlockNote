import {
  blockToNode,
  nodeToBlock,
} from "../../nodeConversions/nodeConversions";
import { DOMSerializer, Fragment, Node } from "prosemirror-model";
import {
  Block,
  BlockSchema,
  BlockSchemaWithBlock,
  PropSchema,
  SpecificBlock,
} from "../../../extensions/Blocks/api/blockTypes";
import { BlockNoteEditor } from "../../../BlockNoteEditor";

// Function used to convert default blocks to HTML. It uses the corresponding
// node's `renderHTML` method to do the conversion by using a default
// `DOMSerializer`.
export const serializeBlockToHTMLDefault = <
  BType extends string,
  PSchema extends PropSchema,
  ContainsInlineContent extends boolean
>(
  block: SpecificBlock<
    BlockSchemaWithBlock<BType, PSchema, ContainsInlineContent>,
    BType
  >,
  editor: BlockNoteEditor<
    BlockSchemaWithBlock<BType, PSchema, ContainsInlineContent>
  >
) => {
  const node = blockToNode(block as any, editor._tiptapEditor.schema);

  if (
    editor._tiptapEditor.schema.nodes[node.type.name].spec.toDOM === undefined
  ) {
    throw new Error(
      "This block has no default HTML serialization as its corresponding TipTap node doesn't implement `renderHTML`."
    );
  }

  const serializer = DOMSerializer.fromSchema(editor._tiptapEditor.schema);

  return serializer.serializeNode(node.firstChild!) as HTMLElement;
};

function doc(options: { document?: Document }) {
  return options.document || window.document;
}

// Used to implement `serializeNodeInner` for the `internalHTMLSerializer` and
// `externalHTMLExporter`. Changes how the content of `blockContainer` nodes is
// serialized vs the default `DOMSerializer` implementation. For the
// `blockContent` node, the `toInternalHTML` or `toExternalHTML` function of its
// corresponding block is used for serialization instead of the node's
// `renderHTML` method.
export const serializeNodeInner = <BSchema extends BlockSchema>(
  node: Node,
  options: { document?: Document },
  serializer: DOMSerializer,
  editor: BlockNoteEditor<BSchema>,
  toExternalHTML: boolean
) => {
  const { dom, contentDOM } = DOMSerializer.renderSpec(
    doc(options),
    serializer.nodes[node.type.name](node)
  );

  if (contentDOM) {
    if (node.isLeaf) {
      throw new RangeError("Content hole not allowed in a leaf node spec");
    }

    // Handles converting `blockContainer` nodes to HTML.
    if (node.type.name === "blockContainer") {
      // Converts `blockContent` node using the custom `blockSpec`'s
      // `toExternalHTML` or `toInternalHTML` function.
      const blockSpec =
        editor.schema[node.firstChild!.type.name as keyof BSchema];
      const toHTML = toExternalHTML
        ? blockSpec.toExternalHTML
        : blockSpec.toInternalHTML;
      const blockContent = DOMSerializer.renderSpec(
        doc(options),
        toHTML(
          nodeToBlock<BlockSchema, keyof BlockSchema>(
            node,
            editor.schema,
            editor.blockCache as WeakMap<Node, Block<BlockSchema>>
          ),
          editor as BlockNoteEditor<BlockSchema>
        )
      );

      // Converts inline nodes in the `blockContent` node's content to HTML
      // using their `renderHTML` methods.
      if (blockContent.contentDOM) {
        if (node.isLeaf) {
          throw new RangeError("Content hole not allowed in a leaf node spec");
        }

        blockContent.contentDOM.appendChild(
          serializer.serializeFragment(node.firstChild!.content, options)
        );
      }

      contentDOM.appendChild(blockContent.dom);

      // Converts `blockGroup` node to HTML using its `renderHTML` method.
      if (node.childCount === 2) {
        serializer.serializeFragment(
          Fragment.from(node.content.lastChild),
          options,
          contentDOM
        );
      }
    } else {
      // Converts the node normally, i.e. using its `renderHTML method`.
      serializer.serializeFragment(node.content, options, contentDOM);
    }
  }

  return dom as HTMLElement;
};

// Used to implement `serializeProseMirrorFragment` for the
// `internalHTMLSerializer` and `externalHTMLExporter`. Does basically the same
// thing as `serializer.serializeFragment`, but takes fewer arguments and
// returns a string instead, to make it easier to use.
export const serializeProseMirrorFragment = (
  fragment: Fragment,
  serializer: DOMSerializer
) => {
  const internalHTML = serializer.serializeFragment(fragment);
  const parent = document.createElement("div");
  parent.appendChild(internalHTML);

  return parent.innerHTML;
};
