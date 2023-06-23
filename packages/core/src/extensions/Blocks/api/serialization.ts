import { Extension } from "@tiptap/core";
import { Plugin } from "prosemirror-state";
import { DOMSerializer, Schema } from "prosemirror-model";
import { nodeToBlock } from "../../../api/nodeConversions/nodeConversions";
import { BlockNoteEditor } from "../../../BlockNoteEditor";
import { BlockSchema, SpecificBlock } from "./blockTypes";

export const customBlockSerializer = <BSchema extends BlockSchema>(
  schema: Schema,
  editor: BlockNoteEditor<BSchema>
) => {
  const defaultSerializer = DOMSerializer.fromSchema(schema);

  // Finds all custom nodes (i.e. those that don't implement
  // `renderHTML`/`toDOM` as they use `serialize` instead) and assigns them a
  // function to serialize them to an empty string. This is because we need to
  // access the outer `blockContainer` node to render them, therefore we also
  // have to serialize them as part of `blockContainer` nodes, so we shouldn't
  // serialize them on their own.
  const customNodes = Object.fromEntries(
    Object.entries(schema.nodes)
      .filter(
        ([name, type]) =>
          name !== "doc" && name !== "text" && type.spec.toDOM === undefined
      )
      .map(([name, _type]) => [name, () => ""])
  );
  console.log(customNodes);

  const customSerializer = new DOMSerializer(
    {
      ...defaultSerializer.nodes,
      ...customNodes,
      blockContainer: (node) => {
        // Serializes the `blockContainer` node itself.
        const blockContainerElement = DOMSerializer.renderSpec(
          document,
          node.type.spec.toDOM!(node)
        );

        // Checks if the `blockContent is custom and the node has to be
        // serialized manually, or it can be serialized normally using `toDOM`.
        if (node.firstChild!.type.name in customNodes) {
          // Serializes the `blockContent` node using the custom `blockSpec`'s
          // `serialize` function.
          const blockContentElement = DOMSerializer.renderSpec(
            document,
            editor.schema[node.firstChild!.type.name as keyof BSchema]
              .serialize!(
              nodeToBlock(
                node,
                editor.schema,
                editor.blockCache
              ) as SpecificBlock<BlockSchema, string>,
              editor as BlockNoteEditor<BlockSchema>
            )
          );
          blockContainerElement.contentDOM!.appendChild(
            blockContentElement.dom
          );

          // Serializes inline content inside the `blockContent` node.
          if (blockContentElement.contentDOM) {
            customSerializer.serializeFragment(
              node.firstChild!.content,
              {},
              blockContentElement.contentDOM
            );
          }
        }

        return blockContainerElement;
      },
    },
    defaultSerializer.marks
  );

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
