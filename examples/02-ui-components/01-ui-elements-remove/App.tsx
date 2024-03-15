import "@blocknote/core/fonts/inter.css";
import { BlockNoteView, useCreateBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";

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
        content:
          "There are no menus or toolbars in this editor, but you can still markup text using keyboard shortcuts.",
      },
      {
        type: "paragraph",
        content:
          "Try making text bold with Ctrl+B/Cmd+B or undo with Ctrl+Z/Cmd+Z.",
      },
      {
        type: "paragraph",
      },
    ],
  });

  // Renders the editor instance.
  return (
    <BlockNoteView
      editor={editor}
      // Removes all menus and toolbars.
      formattingToolbar={false}
      linkToolbar={false}
      imageToolbar={false}
      sideMenu={false}
      slashMenu={false}
      tableHandles={false}
    />
  );
}
