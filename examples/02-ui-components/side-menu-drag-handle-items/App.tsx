import {
  BlockNoteView,
  SideMenu,
  SideMenuController,
  useCreateBlockNote,
} from "@blocknote/react";
import "@blocknote/react/style.css";

import { CustomDragHandleMenu } from "./CustomDragHandleMenu";

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote();

  // Renders the editor instance.
  return (
    <BlockNoteView editor={editor} sideMenu={false}>
      <SideMenuController
        sideMenu={(props) => (
          <SideMenu {...props} dragHandleMenu={CustomDragHandleMenu} />
        )}
      />
    </BlockNoteView>
  );
}
