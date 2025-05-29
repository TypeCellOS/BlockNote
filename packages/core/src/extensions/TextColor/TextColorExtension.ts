import { Extension } from "@tiptap/core";
import { defaultProps } from "../../blocks/defaultProps.js";

export const TextColorExtension = Extension.create({
  name: "blockTextColor",

  addGlobalAttributes() {
    return [
      {
        types: ["blockContainer", "tableCell", "tableHeader"],
        attributes: {
          textColor: {
            default: defaultProps.shape.textColor._zod.def.defaultValue,
            parseHTML: (element) =>
              element.hasAttribute("data-text-color")
                ? element.getAttribute("data-text-color")
                : defaultProps.shape.textColor._zod.def.defaultValue,
            renderHTML: (attributes) => {
              if (
                attributes.textColor ===
                defaultProps.shape.textColor._zod.def.defaultValue
              ) {
                return {};
              }
              return {
                "data-text-color": attributes.textColor,
              };
            },
          },
        },
      },
    ];
  },
});
