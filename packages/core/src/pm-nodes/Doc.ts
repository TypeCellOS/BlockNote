import { Node } from "@tiptap/core";

export const Doc = Node.create({
  name: "doc",
  topNode: true,
  content: "blockGroup",
  marks: "y-attributed-insert y-attributed-format y-attributed-delete",
});
