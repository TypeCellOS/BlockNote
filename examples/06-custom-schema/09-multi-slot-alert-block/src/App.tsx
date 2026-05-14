import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { useEffect, useState } from "react";

import { createAlert } from "./Alert.js";
import "./styles.css";

// Schema with the multi-slot alert block added.
const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    alert: createAlert(),
  },
});

export default function App() {
  // The editor's `document` carries the full custom-schema type (including
  // the `alert` block with its `{ title, body }` content), so we infer the
  // state type from it instead of using the unparameterized `Block`.
  const [blocks, setBlocks] = useState<typeof editor.document>([]);

  // Editor preloaded with an example alert that has both slots populated, so
  // the JSON panel below shows the `{ title, body }` shape from the start.
  const editor = useCreateBlockNote({
    schema,
    initialContent: [
      {
        type: "paragraph",
        content: "An alert below has two independent rich-text regions:",
      },
      {
        type: "alert" as const,
        props: { variant: "info" },
        content: {
          title: [
            { type: "text", text: "Heads up", styles: { bold: true } },
          ],
          body: [
            { type: "text", text: "Title and body are ", styles: {} },
            { type: "text", text: "separate slots", styles: { italic: true } },
            { type: "text", text: " in the JSON.", styles: {} },
          ],
        } as any,
      } as any,
      {
        type: "paragraph",
        content:
          "Edit either slot and watch the JSON below — title and body update independently.",
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
