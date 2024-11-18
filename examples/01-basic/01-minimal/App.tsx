import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "@liveblocks/react-ui/../styles.css";

import "@liveblocks/react-tiptap/../styles.css";

import { Editor } from "./Editor.jsx";
import { Room } from "./Room.jsx";
import "./globals.css";

export default function App() {
  // Renders the editor instance using a React component.
  return (
    <Room>
      <Editor />
    </Room>
  );
}

/**
 *
 * TODO:
 * - blocking: DOM updates
 * - fix mount issue
 * - - (domelement)
 * - - make with with queueMicrotask
 * - versioning
 * - automatic comment button?
 * - Even simpler API?
 * - History
 * - mentions:
 * -- paste handler
 * -- "change" API to trigger code from document changes
 * -- hook up blocknote mentions, create default mention API that adds inline content + menu
 */
