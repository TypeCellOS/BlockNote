import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { createRoot } from "react-dom/client";

function App() {
  const editor = useCreateBlockNote({
    initialContent: window.a11yInitialContent,
  });

  return (
    <main style={{ maxWidth: 900, margin: "80px auto", padding: 24 }}>
      <h1>BlockNote accessibility fixture</h1>
      <button type="button">Before editor</button>
      <BlockNoteView editor={editor} theme="light" />
      <button type="button">After editor</button>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
