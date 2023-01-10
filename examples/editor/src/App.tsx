// import logo from './logo.svg'
import { EditorContent, useEditor } from "@blocknote/core";
import "@blocknote/core/style.css";
import { Editor } from "@tiptap/core";
import styles from "./App.module.css";
import {
  ReactAddBlockButtonFactory,
  ReactBubbleMenuFactory,
  ReactDragHandleFactory,
  ReactDragHandleMenuFactory,
  ReactHyperlinkMenuFactory,
  ReactSuggestionsMenuFactory,
} from "@blocknote/react";

type WindowWithProseMirror = Window &
  typeof globalThis & { ProseMirror: Editor };

function App() {
  const editor = useEditor(
    {
      addBlockButtonFactory: ReactAddBlockButtonFactory,
      bubbleMenuFactory: ReactBubbleMenuFactory,
      dragHandleFactory: ReactDragHandleFactory,
      dragHandleMenuFactory: ReactDragHandleMenuFactory,
      hyperlinkMenuFactory: ReactHyperlinkMenuFactory,
      suggestionsMenuFactory: ReactSuggestionsMenuFactory,
    },
    {
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
    }
  );

  return <EditorContent editor={editor} />;
}

export default App;
