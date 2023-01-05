import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

window.React = React;

const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

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
// mountBlockNoteEditor(
//   {
//     bubbleMenuFactory: ReactBubbleMenuFactory,
//     hyperlinkMenuFactory: ReactHyperlinkMenuFactory,
//     suggestionsMenuFactory: ReactSuggestionsMenuFactory,
//   },
//   {
//     element: document.getElementById("root")!,
//     onUpdate: ({ editor }) => {
//       console.log(editor.getJSON());
//       (window as any).ProseMirror = editor; // Give tests a way to get editor instance
//     },
//     editorProps: {
//       attributes: {
//         class: styles.editor,
//         "data-test": "editor",
//       },
//     },
//   }
// );
