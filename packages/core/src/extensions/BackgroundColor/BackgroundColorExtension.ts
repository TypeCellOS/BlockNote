import { Extension } from "@tiptap/core";
import { getBlockInfoFromPos } from "../Blocks/helpers/getBlockInfoFromPos";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    blockBackgroundColor: {
      setBlockBackgroundColor: (
        posInBlock: number,
        color: string
      ) => ReturnType;
    };
  }
}

export const BackgroundColorExtension = Extension.create({
  name: "blockBackgroundColor",

  addGlobalAttributes() {
    return [
      {
        types: ["blockContainer"],
        attributes: {
          backgroundColor: {
            default: "default",
            parseHTML: (element) =>
              element.hasAttribute("data-background-color")
                ? element.getAttribute("data-background-color")
                : "default",
            renderHTML: (attributes) =>
              attributes.backgroundColor !== "default" && {
                "data-background-color": attributes.backgroundColor,
              },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setBlockBackgroundColor:
        (posInBlock, color) =>
        ({ state, view }) => {
          const blockInfo = getBlockInfoFromPos(state.doc, posInBlock);
          if (blockInfo === undefined) {
            return false;
          }

          state.tr.setNodeAttribute(
            blockInfo.startPos - 1,
            "backgroundColor",
            color
          );

          view.focus();

          return true;
        },
    };
  },
});
