import { BlockNoteEditor } from "@blocknote/core";
import "./index.css";
import { blockSideMenuFactory } from "./ui/blockSideMenuFactory";
import { formattingToolbarFactory } from "./ui/formattingToolbarFactory";
import { hyperlinkToolbarFactory } from "./ui/hyperlinkToolbarFactory";
import { slashMenuFactory } from "./ui/slashMenuFactory";

const editor = new BlockNoteEditor({
  element: document.getElementById("root")!,
  uiFactories: {
    // Create an example formatting toolbar which just consists of a bold toggle
    formattingToolbarFactory,
    // Create an example menu for hyperlinks
    hyperlinkToolbarFactory,
    // Create an example menu for the /-menu
    slashMenuFactory: slashMenuFactory,
    // Create an example menu for when a block is hovered
    blockSideMenuFactory,
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
