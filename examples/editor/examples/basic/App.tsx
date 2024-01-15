import { uploadToTmpFilesDotOrg_DEV_ONLY } from "@blocknote/core";
import {
  BlockNoteView,
  DefaultSlashMenu,
  FormattingToolbarPositioner,
  getDefaultReactSlashMenuItems,
  HyperlinkToolbarPositioner,
  ImageToolbarPositioner,
  SideMenuPositioner,
  SlashMenuPositioner,
  SuggestionMenuPositioner,
  TableHandlesPositioner,
  useBlockNote,
} from "@blocknote/react";
import "@blocknote/react/style.css";

type WindowWithProseMirror = Window & typeof globalThis & { ProseMirror: any };

export function App() {
  const editor = useBlockNote({
    domAttributes: {
      editor: {
        class: "editor",
        "data-test": "editor",
      },
    },
    uploadFile: uploadToTmpFilesDotOrg_DEV_ONLY,
    extraSuggestionMenus: [
      {
        name: "mentions",
        triggerCharacter: "@",
        getItems: getDefaultReactSlashMenuItems,
      },
    ],
  });

  // Give tests a way to get prosemirror instance
  (window as WindowWithProseMirror).ProseMirror = editor?._tiptapEditor;

  return (
    <BlockNoteView className="root" editor={editor}>
      <FormattingToolbarPositioner editor={editor} />
      <HyperlinkToolbarPositioner editor={editor} />
      <SlashMenuPositioner editor={editor} />
      <SideMenuPositioner editor={editor} />
      <ImageToolbarPositioner editor={editor} />
      {editor.blockSchema.table && (
        <TableHandlesPositioner editor={editor as any} />
      )}
      <SuggestionMenuPositioner
        editor={editor as any}
        suggestionsMenuName={"mentions"}
        suggestionsMenuComponent={DefaultSlashMenu}
      />
    </BlockNoteView>
  );
}

export default App;
