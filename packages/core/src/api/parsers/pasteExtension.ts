import { Extension } from "@tiptap/core";
import { Plugin } from "prosemirror-state";

import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import { BlockSchema, InlineContentSchema, StyleSchema } from "../../schema";
import { handleFileInsertion } from "./handleFileInsertion";
import { nestedListsToBlockNoteStructure } from "./html/util/nestedLists";
import { acceptedMIMETypes } from "./acceptedMIMETypes";

export const createPasteFromClipboardExtension = <
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>
) =>
  Extension.create<{ editor: BlockNoteEditor<BSchema, I, S> }, undefined>({
    name: "pasteFromClipboard",
    addProseMirrorPlugins() {
      return [
        new Plugin({
          props: {
            handleDOMEvents: {
              paste(_view, event) {
                event.preventDefault();

                if (!editor.isEditable) {
                  return;
                }

                let format: (typeof acceptedMIMETypes)[number] | null = null;
                for (const mimeType of acceptedMIMETypes) {
                  if (event.clipboardData!.types.includes(mimeType)) {
                    format = mimeType;
                    break;
                  }
                }
                if (format === null) {
                  return true;
                }

                if (format === "Files") {
                  handleFileInsertion(event, editor);
                  return true;
                }

                let data = event.clipboardData!.getData(format);

                if (format === "text/html") {
                  const htmlNode = nestedListsToBlockNoteStructure(data.trim());
                  data = htmlNode.innerHTML;
                }

                editor._tiptapEditor.view.pasteHTML(data);

                return true;
              },
            },
          },
        }),
      ];
    },
  });
