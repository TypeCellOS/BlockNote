import { Node } from "@tiptap/core";

export const TableCol = Node.create({
  name: "tableCol",
  group: "tableCol",
  content: "inline*",

  parseHTML() {
    return [
      {
        tag: "th",
      },
    ];
  },

  renderHTML() {
    return ["th", 0];
  },
});
