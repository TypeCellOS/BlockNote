import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import {
  BlockNoteSchema,
  defaultBlockSpecs,
  createTableBlockSpec,
} from "@blocknote/core";
import { useState } from "react";

const customTable = createTableBlockSpec({
  customProp: {
    default: "",
  },
});

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    table: customTable,
  },
});

export default function App() {
  const editor = useCreateBlockNote({
    schema,
    initialContent: [
      {
        type: "table",
        props: {
          textColor: "default",
          customProp: "custom",
        },
        content: {
          type: "tableContent",

          headerRows: 1,
          rows: [
            {
              cells: [
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "text",
                      text: "Foo",
                      styles: {},
                    },
                  ],
                },
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "text",
                      text: "Bar",
                      styles: {},
                    },
                  ],
                },
              ],
            },
            {
              cells: [
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "text",
                      text: "value",
                      styles: {},
                    },
                  ],
                },
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "text",
                      text: "value",
                      styles: {},
                    },
                  ],
                },
              ],
            },
          ],
        },
        children: [],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "This is a table that has a custom prop `customProp` defined. Click on the button to change it to a random value. The JSON dump of the document is shown.",
          },
        ],
      },
    ],
  });

  const [doc, setDoc] = useState(editor.document);

  editor.onChange((editor) => {
    setDoc(editor.document); // re-render on changes
  });

  return (
    <div style={{ display: "flex", flexDirection: "row", height: "100vh" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          flex: 1,
        }}
      >
        <BlockNoteView theme="light" editor={editor}></BlockNoteView>
        <button
          onClick={() =>
            editor.updateBlock(editor.document[0], {
              props: { customProp: Math.random().toString() },
            })
          }
        >
          Change the prop
        </button>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          flex: 1,
          minHeight: 0,
        }}
      >
        <p>Document:</p>
        <pre style={{ flex: 1, overflow: "auto", margin: 0 }}>
          {JSON.stringify(editor.document, null, 2)}
        </pre>
      </div>
    </div>
  );
}
