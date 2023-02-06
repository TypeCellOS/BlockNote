import { Extension } from "@tiptap/core";
import { getBlockInfoFromPos } from "../Blocks/helpers/getBlockInfoFromPos";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    textAlignment: {
      setTextAlignment: (
        textAlignment: "left" | "center" | "right" | "justify"
      ) => ReturnType;
    };
  }
}

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
            parseHTML: (element) => element.getAttribute("data-text-alignment"),
            renderHTML: (attributes) =>
              attributes.textAlignment !== "left" && {
                "data-text-alignment": attributes.textAlignment,
              },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setTextAlignment:
        (textAlignment) =>
        ({ state }) => {
          const positionsBeforeSelectedContent = [];

          const blockInfo = getBlockInfoFromPos(
            state.doc,
            state.selection.from
          );
          if (blockInfo === undefined) {
            return false;
          }

          // Finds all blockContent nodes that the current selection is in.
          let pos = blockInfo.startPos;
          while (pos < state.selection.to) {
            if (
              state.doc.resolve(pos).node().type.spec.group === "blockContent"
            ) {
              positionsBeforeSelectedContent.push(pos - 1);

              pos += state.doc.resolve(pos).node().nodeSize - 1;
            } else {
              pos += 1;
            }
          }

          // Sets text alignment for all blockContent nodes that the current selection is in.
          for (const pos of positionsBeforeSelectedContent) {
            state.tr.setNodeAttribute(pos, "textAlignment", textAlignment);
          }

          return true;
        },
    };
  },
});
