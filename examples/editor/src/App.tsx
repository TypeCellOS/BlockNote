// import logo from './logo.svg'
import "@blocknote/core/style.css";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import { Editor } from "@tiptap/core";
import styles from "./App.module.css";

type WindowWithProseMirror = Window &
  typeof globalThis & { ProseMirror: Editor };

function App() {
  const editor = useBlockNote({
    onUpdate: ({ editor }) => {
      console.log(editor.getJSON());
      (window as WindowWithProseMirror).ProseMirror = editor; // Give tests a way to get editor instance
    },
    editorProps: {
      attributes: {
        class: styles.editor,
        "data-test": "editor",
      },
    },
  });

  return <BlockNoteView editor={editor} />;
}

export default App;
