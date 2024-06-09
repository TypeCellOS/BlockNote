import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { ChangeEvent, useCallback, useEffect } from "react";

import "./styles.css";

const initialHTML = "<p>Hello, <strong>world!</strong></p>";

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote();

  const htmlInputChanged = useCallback(
    async (e: ChangeEvent<HTMLTextAreaElement>) => {
      // Whenever the current HTML content changes, converts it to an array of
      // Block objects and replaces the editor's content with them.
      const blocks = await editor.tryParseHTMLToBlocks(e.target.value);
      editor.replaceBlocks(editor.document, blocks);
    },
    [editor]
  );

  // For initialization; on mount, convert the initial HTML to blocks and replace the default editor's content
  useEffect(() => {
    async function loadInitialHTML() {
      const blocks = await editor.tryParseHTMLToBlocks(initialHTML);
      editor.replaceBlocks(editor.document, blocks);
    }
    loadInitialHTML();
  }, [editor]);

  // Renders a text area for you to write/paste HTML in, and the editor instance
  // below, which displays the current HTML as blocks.
  return (
    <div className={"wrapper"}>
      <div>Input (HTML):</div>
      <div className={"item bordered"}>
        <code>
          <textarea defaultValue={initialHTML} onChange={htmlInputChanged} />
        </code>
      </div>
      <div>Output (BlockNote Editor):</div>
      <div className={"item"}>
        <BlockNoteView editor={editor} editable={false} />
      </div>
    </div>
  );
}
