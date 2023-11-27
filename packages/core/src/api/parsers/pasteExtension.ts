import { Extension } from "@tiptap/core";
import { Plugin } from "prosemirror-state";

import { BlockNoteEditor } from "../../BlockNoteEditor";
import { BlockSchema } from "../../extensions/Blocks/api/blocks/types";
import { InlineContentSchema } from "../../extensions/Blocks/api/inlineContent/types";
import { StyleSchema } from "../../extensions/Blocks/api/styles/types";

const acceptedMIMETypes = [
  "blocknote/html",
  "text/html",
  "text/plain",
] as const;

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
                let format: (typeof acceptedMIMETypes)[number] | null = null;

                for (const mimeType of acceptedMIMETypes) {
                  if (event.clipboardData!.types.includes(mimeType)) {
                    format = mimeType;
                    break;
                  }
                }

                if (format !== null) {
                  editor._tiptapEditor.view.pasteHTML(
                    event.clipboardData!.getData(format)
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
