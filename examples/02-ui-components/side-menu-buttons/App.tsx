import {
  BlockNoteView,
  SideMenuController,
  useCreateBlockNote,
} from "@blocknote/react";
import "@blocknote/react/style.css";

import { CustomSideMenu } from "./CustomSideMenu";

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote();

  // Renders the editor instance.
  return (
    <BlockNoteView editor={editor} sideMenu={false}>
      <SideMenuController sideMenu={CustomSideMenu} />
    </BlockNoteView>
  );
}
