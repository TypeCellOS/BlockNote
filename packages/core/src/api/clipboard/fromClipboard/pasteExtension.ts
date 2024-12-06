import { Extension } from "@tiptap/core";
import { Plugin } from "prosemirror-state";

import type { BlockNoteEditor } from "../../../editor/BlockNoteEditor";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../schema/index.js";
import { nestedListsToBlockNoteStructure } from "../../parsers/html/util/nestedLists.js";
import { acceptedMIMETypes } from "./acceptedMIMETypes.js";
import { handleFileInsertion } from "./handleFileInsertion.js";
import { handleVSCodePaste } from "./handleVSCodePaste.js";

export const createPasteFromClipboardExtension = <
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>
) =>
  Extension.create({
    name: "pasteFromClipboard",
    addProseMirrorPlugins() {
      return [
        new Plugin({
          props: {
            handleDOMEvents: {
              paste(view, event) {
                event.preventDefault();

                if (!editor.isEditable) {
                  return;
                }

                let format: (typeof acceptedMIMETypes)[number] | undefined;
                for (const mimeType of acceptedMIMETypes) {
                  if (event.clipboardData!.types.includes(mimeType)) {
                    format = mimeType;
                    break;
                  }
                }
                if (!format) {
                  return true;
                }

                if (format === "vscode-editor-data") {
                  handleVSCodePaste(event, view);
                  return true;
                }

                if (format === "Files") {
                  handleFileInsertion(event, editor);
                  return true;
                }

                let data = event.clipboardData!.getData(format);

                if (format === "blocknote/html") {
                  view.pasteHTML(data);
                  return true;
                }

                if (format === "text/html") {
                  const htmlNode = nestedListsToBlockNoteStructure(data.trim());
                  data = htmlNode.innerHTML;
                  view.pasteHTML(data);
                  return true;
                }

                view.pasteText(data);

                return true;
              },
            },
          },
        }),
      ];
    },
  });
