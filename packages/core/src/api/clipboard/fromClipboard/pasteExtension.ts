import { Extension } from "@tiptap/core";
import { Plugin } from "prosemirror-state";

import type { BlockNoteEditor } from "../../../editor/BlockNoteEditor";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../schema/index.js";
import { nestedListsToBlockNoteStructure } from "../../parsers/html/util/nestedLists.js";
import { markdownToHTML } from "../../parsers/markdown/parseMarkdown.js";
import { acceptedMIMETypes } from "./acceptedMIMETypes.js";
import { handleFileInsertion } from "./handleFileInsertion.js";
import { handleVSCodePaste } from "./handleVSCodePaste.js";
import { isMarkdown } from "../../parsers/markdown/detectMarkdown.js";
import { EditorView } from "prosemirror-view";

function convertHtmlToBlockNoteHtml(html: string) {
  const htmlNode = nestedListsToBlockNoteStructure(html.trim());
  return htmlNode.innerHTML;
}

function convertMarkdownToBlockNoteHtml(markdown: string) {
  return markdownToHTML(markdown).then((html) => {
    return convertHtmlToBlockNoteHtml(html);
  });
}

function defaultPasteHandler({
  view,
  event,
  editor,
  pasteBehavior = "prefer-markdown",
}: {
  view: EditorView;
  event: ClipboardEvent;
  editor: BlockNoteEditor<any, any, any>;
  pasteBehavior?: "prefer-markdown" | "prefer-html";
}) {
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

  const data = event.clipboardData!.getData(format);

  if (format === "blocknote/html") {
    // Is blocknote/html, so no need to convert it
    view.pasteHTML(data);
    return true;
  }

  if (format === "text/markdown") {
    convertMarkdownToBlockNoteHtml(data).then((html) => {
      view.pasteHTML(html);
    });
    return true;
  }

  if (format === "text/html") {
    if (pasteBehavior === "prefer-markdown") {
      // Use plain text instead of HTML if it looks like Markdown
      const plainText = event.clipboardData!.getData("text/plain");

      if (isMarkdown(plainText)) {
        // Convert Markdown to HTML first, then paste as HTML
        convertMarkdownToBlockNoteHtml(plainText).then((html) => {
          view.pasteHTML(html);
        });
        return true;
      }
    }

    view.pasteHTML(convertHtmlToBlockNoteHtml(data));
    return true;
  }

  if (pasteBehavior === "prefer-markdown" && isMarkdown(data)) {
    // Convert Markdown to HTML first, then paste as HTML
    convertMarkdownToBlockNoteHtml(data).then((html) => {
      view.pasteHTML(html);
    });
    return true;
  }

  view.pasteText(data);
  return true;
}

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

                return editor.settings.pasteHandler({
                  view,
                  event,
                  editor,
                  defaultPasteHandler: ({ pasteBehavior }) => {
                    return defaultPasteHandler({
                      view,
                      event,
                      editor,
                      pasteBehavior,
                    });
                  },
                  convertHtmlToBlockNoteHtml,
                  convertMarkdownToBlockNoteHtml,
                });
              },
            },
          },
        }),
      ];
    },
  });
