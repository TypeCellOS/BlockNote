import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { ChangeEvent, useCallback, useEffect } from "react";

const initialMarkdown = "Hello, **world!**";

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote();

  const markdownInputChanged = useCallback(
    async (e: ChangeEvent<HTMLTextAreaElement>) => {
      // Whenever the current Markdown content changes, converts it to an array of
      // Block objects and replaces the editor's content with them.
      const blocks = await editor.tryParseMarkdownToBlocks(e.target.value);
      editor.replaceBlocks(editor.document, blocks);
    },
    [editor]
  );

  // For initialization; on mount, convert the initial Markdown to blocks and replace the default editor's content
  useEffect(() => {
    async function loadInitialHTML() {
      const blocks = await editor.tryParseMarkdownToBlocks(initialMarkdown);
      editor.replaceBlocks(editor.document, blocks);
    }
    loadInitialHTML();
  }, [editor]);

  // Renders a text area for you to write/paste Markdown in, and the editor instance
  // below, which displays the current Markdown as blocks.
  return (
    <div className={"wrapper"}>
      <div>Input (Markdown):</div>
      <div className={"item bordered"}>
        <code>
          <textarea
            defaultValue={initialMarkdown}
            onChange={markdownInputChanged}
          />
        </code>
      </div>
      <div>Output (BlockNote Editor):</div>
      <div className={"item"}>
        <BlockNoteView editor={editor} editable={false} />
      </div>
    </div>
  );
}
