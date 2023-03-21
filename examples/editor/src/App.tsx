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
    onEditorReady(editor) {
      editor.insertBlocks(
        [
          {
            type: "heading",
            content: "my title",
          },
          {
            type: "paragraph",
            content: "Hello world",
            children: [{ type: "paragraph", content: "nested" }],
          },
          {
            type: "numberedListItem",
            content: "hello",
          },
          {
            type: "numberedListItem",
            content: "world",
            children: [
              { type: "heading", content: "nested" },
              {
                type: "numberedListItem",
                content: "hello",
                children: [
                  {
                    type: "numberedListItem",
                    content: "hello",
                  },
                ],
              },
            ],
          },
        ],
        editor.topLevelBlocks[0]
      );
    },
    editorDOMAttributes: {
      class: styles.editor,
      "data-test": "editor",
    },
  });

  // Give tests a way to get prosemirror instance
  (window as WindowWithProseMirror).ProseMirror = editor?._tiptapEditor;

  return <BlockNoteView editor={editor} />;
}

export default App;
