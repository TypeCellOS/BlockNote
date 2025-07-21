import { Extension } from "@tiptap/core";

import { getAttributeFromDefaultProps } from "../../blocks/defaultProps.js";

export const TextAlignmentExtension = Extension.create({
  name: "textAlignment",

  addGlobalAttributes() {
    return [
      {
        types: [
          "paragraph",
          "heading",
          "bulletListItem",
          "numberedListItem",
          "checkListItem",
          "tableCell",
          "tableHeader",
        ],
        attributes: {
          textAlignment: getAttributeFromDefaultProps["textAlignment"](),
        },
      },
    ];
  },
});
