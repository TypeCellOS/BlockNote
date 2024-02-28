import {
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContent,
  TableContent,
} from "@blocknote/core";
import { BlockNoteView, useCreateBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";
import { useState } from "react";

export default function App() {
  // Stores the editor's contents as an array of Block objects.
  // TODO: InlineContent and TableContent should have default type args
  const [inlineContent, setInlineContent] = useState<
    (
      | InlineContent<DefaultInlineContentSchema, DefaultStyleSchema>[]
      | TableContent<DefaultInlineContentSchema, DefaultStyleSchema>
      | undefined
    )[]
  >([]);
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    initialContent: [
      {
        type: "paragraph",
        content: "Welcome to this demo!",
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Hello ",
            styles: {},
          },
          {
            type: "text",
            text: "there, ",
            styles: {
              bold: true,
            },
          },
          {
            type: "link",
            content: "BlockNote",
            href: "https://www.blocknotejs.org",
          },
        ],
      },
      {
        type: "paragraph",
      },
    ],
  });

  // Renders the editor instance and the contents of its blocks below.
  return (
    <div>
      <BlockNoteView
        editor={editor}
        onChange={() => {
          // Converts the editor's contents to an array with each top level
          // block's content.
          setInlineContent(editor.document.map((block) => block.content));
        }}
      />
      <p>Document JSON:</p>
      <pre>{JSON.stringify(inlineContent, null, 2)}</pre>
    </div>
  );
}
