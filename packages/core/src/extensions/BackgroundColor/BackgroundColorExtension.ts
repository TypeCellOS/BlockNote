import { Extension } from "@tiptap/core";

import { getAttributeFromDefaultProps } from "../../blocks/defaultProps.js";

export const BackgroundColorExtension = Extension.create({
  name: "blockBackgroundColor",

  addGlobalAttributes() {
    return [
      {
        types: ["blockContainer", "tableCell", "tableHeader"],
        attributes: {
          backgroundColor: getAttributeFromDefaultProps["backgroundColor"](),
        },
      },
    ];
  },
});
