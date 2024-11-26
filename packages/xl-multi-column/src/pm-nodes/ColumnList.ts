import { createStronglyTypedTiptapNode } from "@blocknote/core";

export const ColumnList = createStronglyTypedTiptapNode({
  name: "columnList",
  group: "childContainer bnBlock blockGroupChild",
  // A block always contains content, and optionally a blockGroup which contains nested blocks
  content: "column column+", // min two columns
  priority: 40, // should be below blockContainer
  defining: true,

  parseHTML() {
    return [
      {
        tag: "div",
        getAttrs: (element) => {
          if (typeof element === "string") {
            return false;
          }

          if (element.getAttribute("data-node-type") === this.name) {
            return {};
          }

          return false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const columnList = document.createElement("div");
    columnList.className = "bn-block-column-list";
    columnList.setAttribute("data-node-type", this.name);
    for (const [attribute, value] of Object.entries(HTMLAttributes)) {
      columnList.setAttribute(attribute, value as any); // TODO as any
    }
    columnList.style.display = "flex";

    return {
      dom: columnList,
      contentDOM: columnList,
    };
  },
});
