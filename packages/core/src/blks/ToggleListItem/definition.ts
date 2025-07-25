import { updateBlockTr } from "../../api/blockManipulation/commands/updateBlock/updateBlock.js";
import { getBlockInfoFromTransaction } from "../../api/getBlockInfoFromPos.js";
import { defaultProps } from "../../blocks/defaultProps.js";
import { BlockNoteExtension } from "../../editor/BlockNoteExtension.js";
import {
  createBlockConfig,
  createBlockSpec,
} from "../../schema/blocks/playground.js";

const config = createBlockConfig(() => ({
  type: "toggleListItem" as const,
  propSchema: {
    ...defaultProps,
  },
  content: "inline",
}));

export class ToggleListItemExtension extends BlockNoteExtension {
  public static key() {
    return "toggle-list-item-shortcuts";
  }

  constructor() {
    super();
    this.keyboardShortcuts = {
      "Mod-Shift-6": ({ editor }) =>
        editor.transact((tr) => {
          const blockInfo = getBlockInfoFromTransaction(tr);

          if (
            !blockInfo.isBlockContainer ||
            blockInfo.blockContent.node.type.spec.content !== "inline*"
          ) {
            return true;
          }

          updateBlockTr(tr, blockInfo.bnBlock.beforePos, {
            type: "toggleListItem",
            props: {},
          });
          return true;
        }),
    };
  }
}

export const definition = createBlockSpec(config).implementation(
  () => ({
    render() {
      // TODO actual rendering
      const div = document.createElement("div");
      const paragraphEl = document.createElement("p");

      div.appendChild(paragraphEl);

      return {
        dom: div,
        contentDOM: paragraphEl,
      };
    },
  }),
  () => [new ToggleListItemExtension()],
);
