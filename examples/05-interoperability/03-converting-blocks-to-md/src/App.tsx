import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { useEffect, useState } from "react";

import "./styles.css";

export default function App() {
  // Stores the editor's contents as Markdown.
  const [markdown, setMarkdown] = useState<string>("");

  // Creates a new editor instance with some initial content.
  const editor = useCreateBlockNote({
    initialContent: [
      {
        type: "paragraph",
        content: [
          "Hello, ",
          {
            type: "text",
            text: "world!",
            styles: {
              bold: true,
            },
          },
        ],
      },
    ],
  });

  const onChange = async () => {
    // Converts the editor's contents from Block objects to Markdown and store to state.
    const markdown = await editor.blocksToMarkdownLossy(editor.document);
    setMarkdown(markdown);
  };

  useEffect(() => {
    // on mount, trigger initial conversion of the initial content to md
    onChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Renders the editor instance and Markdown output.
  return (
    <div className="views">
      <div className="view-wrapper">
        <div className="view-label">Editor Input</div>
        <div className="view">
          <BlockNoteView editor={editor} onChange={onChange} />
        </div>
      </div>
      <div className="view-wrapper">
        <div className="view-label">Markdown Output</div>
        <div className="view">
          <pre>
            <code>{markdown}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
