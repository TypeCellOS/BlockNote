import { Extension } from "@tiptap/core";
import { getBackgroundColorAttribute } from "../../blocks/defaultProps.js";

export const BackgroundColorExtension = Extension.create({
  name: "blockBackgroundColor",

  addGlobalAttributes() {
    return [
      {
        types: ["tableCell", "tableHeader"],
        attributes: {
          backgroundColor: getBackgroundColorAttribute(),
        },
      },
    ];
  },
});
