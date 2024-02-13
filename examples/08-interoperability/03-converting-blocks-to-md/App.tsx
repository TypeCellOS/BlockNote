import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";
import { useState } from "react";

// TODO: better design?
export default function App() {
  // Stores the editor's contents as Markdown.
  const [markdown, setMarkdown] = useState<string>("");

  // Creates a new editor instance with some initial content.
  const editor = useBlockNote({
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
    const markdown = await editor.blocksToMarkdownLossy(editor.topLevelBlocks);
    setMarkdown(markdown);
  };

  // Renders the editor instance, and its contents as Markdown below.
  return (
    <div>
      <BlockNoteView editor={editor} onChange={onChange} />
      <pre>{markdown}</pre>
    </div>
  );
}
