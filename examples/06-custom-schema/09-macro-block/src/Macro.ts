import { createBlockSpec, defaultProps } from "@blocknote/core";

import { macroRegistry } from "./macroRegistry";

// The Macro block — built with the vanilla `createBlockSpec` API.
//
// It carries a single `id` prop that is used to look up the HTML that should
// be rendered in the "before" and "after" slots around the block's editable
// inline content. This can actually be in any structure, it is in your control
export const macroBlock = createBlockSpec(
  {
    type: "macro",
    propSchema: {
      textAlignment: defaultProps.textAlignment,
      textColor: defaultProps.textColor,
      id: {
        default: "" as const,
      },
    },
    content: "inline",
  },
  {
    render: (block) => {
      const wrapper = document.createElement("div");
      wrapper.className = "macro-block";

      // We pull from the "registry" what this block should insert before and after
      const definition = macroRegistry[block.props.id];

      const before = document.createElement("div");
      before.className = "macro-slot macro-slot-before";
      before.contentEditable = "false";
      const beforeContent = definition?.before ?? "";
      if (typeof beforeContent === "string") {
        before.innerHTML = beforeContent;
      } else {
        before.appendChild(beforeContent);
      }

      const content = document.createElement("div");
      content.className = "macro-content";

      const after = document.createElement("div");
      after.className = "macro-slot macro-slot-after";
      after.contentEditable = "false";
      const afterContent = definition?.after ?? "";
      if (typeof afterContent === "string") {
        after.innerHTML = afterContent;
      } else {
        after.appendChild(afterContent);
      }

      // You have full control over this HTML structure
      // and can inject the rich-text content wherever you want
      wrapper.append(before, content, after);

      return {
        dom: wrapper,
        contentDOM: content,
      };
    },
  },
);
