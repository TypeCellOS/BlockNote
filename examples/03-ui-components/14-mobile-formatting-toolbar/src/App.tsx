import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useEffect, useState } from "react";

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

  // Whether the "pinned scroll container" layout is on. It's pure CSS, toggled
  // by adding a class to `<html>` (see `style.css`): `html`/`body` scrolling is
  // locked and `.scroll-host` (pinned to the visual viewport) is what actually
  // scrolls, so the mobile formatting toolbar can stay at a truly fixed
  // position instead of following the page as it scrolls. A real app would
  // just apply those styles unconditionally - the toggle is only here so you
  // can compare both layouts.
  const [pinnedScrollContainer, setPinnedScrollContainer] = useState(true);
  useEffect(() => {
    document.documentElement.classList.toggle(
      "pinned-scroll-container",
      pinnedScrollContainer,
    );
    return () => {
      document.documentElement.classList.remove("pinned-scroll-container");
    };
  }, [pinnedScrollContainer]);

  return (
    <div className="scroll-host">
      <NavBar
        pinnedScrollContainer={pinnedScrollContainer}
        onPinnedScrollContainerChange={setPinnedScrollContainer}
      />
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
