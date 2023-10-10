import { Extension } from "@tiptap/core";
import { getBlockInfoFromPos } from "../Blocks/helpers/getBlockInfoFromPos";
import { defaultProps } from "../Blocks/api/defaultProps";

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
            default: defaultProps.textColor.default,
            parseHTML: (element) =>
              element.hasAttribute("data-text-color")
                ? element.getAttribute("data-text-color")
                : defaultProps.textColor.default,
            renderHTML: (attributes) =>
              attributes.textColor !== defaultProps.textColor.default && {
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
