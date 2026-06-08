import { Node } from "@tiptap/core";

export const Doc = Node.create({
  name: "doc",
  topNode: true,
  content: "blockGroup",
  marks: "insertion deletion modification y-attributed-insert y-attributed-delete y-attributed-format",
});
