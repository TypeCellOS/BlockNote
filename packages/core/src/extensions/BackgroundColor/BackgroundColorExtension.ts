import { Extension } from "@tiptap/core";
import { defaultProps } from "../../blocks/defaultProps.js";

export const BackgroundColorExtension = Extension.create({
  name: "blockBackgroundColor",

  addGlobalAttributes() {
    return [
      {
        types: ["blockContainer", "tableCell", "tableHeader"],
        attributes: {
          backgroundColor: {
            default: defaultProps.shape.backgroundColor._zod.def.defaultValue,
            parseHTML: (element) =>
              element.hasAttribute("data-background-color")
                ? element.getAttribute("data-background-color")
                : defaultProps.shape.backgroundColor._zod.def.defaultValue,
            renderHTML: (attributes) => {
              if (
                attributes.backgroundColor ===
                defaultProps.shape.backgroundColor._zod.def.defaultValue
              ) {
                return {};
              }
              return {
                "data-background-color": attributes.backgroundColor,
              };
            },
          },
        },
      },
    ];
  },
});
