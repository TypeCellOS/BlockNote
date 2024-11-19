import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

// .. in imports are temporary for development (vite setup)

// Need to be imported before @liveblocks/react-blocknote styles
import "@liveblocks/react-ui/styles.css";
// Need to be imported after @liveblocks/react-ui styles
import "@liveblocks/react-blocknote/styles.css";

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
