import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { useEffect, useState } from "react";

import { createCallout } from "./Callout.js";
import "./styles.css";

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    callout: createCallout(),
  },
});

export default function App() {
  const [blocks, setBlocks] = useState<typeof editor.document>([]);

  const editor = useCreateBlockNote({
    schema,
    initialContent: [
      {
        type: "paragraph",
        content:
          "A callout block whose content is a sequence of editor blocks (note the array of blocks in the JSON below):",
      },
      {
        type: "callout" as const,
        props: { tone: "tip" },
        content: [
          {
            type: "heading",
            props: { level: 3 },
            content: [
              { type: "text", text: "Combinator content schemas", styles: {} },
            ],
          },
          {
            type: "paragraph",
            content: [
              { type: "text", text: "The ", styles: {} },
              { type: "text", text: "c.blocks()", styles: { code: true } as any },
              {
                type: "text",
                text:
                  " combinator lets a block's content be a stretch of editor blocks — exactly like the top-level document.",
                styles: {},
              },
            ],
          },
          {
            type: "bulletListItem",
            content: [
              {
                type: "text",
                text: "Drop in headings, paragraphs, lists, …",
                styles: {},
              },
            ],
          },
          {
            type: "bulletListItem",
            content: [
              {
                type: "text",
                text: "All editor commands work inside the callout body.",
                styles: {},
              },
            ],
          },
          {
            type: "bulletListItem",
            content: [
              {
                type: "text",
                text: "Even nested callouts are valid.",
                styles: {},
              },
            ],
          },
        ] as any,
      } as any,
      {
        type: "paragraph",
        content:
          "Try the slash menu (/) inside the callout, or click the icon to change the tone.",
      },
    ],
  });

  useEffect(() => setBlocks(editor.document), [editor]);

  return (
    <div className="wrapper">
      <div>BlockNote Editor:</div>
      <div className="item">
        <BlockNoteView
          editor={editor}
          onChange={() => setBlocks(editor.document)}
        />
      </div>
      <div>Document JSON:</div>
      <div className="item bordered">
        <pre>
          <code>{JSON.stringify(blocks, null, 2)}</code>
        </pre>
      </div>
    </div>
  );
}
