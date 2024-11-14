import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "@liveblocks/react-tiptap/styles.css";
import "@liveblocks/react-ui/styles.css";
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
 * - blocking: Extension API
 * - fix mount issue
 * - - (domelement)
 * - - position out of range
 * - versioning
 * - automatic comment button?
 * - animation performance
 * - Even simpler API?
 * - side menu visibility when composing
 * - hide composing box when clicking outside
 * - users / mentions / history / notifications
 */
