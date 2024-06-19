import { Extension } from "@tiptap/core";
import { Plugin } from "prosemirror-state";

import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import { BlockSchema, InlineContentSchema, StyleSchema } from "../../schema";
import { nestedListsToBlockNoteStructure } from "./html/util/nestedLists";
import { PartialBlock } from "../../blocks/defaultBlocks";
import { createBlobFromFile } from "./utils";

const acceptedMIMETypes = [
  "blocknote/html",
  "text/html",
  "text/plain",
  "Files",
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

                if (format !== null) {
                  let data = event.clipboardData!.getData(format);
                  if (format === "text/html") {
                    const htmlNode = nestedListsToBlockNoteStructure(
                      data.trim()
                    );

                    data = htmlNode.innerHTML;
                  } else if (format === "Files") {
                    const items = event.clipboardData!.items;
                    if (items) {
                      for (let i = 0; i < items.length; i++) {
                        //Img pasted
                        if (items[i].type.indexOf("image") !== -1) {
                          event.preventDefault();
                          const file = items[i].getAsFile();
                          if (file) {
                            createBlobFromFile(file).then((imageBlob) => {
                              if (imageBlob) {
                                const currentBlock =
                                  editor.getTextCursorPosition().block;
                                const imgBlock = {
                                  type: "image",
                                  props: {
                                    url: URL.createObjectURL(imageBlob),
                                    caption: "",
                                    width: 100,
                                  },
                                } as PartialBlock<BSchema, I, S>;
                                editor.insertBlocks(
                                  [imgBlock],
                                  currentBlock,
                                  "after"
                                );
                              }
                            });
                          }
                          break;
                        }
                      }
                    }
                    return true;
                  }
                  editor._tiptapEditor.view.pasteHTML(data);
                }

                return true;
              },
            },
          },
        }),
      ];
    },
  });
