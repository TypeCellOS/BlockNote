import { Node } from "@tiptap/core";
import { suggestionMarks } from "./suggestionMarks.js";

export const Doc = Node.create({
  name: "doc",
  topNode: true,
  content: "blockGroup",
  marks() {
    return suggestionMarks(this.editor);
  },
});
