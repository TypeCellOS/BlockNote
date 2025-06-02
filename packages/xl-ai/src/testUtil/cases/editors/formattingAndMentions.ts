import { BlockNoteEditor } from "@blocknote/core";
import { createAIExtension } from "../../../AIExtension.js";
import { schemaWithMention as schema } from "../schemas/mention.js";

export function getEditorWithFormattingAndMentions() {
  const editor = BlockNoteEditor.create({
    initialContent: [
      {
        id: "ref1",
        content: "Hello, world!",
      },
      {
        id: "ref2",
        content: [
          {
            type: "text",
            text: "Hello, ",
          },
          {
            type: "mention",
            props: {
              user: "John Doe",
            },
          },
          {
            type: "text",
            text: "! ",
          },
          {
            type: "text",
            text: "How are you doing?",
            styles: {
              bold: true,
            },
          },
          {
            type: "text",
            text: " ",
          },
          {
            type: "text",
            text: "This text is blue!",
            styles: {
              textColor: "blue",
            },
          },
        ],
      },
      {
        id: "ref3",
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Hello, world! ",
            styles: {},
          },
          {
            type: "text",
            text: "Bold text. ",
            styles: {
              bold: true,
            },
          },
          {
            type: "link",
            href: "https://www.google.com",
            content: "Link.",
          },
        ],
      },
    ],
    trailingBlock: false,
    schema,
    extensions: [
      createAIExtension({
        model: undefined as any,
      }),
    ],
  });
  editor._tiptapEditor.forceEnablePlugins();
  return editor;
}
