import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";
import { useEffect, useState } from "react";

export default function App() {
  // Stores the current Markdown content.
  const [markdown, setMarkdown] = useState<string>("");

  // Creates a new editor instance.
  const editor = useBlockNote({});

  useEffect(() => {
    // Whenever the current Markdown content changes, converts it to an array
    // of Block objects and replaces the editor's content with them.
    const getBlocks = async () => {
      const blocks = await editor.tryParseMarkdownToBlocks(markdown);
      editor.replaceBlocks(editor.topLevelBlocks, blocks);
    };
    getBlocks();
  }, [editor, markdown]);

  // Renders a text area for you to write/paste Markdown in, and the editor
  // instance below, which displays the current Markdown as blocks.
  return (
    <div>
      <textarea
        value={markdown}
        onChange={(event) => setMarkdown(event.target.value)}
      />
      <BlockNoteView editor={editor} editable={false} />
    </div>
  );
}
