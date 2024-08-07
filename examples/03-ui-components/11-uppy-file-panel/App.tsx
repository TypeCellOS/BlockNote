import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  FilePanelController,
  FormattingToolbar,
  FormattingToolbarController,
  getFormattingToolbarItems,
  useCreateBlockNote,
} from "@blocknote/react";

import { FileReplaceButton } from "./FileReplaceButton";
import { uploadFile, UppyFilePanel } from "./UppyFilePanel";

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    initialContent: [
      {
        type: "paragraph",
        content: "Welcome to this demo!",
      },
      {
        type: "paragraph",
        content: "Upload an image using the button below",
      },
      {
        type: "image",
      },
      {
        type: "paragraph",
      },
    ],
    uploadFile,
  });

  // Renders the editor instance using a React component.
  return (
    <BlockNoteView editor={editor} formattingToolbar={false} filePanel={false}>
      <FormattingToolbarController
        formattingToolbar={(props) => {
          // Replaces default file replace button with one that opens Uppy.
          const items = getFormattingToolbarItems();
          items.splice(
            items.findIndex((c) => c.key === "replaceFileButton"),
            1,
            <FileReplaceButton key={"fileReplaceButton"} />
          );

          return <FormattingToolbar {...props}>{items}</FormattingToolbar>;
        }}
      />
      {/* Replaces default file panel with Uppy one. */}
      <FilePanelController filePanel={UppyFilePanel} />
    </BlockNoteView>
  );
}
