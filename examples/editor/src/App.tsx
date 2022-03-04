// import logo from './logo.svg'
import styles from "./App.module.css";
import { EditorContent, useEditor } from "@blocknote/core";

// import "@blocknote/core/style.css";

function App() {
  const editor = useEditor({
    onUpdate: ({ editor }) => {
      console.log(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: styles.editor,
      },
    },
  });

  return <EditorContent editor={editor} />;
}

export default App;
