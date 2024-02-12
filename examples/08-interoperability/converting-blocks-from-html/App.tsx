import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";
import { useEffect, useState } from "react";

export default function App() {
  // Stores the current HTML content.
  const [html, setHTML] = useState<string>("");

  // Creates a new editor instance.
  const editor = useBlockNote();

  useEffect(() => {
    // Whenever the current HTML content changes, converts it to an array of
    // Block objects and replaces the editor's content with them.
    const getBlocks = async () => {
      const blocks = await editor.tryParseHTMLToBlocks(html);
      editor.replaceBlocks(editor.topLevelBlocks, blocks);
    };
    getBlocks();
  }, [editor, html]);

  // Renders a text area for you to write/paste HTML in, and the editor instance
  // below, which displays the current HTML as blocks.
  return (
    <div>
      <textarea
        value={html}
        onChange={(event) => setHTML(event.target.value)}
      />
      <BlockNoteView editor={editor} editable={false} />
    </div>
  );
}
