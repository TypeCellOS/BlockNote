import { updateBlockTr } from "../../api/blockManipulation/commands/updateBlock/updateBlock.js";
import { getBlockInfoFromTransaction } from "../../api/getBlockInfoFromPos.js";
import { defaultProps } from "../../blocks/defaultProps.js";
import { createToggleWrapper } from "../../blocks/ToggleWrapper/createToggleWrapper.js";
import {
  createBlockConfig,
  createBlockNoteExtension,
  createBlockSpec,
} from "../../schema/blocks/playground.js";
import { handleEnter } from "../utils/listItemEnterHandler.js";

const config = createBlockConfig(() => ({
  type: "toggleListItem" as const,
  propSchema: {
    ...defaultProps,
  },
  content: "inline",
}));

export const definition = createBlockSpec(config).implementation(
  () => ({
    render(block, editor) {
      const paragraphEl = document.createElement("p");
      const toggleWrapper = createToggleWrapper(
        block as any,
        editor,
        paragraphEl,
      );
      return { ...toggleWrapper, contentDOM: paragraphEl };
    },
  }),
  () => [
    createBlockNoteExtension({
      key: "toggle-list-item-shortcuts",
      keyboardShortcuts: {
        Enter: ({ editor }) => {
          return handleEnter(editor, "toggleListItem");
        },
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
      },
    }),
  ],
);
