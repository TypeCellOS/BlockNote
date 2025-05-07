import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";

import YPartyKitProvider from "y-partykit/provider";
import * as Y from "yjs";
import "./styles.css";
import { useEffect, useState } from "react";

const params = new URLSearchParams(window.location.search);
const ghostWritingRoom = params.get("room");
const ghostWriterIndex = parseInt(params.get("index") || "1");
const isGhostWriting = Boolean(ghostWritingRoom);
const roomName = ghostWritingRoom || `ghost-writer-${Date.now()}`;
// Sets up Yjs document and PartyKit Yjs provider.
const doc = new Y.Doc();
const provider = new YPartyKitProvider(
  "blocknote-dev.yousefed.partykit.dev",
  // Use a unique name as a "room" for your application.
  roomName,
  doc
);

const ghostContent =
  "This demo shows a two-way sync of documents. It allows you to test collaboration features, and see how stable the editor is. ";

export default function App() {
  const [numGhostWriters, setNumGhostWriters] = useState(1);
  const editor = useCreateBlockNote({
    collaboration: {
      // The Yjs Provider responsible for transporting updates:
      provider,
      // Where to store BlockNote data in the Y.Doc:
      fragment: doc.getXmlFragment("document-store"),
      // Information (name and color) for this user:
      user: {
        name: isGhostWriting
          ? `Ghost Writer #${ghostWriterIndex}`
          : "My Username",
        color: isGhostWriting ? "#CCCCCC" : "#00ff00",
      },
    },
  });

  useEffect(() => {
    if (!isGhostWriting) {
      return;
    }
    let index = 0;
    let timeout: NodeJS.Timeout;

    const scheduleNextChar = () => {
      const jitter = Math.random() * 200; // Random delay between 0-200ms
      timeout = setTimeout(() => {
        const firstBlock = editor.document?.[0];
        if (firstBlock) {
          editor.insertInlineContent(ghostContent[index], {
            updateSelection: true,
          });
          index = (index + 1) % ghostContent.length;
        }
        scheduleNextChar();
      }, 50 + jitter);
    };

    scheduleNextChar();

    return () => clearTimeout(timeout);
  }, [editor]);

  // Renders the editor instance.
  return (
    <>
      {!isGhostWriting && (
        <button onClick={() => setNumGhostWriters((a) => a + 1)}>
          Add a Ghost Writer
        </button>
      )}
      <BlockNoteView editor={editor} />

      {!isGhostWriting && (
        <div className="two-way-sync">
          {Array.from({ length: numGhostWriters }).map((_, index) => (
            <iframe
              src={`${window.location.href}?room=${roomName}&index=${
                index + 1
              }`}
              title="ghost writer"
            />
          ))}
        </div>
      )}
    </>
  );
}
