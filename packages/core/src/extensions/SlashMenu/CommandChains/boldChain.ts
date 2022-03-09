import { Editor, Range } from "@tiptap/core";

export default function boldChain() {
  return (editor: Editor, range: Range) => {
    editor.chain().focus().deleteRange(range).toggleBold().run();
    return true;
  };
}
