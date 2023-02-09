// import logo from './logo.svg'
import { defaultSlashCommands, SlashMenuItem } from "@blocknote/core";
import "@blocknote/core/style.css";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import styles from "./App.module.css";

type WindowWithProseMirror = Window & typeof globalThis & { ProseMirror: any };

function App() {
  const editor = useBlockNote({
    slashCommands: [
      ...defaultSlashCommands,
      new SlashMenuItem("test", "AI", (editor, range) => {
        console.log("select");
        return true;
      }),
    ],
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
