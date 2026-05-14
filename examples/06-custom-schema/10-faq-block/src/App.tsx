import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { useEffect, useState } from "react";

import { createFaq } from "./Faq.js";
import "./styles.css";

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    faq: createFaq(),
  },
});

export default function App() {
  // The editor's `document` carries the full custom-schema type (including
  // the `faq` block whose content is `Array<{ question, answer }>`).
  const [blocks, setBlocks] = useState<typeof editor.document>([]);

  const editor = useCreateBlockNote({
    schema,
    initialContent: [
      {
        type: "paragraph",
        content:
          "An FAQ block whose content is a list of question/answer records:",
      },
      {
        type: "faq" as const,
        content: [
          {
            question: [
              { type: "text", text: "What is this?", styles: {} },
            ],
            answer: [
              {
                type: "text",
                text: "A demo of the ",
                styles: {},
              },
              {
                type: "text",
                text: "c.list",
                styles: { code: true } as any,
              },
              {
                type: "text",
                text: " combinator.",
                styles: {},
              },
            ],
          },
          {
            question: [
              { type: "text", text: "How is the JSON shaped?", styles: {} },
            ],
            answer: [
              {
                type: "text",
                text: "An array of records — see the panel below.",
                styles: {},
              },
            ],
          },
        ] as any,
      } as any,
      {
        type: "paragraph",
        content:
          "Click 'Add question' to grow the list, or edit any question or answer and watch the array update.",
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
