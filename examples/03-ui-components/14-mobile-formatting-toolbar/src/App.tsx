import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote, useVisualViewport } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";

import "./style.css";
import { StaticText, NavBar } from "./DummyUI";

// Enough content that the editor actually overflows, so scrolling is testable.
const initialContent = [
  { type: "paragraph" as const, content: "Welcome to this demo!" },
  {
    type: "paragraph" as const,
    content:
      "Select some text to bring up the toolbar, then scroll — it stays " +
      "pinned above the keyboard because the document itself doesn't scroll.",
  },
  ...Array.from({ length: 20 }, (_, i) => ({
    type: "paragraph" as const,
    content:
      `Filler paragraph ${i + 1}. Select some text here and bring up the ` +
      "keyboard to see the toolbar sit above it.",
  })),
];

export default function App() {
  const editor = useCreateBlockNote({ initialContent });

  // Opt into the "non-scrolling document" behavior: locks document scroll so the
  // toolbar stays smoothly pinned above the keyboard during scroll, and publishes
  // the `--bn-vv-*` variables this `.scroll-host` is sized against.
  useVisualViewport();

  return (
    // The document itself doesn't scroll — `useVisualViewport` locks it and pins
    // this `.scroll-host` to the visual viewport via the `--bn-vv-*` variables.
    <div className="scroll-host">
      <NavBar />
      <main className="app-main">
        <StaticText />
        {/* On mobile, the default UI automatically shows the mobile formatting
            toolbar above the keyboard - no extra setup needed. */}
        <BlockNoteView editor={editor} />
        <StaticText />
      </main>
    </div>
  );
}
