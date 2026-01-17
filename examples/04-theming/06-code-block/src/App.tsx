import { BlockNoteSchema, createCodeBlockSpec } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { useState } from "react";
import { codeBlockOptions } from "@blocknote/code-block";

export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const editor = useCreateBlockNote({
    schema: BlockNoteSchema.create().extend({
      blockSpecs: {
        codeBlock: createCodeBlockSpec(codeBlockOptions),
      },
    }),
    initialContent: [
      {
        type: "codeBlock",
        props: {
          language: "typescript",
        },
        content: [
          {
            type: "text",
            text: "const x = 3 * 4;",
            styles: {},
          },
        ],
      },
      {
        type: "paragraph",
      },
      {
        type: "heading",
        props: {
          textColor: "default",
          backgroundColor: "default",
          textAlignment: "left",
          level: 3,
        },
        content: [
          {
            type: "text",
            text: 'Click on "Typescript" above to see the different supported languages',
            styles: {},
          },
        ],
      },
      {
        type: "paragraph",
      },
    ],
  });

  return (
    <div style={{ padding: "20px" }}>
      <button
        onClick={toggleTheme}
        style={{
          marginBottom: "20px",
          padding: "10px 20px",
          cursor: "pointer",
          fontSize: "16px",
        }}
      >
        Switch to {theme === "light" ? "Dark" : "Light"} Theme
      </button>
      <BlockNoteView editor={editor} theme={theme} />
    </div>
  );
}
