import { Extension } from "@tiptap/core";

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
              return element.getAttribute("data-text-alignment");
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
