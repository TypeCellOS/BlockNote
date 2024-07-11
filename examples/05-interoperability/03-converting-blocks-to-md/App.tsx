import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useState } from "react";

import "./styles.css";

export default function App() {
  // Stores the editor's contents as Markdown.
  const [markdown, setMarkdown] = useState<string>("");

  // Creates a new editor instance with some initial content.
  const editor = useCreateBlockNote({
    initialContent: [
      {
        type: "paragraph",
        content: [
          "Hello, ",
          {
            type: "text",
            text: "world!",
            styles: {
              bold: true,
            },
          },
        ],
      },
    ],
  });

  const onChange = async () => {
    // Converts the editor's contents from Block objects to Markdown and store to state.
    const markdown = await editor.blocksToMarkdownLossy(editor.document);
    setMarkdown(markdown);
  };

  // Renders the editor instance, and its contents as Markdown below.
  return (
    <div className={"wrapper"}>
      <div>Input (BlockNote Editor):</div>
      <div className={"item"}>
        <BlockNoteView editor={editor} onChange={onChange} />
      </div>
      <div>Output (Markdown):</div>
      <div className={"item bordered"}>
        <pre>
          <code>{markdown}</code>
        </pre>
      </div>
    </div>
  );
}
