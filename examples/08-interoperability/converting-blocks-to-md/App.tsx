import { useState } from "react";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";

export default function App() {
  // Stores the editor's contents as Markdown.
  const [markdown, setMarkdown] = useState<string>("");

  // Creates a new editor instance.
  const editor = useBlockNote({
    // Listens for when the editor's contents change.
    onEditorContentChange: (editor) => {
      // Converts the editor's contents from Block objects to Markdown and
      // saves them.
      const saveBlocksAsMarkdown = async () => {
        const markdown = await editor.blocksToMarkdownLossy(
          editor.topLevelBlocks
        );
        setMarkdown(markdown);
      };
      saveBlocksAsMarkdown();
    },
  });

  // Renders the editor instance, and its contents as Markdown below.
  return (
    <div>
      <BlockNoteView editor={editor} theme={"light"} />
      <pre>{markdown}</pre>
    </div>
  );
}
