import { Extension } from "@tiptap/core";

import { getAttributeFromDefaultProps } from "../../blocks/defaultProps.js";

export const BackgroundColorExtension = Extension.create({
  name: "blockBackgroundColor",

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
          "tableCell",
          "tableHeader",
        ],
        attributes: {
          backgroundColor: getAttributeFromDefaultProps["backgroundColor"](),
        },
      },
    ];
  },
});
