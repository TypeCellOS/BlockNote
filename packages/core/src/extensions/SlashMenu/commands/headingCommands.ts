import { Range, Editor } from "@tiptap/core";
import { Level } from "../../Blocks/nodes/Block";

export default function createHeading(level: Level) {
  return (editor: Editor, range: Range) => {
    editor.chain().focus().setBlockHeading({ level }).deleteRange(range).run();
    return true;
  };
}
