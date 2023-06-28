// import logo from './logo.svg'
import "@blocknote/core/style.css";
import { BlockNoteView, useBlockNote } from "@blocknote/react";

import styles2 from "../../../packages/core/src/editor.module.css"; // TODO
import styles1 from "./App.module.css";
type WindowWithProseMirror = Window & typeof globalThis & { ProseMirror: any };

function App() {
  const editor = useBlockNote();

  return (
    <BlockNoteView
      editor={editor}
      classNames={[
        styles1.editor,
        styles2.bnEditor,
        styles2.bnRoot,
        styles2.defaultStyles,
      ]}
    />
  );

  // const editor = useBlockNote({
  //   onEditorContentChange: (editor) => {
  //     console.log(editor.topLevelBlocks);
  //   },
  //   editorDOMAttributes: {
  //     class: styles.editor,
  //     "data-test": "editor",
  //   },
  //   theme: "light",
  // });
  //
  // // Give tests a way to get prosemirror instance
  // (window as WindowWithProseMirror).ProseMirror = editor?._tiptapEditor;
  //
  // return <BlockNoteView editor={editor} />;
}

export default App;
