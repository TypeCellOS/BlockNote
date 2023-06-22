import { Extension } from "@tiptap/core";
import { Plugin } from "prosemirror-state";
import { DOMSerializer, Fragment, Node, Schema } from "prosemirror-model";
import { nodeToBlock } from "../../../api/nodeConversions/nodeConversions";
import { BlockNoteEditor } from "../../../BlockNoteEditor";
import { BlockSchema, SpecificBlock } from "./blockTypes";

function doc(options: { document?: Document }) {
  return options.document || window.document;
}

export const customBlockSerializer = <BSchema extends BlockSchema>(
  schema: Schema,
  editor: BlockNoteEditor<BSchema>
) => {
  const customSerializer = DOMSerializer.fromSchema(schema) as DOMSerializer & {
    serializeNodeInner: (
      node: Node,
      options: { document?: Document }
    ) => HTMLElement;
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
      if (
        node.type.name === "blockContainer" &&
        node.firstChild!.type.spec.toDOM === undefined
      ) {
        // Renders block content using the custom `blockSpec`'s `serialize`
        // function.
        const blockContent = DOMSerializer.renderSpec(
          doc(options),
          editor.schema[node.firstChild!.type.name as keyof BSchema].serialize!(
            nodeToBlock(
              node,
              editor.schema,
              editor.blockCache
            ) as SpecificBlock<BlockSchema, string>,
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

  return customSerializer;
};

export const createCustomBlockSerializerExtension = <
  BSchema extends BlockSchema
>(
  editor: BlockNoteEditor<BSchema>
) =>
  Extension.create<{ editor: BlockNoteEditor<BSchema> }, undefined>({
    addProseMirrorPlugins() {
      return [
        new Plugin({
          props: {
            clipboardSerializer: customBlockSerializer(
              this.editor.schema,
              editor
            ),
          },
        }),
      ];
    },
  });
