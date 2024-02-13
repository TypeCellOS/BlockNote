import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";
import { useState } from "react";

// TODO: better design?
export default function App() {
  // Stores the editor's contents as HTML.
  const [html, setHTML] = useState<string>("");

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
    // Converts the editor's contents from Block objects to HTML and store to state.
    const html = await editor.blocksToHTMLLossy(editor.topLevelBlocks);
    setHTML(html);
  };

  // Renders the editor instance, and its contents as HTML below.
  return (
    <div>
      <BlockNoteView editor={editor} onChange={onChange} />
      <pre>{html}</pre>
    </div>
  );
}
