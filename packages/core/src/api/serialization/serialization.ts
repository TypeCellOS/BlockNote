// TODO: IMO this should be part of the formatConversions file since the custom
//  serializer is used for all HTML & markdown conversions. I think this would
//  also clean up testing converting to clean HTML.
import { Extension } from "@tiptap/core";
import { Plugin } from "prosemirror-state";
import { DOMSerializer, Fragment, Node, Schema } from "prosemirror-model";
import { nodeToBlock } from "../nodeConversions/nodeConversions";
import { BlockNoteEditor } from "../../BlockNoteEditor";
import {
  BlockSchema,
  SpecificBlock,
} from "../../extensions/Blocks/api/blockTypes";
import { cleanHTML, markdown } from "../formatConversions/formatConversions";

const acceptedMIMETypes = [
  "blocknote/html",
  "text/html",
  "text/plain",
] as const;

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
      const tiptap = this.editor;
      const schema = this.editor.schema;
      return [
        new Plugin({
          props: {
            // TODO: Totally broken on Firefox as it outright doesn't allow
            //  reading from or writing to the clipboard.
            handleDOMEvents: {
              copy(_view, event) {
                // Stops the default browser copy behaviour.
                event.preventDefault();
                event.clipboardData!.clearData();

                async function setClipboardData() {
                  const serializer = customBlockSerializer(schema, editor);

                  const selectedFragment =
                    tiptap.state.selection.content().content;

                  const selectedHTML =
                    serializer.serializeFragment(selectedFragment);

                  const parent = document.createElement("div");
                  parent.appendChild(selectedHTML);

                  const structured = parent.innerHTML;
                  const clean = await cleanHTML(structured);
                  const plain = await markdown(clean);

                  event.clipboardData!.setData("text/plain", plain);
                  event.clipboardData!.setData("text/html", clean);
                  // TODO: Writing to other MIME types not working in Safari for
                  //  some reason.
                  event.clipboardData!.setData("blocknote/html", structured);
                }

                setClipboardData();

                // Prevent default PM handler to be called
                return true;
              },
              paste(_view, event) {
                event.preventDefault();

                let format: (typeof acceptedMIMETypes)[number] | null = null;

                for (const mimeType of acceptedMIMETypes) {
                  if (event.clipboardData!.types.includes(mimeType)) {
                    format = mimeType;
                    break;
                  }
                }

                if (format !== null) {
                  editor._tiptapEditor.view.pasteHTML(
                    event.clipboardData!.getData(format!)
                  );
                }

                return true;
              },
            },
          },
        }),
      ];
    },
  });
