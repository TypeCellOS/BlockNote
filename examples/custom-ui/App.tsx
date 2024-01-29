import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";

import { CustomFormattingToolbar } from "./CustomFormattingToolbar";
import { CustomSlashMenu } from "./CustomSlashMenu";
import { CustomSideMenu } from "./CustomSideMenu";
import "./styles.css";

export default function App() {
  const editor = useBlockNote();

  return (
    <BlockNoteView editor={editor}>
      {/*Adding custom UI elements*/}
      <CustomFormattingToolbar editor={editor} />
      <CustomSlashMenu editor={editor} />
      <CustomSideMenu editor={editor} />
    </BlockNoteView>
  );
}
