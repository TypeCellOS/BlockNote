// import logo from './logo.svg'
import { defaultBlockSchema } from "@blocknote/core";
import "@blocknote/core/style.css";
import {
  BNTable,
  BlockNoteView,
  FormattingToolbarPositioner,
  HyperlinkToolbarPositioner,
  SideMenuPositioner,
  SlashMenuPositioner,
  getDefaultReactSlashMenuItems,
  useBlockNote,
} from "@blocknote/react";
import "@glideapps/glide-data-grid/dist/index.css";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";
import styles from "./App.module.css";

type WindowWithProseMirror = Window & typeof globalThis & { ProseMirror: any };

const doc = new Y.Doc();
const provider = new WebsocketProvider("", "test", doc, { connect: false });
provider.connectBc();
(window as any).awareness = provider.awareness;
function App() {
  const editor = useBlockNote({
    collaboration: {
      user: {
        color: "#" + Math.random().toString(16).slice(2, 8),
        name: "Test User" + Math.random().toString(16).slice(2, 8),
      },
      provider,
      fragment: doc.getXmlFragment("prosemirror"),
    },
    onEditorContentChange: (editor) => {
      console.log(editor.topLevelBlocks);
    },
    editorDOMAttributes: {
      class: styles.editor,
      "data-test": "editor",
    },
    theme: "light",
    blockSchema: {
      ...defaultBlockSchema,
      table: {
        node: BNTable as any,
        propSchema: {},
      },
    },
    slashMenuItems: [
      ...getDefaultReactSlashMenuItems(),
      {
        name: "test",
        execute: (editor) => {
          const currentBlock = editor.getTextCursorPosition().block;
          editor._tiptapEditor.commands.insertTable();
          // editor.insertBlocks(
          //   [
          //     {
          //       type: "table",
          //     },
          //   ],
          //   currentBlock,
          //   "after"
          // );
        },
      },
    ],
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
