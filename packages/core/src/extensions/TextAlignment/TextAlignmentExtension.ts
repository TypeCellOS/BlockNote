import { Extension } from "@tiptap/core";

export const TextAlignmentExtension = Extension.create({
  name: "textAlignment",

  addGlobalAttributes() {
    return [
      {
        // Attribute is applied to block content instead of container so that child blocks don't inherit the text
        // alignment styling.
        types: [
          "paragraph",
          "heading",
          "bulletListItem",
          "numberedListItem",
          "checkListItem",
        ],
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
