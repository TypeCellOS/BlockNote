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
          const blockInfo = getBlockInfoFromPos(
            state.doc,
            state.selection.from
          );
          if (blockInfo === undefined) {
            return false;
          }
          console.log(blockInfo.startPos - 1);

          state.tr.setNodeAttribute(
            blockInfo.startPos,
            "textAlignment",
            textAlignment
          );

          return true;
        },
    };
  },
});
