import { Extension } from "@tiptap/core";
import { getTextColorAttribute } from "../../blocks/defaultProps.js";

export const TextColorExtension = Extension.create({
  name: "blockTextColor",

  addGlobalAttributes() {
    return [
      {
        types: ["blockContainer", "tableCell", "tableHeader"],
        attributes: {
          textColor: getTextColorAttribute(),
        },
      },
    ];
  },
});
