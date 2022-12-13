import "./index.css";
import styles from "./App.module.css";
import { mountBlockNoteEditor } from "../../../packages/core/src/BlockNoteEditor";
import { BubbleMenuFactory } from "../../../packages/react/src/BubbleMenu/BubbleMenuFactory";

// type WindowWithProseMirror = Window &
//   typeof globalThis & { ProseMirror: Editor };

mountBlockNoteEditor({
  menus: {
    bubbleMenuFactory: BubbleMenuFactory,
  },
  element: document.getElementById("root")!,
  onUpdate: ({ editor }) => {
    console.log(editor.getJSON());
    (window as any).ProseMirror = editor; // Give tests a way to get editor instance
  },
  editorProps: {
    attributes: {
      class: styles.editor,
      "data-test": "editor",
    },
  },
});
