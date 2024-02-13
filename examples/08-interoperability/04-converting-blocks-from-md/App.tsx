import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";
import { ChangeEvent, useCallback, useEffect } from "react";

// TODO: better design?
const initialMarkdown = "Hello, **world!**";

export default function App() {
  // Creates a new editor instance.
  const editor = useBlockNote();

  const markdownInputChanged = useCallback(
    async (e: ChangeEvent<HTMLTextAreaElement>) => {
      // Whenever the current Markdown content changes, converts it to an array of
      // Block objects and replaces the editor's content with them.
      const blocks = await editor.tryParseMarkdownToBlocks(e.target.value);
      editor.replaceBlocks(editor.topLevelBlocks, blocks);
    },
    [editor]
  );

  // For initialization; on mount, convert the initial Markdown to blocks and replace the default editor's content
  useEffect(() => {
    async function loadInitialHTML() {
      const blocks = await editor.tryParseMarkdownToBlocks(initialMarkdown);
      editor.replaceBlocks(editor.topLevelBlocks, blocks);
    }
    loadInitialHTML();
  }, [editor]);

  // Renders a text area for you to write/paste Markdown in, and the editor instance
  // below, which displays the current Markdown as blocks.
  return (
    <div>
      <textarea
        defaultValue={initialMarkdown}
        onChange={markdownInputChanged}
      />
      <BlockNoteView editor={editor} editable={false} />
    </div>
  );
}
