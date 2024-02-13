import {
  BlockNoteView,
  DefaultSideMenu,
  FormattingToolbarPositioner,
  HyperlinkToolbarPositioner,
  SideMenuPositioner,
  SlashMenuPositioner,
  useBlockNote,
} from "@blocknote/react";
import "@blocknote/react/style.css";

import { CustomDragHandleMenu } from "./CustomDragHandleMenu";

export default function App() {
  // Creates a new editor instance.
  const editor = useBlockNote();

  // Renders the editor instance.
  return (
    <BlockNoteView editor={editor}>
      <FormattingToolbarPositioner editor={editor} />
      <HyperlinkToolbarPositioner editor={editor} />
      <SlashMenuPositioner editor={editor} />
      <SideMenuPositioner
        editor={editor}
        sideMenu={(props) => (
          <DefaultSideMenu {...props} dragHandleMenu={CustomDragHandleMenu} />
        )}
      />
    </BlockNoteView>
  );
}
