import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";
import { useState } from "react";

export default function App() {
  const [markdown, setMarkdown] = useState<string>("");

  // Creates a new editor instance.
  const editor = useBlockNote({});

  const onChange = async () => {
    // Save markdown version of document (blocks) on state
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
