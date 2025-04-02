import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";

import "./styles.css";

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    initialContent: [
      {
        type: "paragraph",
        content: [
          {
            styles: {},
            type: "text",
            text: "Paste some text here",
          },
        ],
      },
    ],
    pasteHandler: ({ event, editor, defaultPasteHandler }) => {
      if (event.clipboardData?.types.includes("text/plain")) {
        editor.pasteMarkdown(
          event.clipboardData.getData("text/plain") +
            " - inserted by the custom paste handler"
        );
        return true;
      }
      return defaultPasteHandler();
    },
  });

  // Renders the editor instance using a React component.
  return (
    <div>
      <BlockNoteView editor={editor} />
      <div className={"edit-buttons"}>
        <button
          className={"edit-button"}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(
                "**This is markdown in the plain text format**"
              );
            } catch (error) {
              window.alert("Failed to copy plain text with markdown content");
            }
          }}>
          Copy sample markdown to clipboard (text/plain)
        </button>
        <button
          className={"edit-button"}
          onClick={async () => {
            try {
              await navigator.clipboard.write([
                new ClipboardItem({
                  "text/html": "<p><strong>HTML</strong></p>",
                }),
              ]);
            } catch (error) {
              window.alert("Failed to copy HTML content");
            }
          }}>
          Copy sample HTML to clipboard (text/html)
        </button>
        <button
          className={"edit-button"}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(
                "This is plain text in the plain text format"
              );
            } catch (error) {
              window.alert("Failed to copy plain text");
            }
          }}>
          Copy sample plain text to clipboard (text/plain)
        </button>
        <button
          className={"edit-button"}
          onClick={async () => {
            try {
              await navigator.clipboard.write([
                new ClipboardItem({
                  "text/plain": "Plain text",
                }),
                new ClipboardItem({
                  "text/html": "<p><strong>HTML</strong></p>",
                }),
                new ClipboardItem({
                  "text/markdown": "**Markdown**",
                }),
              ]);
            } catch (error) {
              window.alert("Failed to copy multiple formats");
            }
          }}>
          Copy sample markdown, HTML, and plain text to clipboard (Safari only)
        </button>
      </div>
    </div>
  );
}
