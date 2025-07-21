import { Extension } from "@tiptap/core";

import { getAttributeFromDefaultProps } from "../../blocks/defaultProps.js";

export const TextColorExtension = Extension.create({
  name: "blockTextColor",

  addGlobalAttributes() {
    return [
      {
        types: [
          "paragraph",
          "heading",
          "bulletListItem",
          "numberedListItem",
          "checkListItem",
          "quote",
          "table",
          "tableCell",
          "tableHeader",
        ],
        attributes: {
          textColor: getAttributeFromDefaultProps["textColor"](),
        },
      },
    ];
  },
});
