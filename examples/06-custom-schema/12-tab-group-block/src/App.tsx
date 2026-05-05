import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { useEffect, useState } from "react";

import { createTabs } from "./Tabs.js";
import "./styles.css";

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    tabs: createTabs(),
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
          "A tab group whose content is a list of items, each carrying a typed `label` prop and a body of editor blocks:",
      },
      {
        type: "tabs" as const,
        content: [
          {
            props: { label: "Overview" },
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
                  {
                    type: "text",
                    text:
                      "This tab group composes three combinators: list of (props of (blocks)).",
                    styles: {},
                  },
                ],
              },
            ],
          },
          {
            props: { label: "Schema" },
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "Schema declaration:",
                    styles: {},
                  },
                ],
              },
              {
                type: "codeBlock",
                content: [
                  {
                    type: "text",
                    text:
                      'c.list(\n  c.props(\n    { label: { default: "Tab" } },\n    c.blocks(),\n  ),\n)',
                    styles: {},
                  },
                ],
              },
            ],
          },
          {
            props: { label: "Try it" },
            content: [
              {
                type: "bulletListItem",
                content: [
                  { type: "text", text: "Click a label to switch tabs.", styles: {} },
                ],
              },
              {
                type: "bulletListItem",
                content: [
                  {
                    type: "text",
                    text: "Double-click a label to rename.",
                    styles: {},
                  },
                ],
              },
              {
                type: "bulletListItem",
                content: [
                  {
                    type: "text",
                    text: "Click + Add tab to grow the list.",
                    styles: {},
                  },
                ],
              },
              {
                type: "bulletListItem",
                content: [
                  {
                    type: "text",
                    text:
                      "Inside a tab body, hit `/` for the slash menu — the body is a real block region.",
                    styles: {},
                  },
                ],
              },
            ],
          },
        ] as any,
      } as any,
      {
        type: "paragraph",
        content:
          "Watch the JSON below as you switch tabs and edit content — the array shape mirrors the schema exactly.",
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
