import {
  BlockNoteView,
  FormattingToolbarPositioner,
  HyperlinkToolbarPositioner,
  ImageToolbarPositioner,
  SideMenuPositioner,
  SlashMenuPositioner,
  useBlockNote,
} from "@blocknote/react";
import "@blocknote/react/style.css";

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
        sideMenu={() => <div className={"sideMenu"}>Side Menu</div>}
      />
      <ImageToolbarPositioner editor={editor} />
    </BlockNoteView>
  );
}
