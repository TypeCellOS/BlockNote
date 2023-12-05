import { BlockNoteEditor } from "@blocknote/core";
import "./index.css";
import { addFormattingToolbar } from "./ui/addFormattingToolbar";
import { addHyperlinkToolbar } from "./ui/addHyperlinkToolbar";
import { addSideMenu } from "./ui/addSideMenu";
import { addSlashMenu } from "./ui/addSlashMenu";

const editor = BlockNoteEditor.create({
  parentElement: document.getElementById("root")!,
  onEditorContentChange: () => {
    console.log(editor.topLevelBlocks);
  },
  domAttributes: {
    editor: {
      class: "editor",
    },
  },
});

console.log("editor created", editor);

addSideMenu(editor);
addFormattingToolbar(editor);
addSlashMenu(editor);
addHyperlinkToolbar(editor);
