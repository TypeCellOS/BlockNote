import { BlockNoteEditor } from "@blocknote/core";
import { schemaWithMention as schema } from "@shared/testing/editorSchemas/mention.js";
import { createAIExtension } from "../../../AIExtension.js";

export function getEditorWithFormattingAndMentions() {
  return BlockNoteEditor.create({
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
            text: "! How ",
          },
          {
            type: "text",
            text: "are you doing? ",
            styles: {
              bold: true,
            },
          },
          {
            type: "text",
            text: "I'm feeling blue!",
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
    _extensions: {
      ai: createAIExtension({
        model: undefined as any,
      }),
    },
  });
}
