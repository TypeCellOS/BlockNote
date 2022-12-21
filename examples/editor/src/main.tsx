import styles from "./App.module.css";
import "./index.css";
// TODO: fix imports
import { mountBlockNoteEditor } from "../../../packages/core/src/BlockNoteEditor";
import { ReactBubbleMenuFactory } from "../../../packages/react/src/BubbleMenu/BubbleMenuFactory";
import { ReactHyperlinkMenuFactory } from "../../../packages/react/src/HyperlinkMenus/HyperlinkMenuFactory";
import { ReactSuggestionsMenuFactory } from "../../../packages/react/src/shared/components/suggestion/SuggestionsMenuFactory";

// type WindowWithProseMirror = Window &
//   typeof globalThis & { ProseMirror: Editor };

/*
  TODO:
  <BlockNoteEditor />
*/
mountBlockNoteEditor(
  {
    bubbleMenuFactory: ReactBubbleMenuFactory,
    hyperlinkMenuFactory: ReactHyperlinkMenuFactory,
    suggestionsMenuFactory: ReactSuggestionsMenuFactory,
  },
  {
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
  }
);
