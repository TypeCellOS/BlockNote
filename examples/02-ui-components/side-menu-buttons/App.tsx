import {
  BlockNoteView,
  DefaultPositionedSideMenu,
  useBlockNote,
} from "@blocknote/react";
import "@blocknote/react/style.css";

import { CustomSideMenu } from "./CustomSideMenu";

export default function App() {
  // Creates a new editor instance.
  const editor = useBlockNote();

  // Renders the editor instance.
  return (
    <BlockNoteView editor={editor} sideMenu={false}>
      <DefaultPositionedSideMenu
        sideMenu={(props) => <CustomSideMenu editor={editor} {...props} />}
      />
    </BlockNoteView>
  );
}
