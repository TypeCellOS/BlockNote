import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useState } from "react";

import "./style.css";
import { StaticText, NavBar } from "./DummyUI";

// Enough content that the editor actually overflows, so scrolling is testable.
const initialContent = [
  { type: "paragraph" as const, content: "Welcome to this demo!" },
  {
    type: "paragraph" as const,
    content:
      "Select some text to bring up the toolbar, then scroll. With the pinned " +
      "scroll container layout on, it stays put because the document itself " +
      "doesn't scroll. Toggle it off in the nav bar to compare.",
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

  // Which element scrolls the page. The "pinned scroll container" layout is
  // opt-in via a single class: adding `bn-scroll-host` to the scroll container
  // makes BlockNote's injected styles lock document scroll and pin the container
  // to the visual viewport. Switching layouts is therefore just adding/removing
  // the class - a real app would apply it unconditionally, the switch is only
  // here so you can compare both.
  const [scrollMode, setScrollMode] = useState<
    "scrolling-document" | "scroll-container"
  >("scroll-container");

  return (
    <div
      className={
        scrollMode === "scroll-container" ? "bn-scroll-host" : undefined
      }
    >
      <NavBar scrollMode={scrollMode} onScrollModeChange={setScrollMode} />
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
