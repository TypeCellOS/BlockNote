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
    [editor],
  );

  // For initialization; on mount, convert the initial HTML to blocks and replace the default editor's content
  useEffect(() => {
    async function loadInitialHTML() {
      const blocks = await editor.tryParseHTMLToBlocks(initialHTML);
      editor.replaceBlocks(editor.document, blocks);
    }
    loadInitialHTML();
  }, [editor]);

  // Renders the HTML input and editor instance.
  return (
    <div className="views">
      <div className="view-wrapper">
        <div className="view-label">HTML Input</div>
        <div className="view">
          <code>
            <textarea defaultValue={initialHTML} onChange={htmlInputChanged} />
          </code>
        </div>
      </div>
      <div className="view-wrapper">
        <div className="view-label">Editor Output</div>
        <div className="view">
          <BlockNoteView editor={editor} editable={false} />
        </div>
      </div>
    </div>
  );
}
