import { Extension } from "@tiptap/core";
import { Plugin } from "prosemirror-state";

import type {
  BlockNoteEditor,
  BlockNoteEditorOptions,
} from "../../../editor/BlockNoteEditor";
import { isMarkdown } from "../../parsers/markdown/detectMarkdown.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../schema/index.js";
import { acceptedMIMETypes } from "./acceptedMIMETypes.js";
import { handleFileInsertion } from "./handleFileInsertion.js";
import { handleVSCodePaste } from "./handleVSCodePaste.js";

function defaultPasteHandler({
  event,
  editor,
  prioritizeMarkdownOverHTML,
  plainTextAsMarkdown,
}: {
  event: ClipboardEvent;
  editor: BlockNoteEditor<any, any, any>;
  prioritizeMarkdownOverHTML: boolean;
  plainTextAsMarkdown: boolean;
}) {
  // Special case for code blocks, as they do not support any rich text
  // formatting, so we force pasting plain text.
  const isInCodeBlock = editor.transact(
    (tr) =>
      tr.selection.$from.parent.type.spec.code &&
      tr.selection.$to.parent.type.spec.code,
  );

  if (isInCodeBlock) {
    const data = event.clipboardData?.getData("text/plain");

    if (data) {
      editor.pasteText(data);

      return true;
    }
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
    handleVSCodePaste(event, editor.prosemirrorView);
    return true;
  }

  if (format === "Files") {
    handleFileInsertion(event, editor);
    return true;
  }

  const data = event.clipboardData!.getData(format);

  if (format === "blocknote/html") {
    // Is blocknote/html, so no need to convert it
    editor.pasteHTML(data, true);
    return true;
  }

  if (format === "text/markdown") {
    editor.pasteMarkdown(data);
    return true;
  }

  if (prioritizeMarkdownOverHTML) {
    // Use plain text instead of HTML if it looks like Markdown
    const plainText = event.clipboardData!.getData("text/plain");

    if (isMarkdown(plainText)) {
      editor.pasteMarkdown(plainText);
      return true;
    }
  }

  if (format === "text/html") {
    editor.pasteHTML(data);
    return true;
  }

  if (plainTextAsMarkdown) {
    editor.pasteMarkdown(data);
    return true;
  }

  editor.pasteText(data);
  return true;
}

export const createPasteFromClipboardExtension = <
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  pasteHandler: Exclude<
    BlockNoteEditorOptions<any, any, any>["pasteHandler"],
    undefined
  >,
) =>
  Extension.create({
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

                return pasteHandler({
                  event,
                  editor,
                  defaultPasteHandler: ({
                    prioritizeMarkdownOverHTML = true,
                    plainTextAsMarkdown = true,
                  } = {}) => {
                    return defaultPasteHandler({
                      event,
                      editor,
                      prioritizeMarkdownOverHTML,
                      plainTextAsMarkdown,
                    });
                  },
                });
              },
            },
          },
        }),
      ];
    },
  });
