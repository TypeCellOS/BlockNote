// import logo from './logo.svg'
import "@blocknote/core/style.css";
import {
  BlockNoteView,
  FormattingToolbarPositioner,
  HyperlinkToolbarPositioner,
  SideMenuPositioner,
  SlashMenuPositioner,
  useBlockNote,
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

  // Use mock ID if tests are running.
  if ((window as any).__TEST_OPTIONS === undefined) {
    // (window as any).__TEST_OPTIONS = {};
  }

  return (
    <BlockNoteView editor={editor}>
      <FormattingToolbarPositioner
        editor={editor}
        // formattingToolbar={() => <div>Formatting Toolbar</div>}
      />
      <HyperlinkToolbarPositioner editor={editor} />
      <SlashMenuPositioner editor={editor} />
      <SideMenuPositioner editor={editor} />
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
