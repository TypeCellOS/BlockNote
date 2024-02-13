import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";
import { ChangeEvent, useCallback, useEffect } from "react";

const initialHTML = "<p>Hello, <strong>world!</strong></p>";

// TODO: better design?
export default function App() {
  // Creates a new editor instance.
  const editor = useBlockNote();

  const htmlInputChanged = useCallback(
    async (e: ChangeEvent<HTMLTextAreaElement>) => {
      // Whenever the current HTML content changes, converts it to an array of
      // Block objects and replaces the editor's content with them.
      const blocks = await editor.tryParseHTMLToBlocks(e.target.value);
      editor.replaceBlocks(editor.topLevelBlocks, blocks);
    },
    [editor]
  );

  // For initialization; on mount, convert the initial HTML to blocks and replace the default editor's content
  useEffect(() => {
    async function loadInitialHTML() {
      const blocks = await editor.tryParseHTMLToBlocks(initialHTML);
      editor.replaceBlocks(editor.topLevelBlocks, blocks);
    }
    loadInitialHTML();
  }, [editor]);

  // Renders a text area for you to write/paste HTML in, and the editor instance
  // below, which displays the current HTML as blocks.
  return (
    <div>
      <textarea defaultValue={initialHTML} onChange={htmlInputChanged} />
      <BlockNoteView editor={editor} editable={false} />
    </div>
  );
}
