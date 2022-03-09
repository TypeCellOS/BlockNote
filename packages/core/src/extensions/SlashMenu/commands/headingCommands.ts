import { Range, Editor } from "@tiptap/core";
import { Level } from "../../Blocks/nodes/Block";

export default function createHeading(level: Level) {
  return (editor: Editor, range: Range) => {
    console.log(range);
    editor.chain().focus().deleteRange(range).setBlockHeading({ level }).run();
    return true;
  };
}
