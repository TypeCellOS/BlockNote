import { nodeToBlock } from "../../nodeConversions/nodeConversions";
import { DOMSerializer, Fragment, Node } from "prosemirror-model";
import {
  BlockSchema,
  SpecificBlock,
} from "../../../extensions/Blocks/api/blockTypes";
import { BlockNoteEditor } from "../../../BlockNoteEditor";

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
      const blockContentNode =
        node.childCount > 0 &&
        node.firstChild!.type.spec.group === "blockContent"
          ? node.firstChild!
          : undefined;
      const blockGroupNode =
        node.childCount > 0 && node.lastChild!.type.spec.group === "blockGroup"
          ? node.lastChild!
          : undefined;

      // Converts `blockContent` node using the custom `blockSpec`'s
      // `toExternalHTML` or `toInternalHTML` function.
      // Note: While `blockContainer` nodes should always contain a
      // `blockContent` node according to the schema, PM Fragments don't always
      // conform to the schema. This is unintuitive but important as it occurs
      // when copying only nested blocks.
      if (blockContentNode !== undefined) {
        const blockSpec =
          editor.schema[blockContentNode.type.name as keyof BSchema];
        const toHTML = toExternalHTML
          ? blockSpec.toExternalHTML
          : blockSpec.toInternalHTML;
        const blockContent = toHTML(
          nodeToBlock(node, editor.schema, editor.blockCache) as SpecificBlock<
            BlockSchema,
            keyof BlockSchema
          >,
          editor as BlockNoteEditor<BlockSchema>
        );

        // Converts inline nodes in the `blockContent` node's content to HTML
        // using their `renderHTML` methods.
        if (blockContent.contentDOM !== undefined) {
          if (node.isLeaf) {
            throw new RangeError(
              "Content hole not allowed in a leaf node spec"
            );
          }

          blockContent.contentDOM.appendChild(
            serializer.serializeFragment(blockContentNode.content, options)
          );
        }

        contentDOM.appendChild(blockContent.dom);
      }

      // Converts `blockGroup` node to HTML using its `renderHTML` method.
      if (blockGroupNode !== undefined) {
        serializer.serializeFragment(
          Fragment.from(blockGroupNode),
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
