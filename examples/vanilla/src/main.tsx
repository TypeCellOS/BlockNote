import { BlockNoteEditor } from "@blocknote/core";
import "./index.css";
import { bubbleMenuFactory } from "./ui/bubbleMenuFactory";
import { hyperlinkMenuFactory } from "./ui/hyperlinkMenuFactory";
import { suggestionsMenuFactory } from "./ui/suggestionsMenuFactory";

const editor = new BlockNoteEditor({
  element: document.getElementById("root")!,
  uiFactories: {
    // Create an example bubble menu which just consists of a bold toggle
    bubbleMenuFactory,
    // Create an example menu for hyperlinks
    hyperlinkMenuFactory,
    // Create an example menu for the /-menu
    suggestionsMenuFactory,
  },
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

console.log("editor created", editor);
