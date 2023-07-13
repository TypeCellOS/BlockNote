// import logo from './logo.svg'
import "@blocknote/core/style.css";
import {
  BlockNoteView,
  FormattingToolbarWrapper,
  SlashMenuWrapper,
  SideMenuWrapper,
  HyperlinkToolbarWrapper,
  useBlockNote,
  defaultReactSlashMenuItems,
  DefaultSideMenu,
  DragHandleMenuItem,
  DragHandleMenu,
} from "@blocknote/react";
import styles from "./App.module.css";

type WindowWithProseMirror = Window & typeof globalThis & { ProseMirror: any };

function App() {
  const editor = useBlockNote({
    onEditorContentChange: (editor) => {
      console.log(editor.topLevelBlocks);
    },
    editorDOMAttributes: {
      class: styles.editor,
      "data-test": "editor",
    },
    theme: "light",
  });

  // Give tests a way to get prosemirror instance
  (window as WindowWithProseMirror).ProseMirror = editor?._tiptapEditor;

  return (
    <BlockNoteView editor={editor}>
      <FormattingToolbarWrapper
        editor={editor}
        formattingToolbar={() => <div>Formatting Toolbar</div>}
      />
      <HyperlinkToolbarWrapper
        editor={editor}
        hyperlinkToolbar={() => <div>Hyperlink Toolbar</div>}
      />
      <SlashMenuWrapper
        editor={editor}
        slashMenu={() => <div>Slash Menu</div>}
        slashMenuItems={defaultReactSlashMenuItems.filter((item) =>
          item.name.includes("Heading")
        )}
      />
      <SideMenuWrapper editor={editor} sideMenu={() => <div>Side Menu</div>} />
      {/*<SideMenuWrapper*/}
      {/*  editor={editor}*/}
      {/*  sideMenu={(props) => (*/}
      {/*    <DefaultSideMenu*/}
      {/*      {...props}*/}
      {/*      dragHandleMenu={() => (*/}
      {/*        <DragHandleMenu>*/}
      {/*          <DragHandleMenuItem>Item</DragHandleMenuItem>*/}
      {/*        </DragHandleMenu>*/}
      {/*      )}*/}
      {/*    />*/}
      {/*  )}*/}
      {/*/>*/}
    </BlockNoteView>
  );
}

export default App;
