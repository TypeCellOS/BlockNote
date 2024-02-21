import {
  BlockNoteView,
  HyperlinkToolbarController,
  useBlockNote,
} from "@blocknote/react";
import "@blocknote/react/style.css";

import { CustomHyperlinkToolbar } from "./CustomHyperlinkToolbar";

export default function App() {
  // Creates a new editor instance.
  const editor = useBlockNote();

  // Renders the editor instance.
  return (
    <BlockNoteView editor={editor} hyperlinkToolbar={false}>
      <HyperlinkToolbarController hyperlinkToolbar={CustomHyperlinkToolbar} />
    </BlockNoteView>
  );
}
