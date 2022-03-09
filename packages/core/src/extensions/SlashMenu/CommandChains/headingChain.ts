import { Range, Editor } from "@tiptap/core";
import { Level } from "../../Blocks/nodes/Block";

export default function headingChain(level: Level) {
  return (editor: Editor, range: Range) => {
    editor.chain().focus().deleteRange(range).setBlockHeading({ level }).run();
    return true;
  };
}
