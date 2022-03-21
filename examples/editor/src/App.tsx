// import logo from './logo.svg'
import styles from "./App.module.css";
import { EditorContent, useEditor } from "@blocknote/core";
import { Editor } from "@tiptap/core";
// import "@blocknote/core/style.css";

type WindowWithProseMirror = Window &
  typeof globalThis & { ProseMirror: Editor };

function App() {
  const editor = useEditor({
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

  return <EditorContent editor={editor} />;
}

export default App;
