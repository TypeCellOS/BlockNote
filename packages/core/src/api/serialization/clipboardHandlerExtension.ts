import { Extension } from "@tiptap/core";
import { Plugin } from "prosemirror-state";
import { InlineContentSchema } from "../..";
import { BlockNoteEditor } from "../../BlockNoteEditor";
import { BlockSchema } from "../../extensions/Blocks/api/blocks/types";
import { StyleSchema } from "../../extensions/Blocks/api/styles/types";
import { markdown } from "../formatConversions/formatConversions";
import { createExternalHTMLExporter } from "./html/externalHTMLExporter";
import { createInternalHTMLSerializer } from "./html/internalHTMLSerializer";

const acceptedMIMETypes = [
  "blocknote/html",
  "text/html",
  "text/plain",
] as const;

export const createClipboardHandlerExtension = <
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>
) =>
  Extension.create<{ editor: BlockNoteEditor<BSchema, I, S> }, undefined>({
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
