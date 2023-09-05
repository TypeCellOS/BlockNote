// import logo from './logo.svg'
import "@blocknote/core/style.css";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import styles from "./App.module.css";

type WindowWithProseMirror = Window & typeof globalThis & { ProseMirror: any };

function App() {
  const editor = useBlockNote({
    onEditorContentChange: (editor) => {
      console.log(editor.topLevelBlocks);
    },
    domAttributes: {
      editor: {
        class: styles.editor,
        "data-test": "editor",
      },
    },
  });

  // Give tests a way to get prosemirror instance
  (window as WindowWithProseMirror).ProseMirror = editor?._tiptapEditor;

  return <BlockNoteView editor={editor} />;
}

export default App;
