import { Editor, Range } from "@tiptap/core";

export default function italicChain() {
  return (editor: Editor, range: Range) => {
    editor.chain().focus().deleteRange(range).toggleItalic().run();
    return true;
  };
}
