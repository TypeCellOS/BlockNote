// import logo from './logo.svg'
import { BlockSchema, defaultBlockSchema } from "@blocknote/core";
import "@blocknote/core/style.css";
import {
  BlockNoteView,
  useBlockNote,
  Image,
  CaptionedImage,
} from "@blocknote/react";
import styles from "./App.module.css";

type WindowWithProseMirror = Window & typeof globalThis & { ProseMirror: any };

const customSchema = {
  ...defaultBlockSchema,
  image: Image,
  captionedImage: CaptionedImage,
} satisfies BlockSchema;

function App() {
  const editor = useBlockNote({
    blockSchema: customSchema,
    onEditorContentChange: (editor) => {
      console.log(editor.topLevelBlocks);
      console.log(editor.topLevelBlocks[0]);
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
