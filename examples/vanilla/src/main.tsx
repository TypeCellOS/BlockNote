import { BlockNoteEditor } from "@blocknote/core";
import "./index.css";

const editor = new BlockNoteEditor({
  element: document.getElementById("root")!,
  // uiFactories: {
  //   bubbleMenuFactory: ReactBubbleMenuFactory,
  //   hyperlinkMenuFactory: ReactHyperlinkMenuFactory,
  //   suggestionsMenuFactory: ReactSuggestionsMenuFactory,
  // },
  onUpdate: ({ editor }) => {
    console.log(editor.getJSON());
    (window as any).ProseMirror = editor; // Give tests a way to get editor instance
  },
  editorProps: {
    attributes: {
      class: "editor",
    },
  },
});

// root.render(
//   <React.StrictMode>
//     <App />
//   </React.StrictMode>
// );

// TODO: Separate non-React example using code below.
// import { mountBlockNoteEditor } from "@blocknote/core";
// import "@blocknote/core/style.css";
// import {
//   ReactBubbleMenuFactory,
//   ReactHyperlinkMenuFactory,
//   ReactSuggestionsMenuFactory,
// } from "@blocknote/react";
// import styles from "./App.module.css";
// import "./index.css";
//
