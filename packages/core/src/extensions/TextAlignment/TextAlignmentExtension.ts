import { Extension } from "@tiptap/core";

export const TextAlignmentExtension = Extension.create({
  name: "textAlignment",

  addGlobalAttributes() {
    return [
      {
        // Attribute is applied to block content instead of container so that child blocks don't inherit the text
        // alignment styling.
        types: ["paragraph", "heading", "bulletListItem", "numberedListItem"],
        attributes: {
          textAlignment: {
            default: "left",
            parseHTML: (element) => {
              return element.getAttribute("data-text-alignment");
            },
            renderHTML: (attributes) =>
              attributes.textAlignment !== "left" && {
                "data-text-alignment": attributes.textAlignment,
              },
          },
        },
      },
    ];
  },
});
