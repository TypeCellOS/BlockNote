import { Extension } from "@tiptap/core";
import { getBlockInfoFromPos } from "../Blocks/helpers/getBlockInfoFromPos";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    blockTextColor: {
      setBlockTextColor: (posInBlock: number, color: string) => ReturnType;
    };
  }
}

export const TextColorExtension = Extension.create({
  name: "blockTextColor",

  addGlobalAttributes() {
    return [
      {
        types: ["blockContainer"],
        attributes: {
          textColor: {
            default: "default",
            parseHTML: (element) =>
              element.hasAttribute("data-text-color")
                ? element.getAttribute("data-text-color")
                : "default",
            renderHTML: (attributes) =>
              attributes.textColor !== "default" && {
                "data-text-color": attributes.textColor,
              },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setBlockTextColor:
        (posInBlock, color) =>
        ({ state, view }) => {
          const blockInfo = getBlockInfoFromPos(state.doc, posInBlock);
          if (blockInfo === undefined) {
            return false;
          }

          state.tr.setNodeAttribute(blockInfo.startPos - 1, "textColor", color);

          view.focus();

          return true;
        },
    };
  },
});
