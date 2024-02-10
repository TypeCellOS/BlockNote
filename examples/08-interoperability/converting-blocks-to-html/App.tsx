import { useState } from "react";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";

export default function App() {
  // Stores the editor's contents as HTML.
  const [html, setHTML] = useState<string>("");

  // Creates a new editor instance.
  const editor = useBlockNote({
    // Listens for when the editor's contents change.
    onEditorContentChange: (editor) => {
      // Converts the editor's contents from Block objects to HTML and saves
      // them.
      const saveBlocksAsHTML = async () => {
        const html = await editor.blocksToHTMLLossy(editor.topLevelBlocks);
        setHTML(html);
      };
      saveBlocksAsHTML();
    },
  });

  // Renders the editor instance, and its contents as HTML below.
  return (
    <div>
      <BlockNoteView editor={editor} theme={"light"} />
      <pre>{html}</pre>
    </div>
  );
}
