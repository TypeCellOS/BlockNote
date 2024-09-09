import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote, BlockNoteDefaultUI } from "@blocknote/ai";
import "@blocknote/mantine/style.css";
import { BlockNoteView } from "@blocknote/mantine";

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote();

  // Renders the editor instance using a React component.
  return (
    <BlockNoteView
      editor={editor}
      formattingToolbar={false}
      linkToolbar={false}
      slashMenu={false}
      sideMenu={false}
      filePanel={false}
      tableHandles={false}
      emojiPicker={false}>
      <BlockNoteDefaultUI />
    </BlockNoteView>
  );
}
