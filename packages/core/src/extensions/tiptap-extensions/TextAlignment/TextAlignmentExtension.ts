import { Extension } from "@tiptap/core";
import { defaultProps } from "../../../blocks/defaultProps.js";

export const TextAlignmentExtension = Extension.create({
  name: "textAlignment",

  addGlobalAttributes() {
    return [
      {
        // Generally text alignment is handled through props using the custom
        // blocks API. Tables are the only blocks that are created as TipTap
        // nodes and ported to blocks, so we need to add text alignment in a
        // separate extension.
        types: ["tableCell", "tableHeader"],
        attributes: {
          textAlignment: {
            default: "left",
            parseHTML: (element) => {
              // If the `data-` attribute is found, use it, as this most likely
              // means the parsed element was exported by BlockNote originally.
              // Otherwise, fall back to the cell's own `text-align` style or
              // `align` attribute, as used by HTML from other sources.
              const alignment =
                element.getAttribute("data-text-alignment") ??
                (element.style.textAlign || element.getAttribute("align"));

              return defaultProps.textAlignment.values.find(
                (value) => value === alignment,
              );
            },
            renderHTML: (attributes) => {
              if (attributes.textAlignment === "left") {
                return {};
              }
              return {
                "data-text-alignment": attributes.textAlignment,
              };
            },
          },
        },
      },
    ];
  },
});
