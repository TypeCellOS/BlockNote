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
              let x = element.getAttribute("data-text-alignment");
              if (x) {
                debugger;
              }
              return x;
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
