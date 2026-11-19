import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  BlockColorsItem,
  BlockLanguageItem,
  DragHandleMenu,
  RemoveBlockItem,
  SideMenu,
  SideMenuController,
  type SideMenuProps,
  useCreateBlockNote,
} from "@blocknote/react";

function LanguageDragHandleMenu() {
  return (
    <DragHandleMenu>
      <RemoveBlockItem>Delete</RemoveBlockItem>
      <BlockColorsItem>Colors</BlockColorsItem>
      <BlockLanguageItem
        languages={[
          { label: "English", language: "en" },
          { label: "Français", language: "fr" },
          { label: "Deutsch", language: "de" },
        ]}
      >
        Language
      </BlockLanguageItem>
    </DragHandleMenu>
  );
}

function LanguageSideMenu(props: SideMenuProps) {
  return <SideMenu {...props} dragHandleMenu={LanguageDragHandleMenu} />;
}

export default function App() {
  const editor = useCreateBlockNote({
    initialContent: [
      {
        type: "paragraph",
        content: "Open a block's drag handle menu to choose its language.",
      },
      {
        type: "paragraph",
        props: { lang: "en" },
        content:
          "The block looks the same, but screen readers will read content inside with the correct pronounciation for that language.",
      },
      {
        type: "paragraph",
        props: { lang: "fr" },
        content: "Bonjour tout le monde !",
      },
      {
        type: "paragraph",
        props: { lang: "de" },
        content: "Guten Tag zusammen!",
      },
    ],
  });

  return (
    <div lang="en">
      <BlockNoteView editor={editor} sideMenu={false}>
        <SideMenuController sideMenu={LanguageSideMenu} />
      </BlockNoteView>
    </div>
  );
}
