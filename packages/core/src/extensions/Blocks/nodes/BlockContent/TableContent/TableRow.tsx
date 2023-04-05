import { Node } from "@tiptap/core";

export const TableRow = Node.create({
  name: "tableRow",
  group: "tableRow",
  content: "tableCol tableCol tableCol",

  parseHTML() {
    return [
      {
        tag: "tr",
      },
    ];
  },

  renderHTML() {
    return ["tr", 0];
  },
});
