import { Extension } from "@tiptap/core";
import { Plugin } from "prosemirror-state";

import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import { BlockSchema, InlineContentSchema, StyleSchema } from "../../schema";
import { createExternalHTMLExporter } from "./html/externalHTMLExporter";
import { createInternalHTMLSerializer } from "./html/internalHTMLSerializer";
import { cleanHTMLToMarkdown } from "./markdown/markdownExporter";

export const createCopyToClipboardExtension = <
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>
) =>
  Extension.create<{ editor: BlockNoteEditor<BSchema, I, S> }, undefined>({
    name: "copyToClipboard",
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

                const plainText = cleanHTMLToMarkdown(externalHTML);

                // TODO: Writing to other MIME types not working in Safari for
                //  some reason.
                event.clipboardData!.setData("blocknote/html", internalHTML);
                event.clipboardData!.setData("text/html", externalHTML);
                event.clipboardData!.setData("text/plain", plainText);

                // Prevent default PM handler to be called
                return true;
              },
            },
          },
        }),
      ];
    },
  });
