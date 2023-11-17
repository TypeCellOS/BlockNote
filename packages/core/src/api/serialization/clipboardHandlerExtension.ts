import { BlockSchema } from "../../extensions/Blocks/api/blockTypes";
import { BlockNoteEditor } from "../../BlockNoteEditor";
import { Extension } from "@tiptap/core";
import { Plugin } from "prosemirror-state";
import { Fragment, Slice } from "prosemirror-model";
import { createInternalHTMLSerializer } from "./html/internalHTMLSerializer";
import { createExternalHTMLExporter } from "./html/externalHTMLExporter";
import { markdown } from "../formatConversions/formatConversions";
import { blockToNode } from "../nodeConversions/nodeConversions";
import { parseExternalHTML } from "./html/parseExternalHTML";

const acceptedMIMETypes = [
  "blocknote/html",
  "text/html",
  "text/plain",
] as const;

export const createClipboardHandlerExtension = <BSchema extends BlockSchema>(
  editor: BlockNoteEditor<BSchema>
) =>
  Extension.create<{ editor: BlockNoteEditor<BSchema> }, undefined>({
    addProseMirrorPlugins() {
      const tiptap = this.editor;
      const schema = this.editor.schema;
      return [
        new Plugin({
          props: {
            handleDOMEvents: {
              copy(_view, event) {
                // Stops the default browser copy behaviour.
                event.preventDefault();
                event.clipboardData!.clearData();

                const selectedFragment =
                  tiptap.state.selection.content().content;

                const internalHTMLSerializer = createInternalHTMLSerializer(
                  schema,
                  editor
                );
                const internalHTML =
                  internalHTMLSerializer.serializeProseMirrorFragment(
                    selectedFragment
                  );

                const externalHTMLExporter = createExternalHTMLExporter(
                  schema,
                  editor
                );
                const externalHTML =
                  externalHTMLExporter.exportProseMirrorFragment(
                    selectedFragment
                  );

                const plainText = markdown(externalHTML);

                // TODO: Writing to other MIME types not working in Safari for
                //  some reason.
                event.clipboardData!.setData("blocknote/html", internalHTML);
                event.clipboardData!.setData("text/html", externalHTML);
                event.clipboardData!.setData("text/plain", plainText);

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
                  // Use custom parser if only text/html is available (i.e. when
                  // pasting content from external source)
                  if (format === "text/html") {
                    const html = event.clipboardData!.getData(format);
                    const parsedNodes = parseExternalHTML(html, editor).map(
                      (block) => blockToNode(block, schema)
                    );

                    editor._tiptapEditor.view.dispatch(
                      editor._tiptapEditor.view.state.tr.replaceSelection(
                        new Slice(Fragment.from(parsedNodes), 0, 0)
                      )
                    );
                  } else {
                    editor._tiptapEditor.view.pasteHTML(
                      event.clipboardData!.getData(format!)
                    );
                  }
                }

                return true;
              },
            },
          },
        }),
      ];
    },
  });
