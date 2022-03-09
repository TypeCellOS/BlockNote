import { Editor, Range } from "@tiptap/core";

export default function underlineChain() {
  return (editor: Editor, range: Range) => {
    editor.chain().focus().deleteRange(range).toggleUnderline().run();
    return true;
  };
}
