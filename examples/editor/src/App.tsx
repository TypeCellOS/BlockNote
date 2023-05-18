// import logo from './logo.svg'
import { defaultBlockSchema } from "@blocknote/core";
import "@blocknote/core/style.css";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import {
  insertAlert,
  ReactAlert,
} from "../../../tests/utils/customblocks/Alert";
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
    blockSchema: {
      ...defaultBlockSchema,
      alert: ReactAlert,
    },
    slashCommands: [insertAlert],
  });

  // Give tests a way to get prosemirror instance
  (window as WindowWithProseMirror).ProseMirror = editor?._tiptapEditor;

  return <BlockNoteView editor={editor} />;
}

export default App;
