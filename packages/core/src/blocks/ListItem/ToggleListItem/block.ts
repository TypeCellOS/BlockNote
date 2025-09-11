import { updateBlockTr } from "../../../api/blockManipulation/commands/updateBlock/updateBlock.js";
import { getBlockInfoFromTransaction } from "../../../api/getBlockInfoFromPos.js";
import { createBlockConfig, createBlockSpec } from "../../../schema/index.js";
import { createBlockNoteExtension } from "../../../editor/BlockNoteExtension.js";
import {
  addDefaultPropsExternalHTML,
  defaultProps,
} from "../../defaultProps.js";
import { createToggleWrapper } from "../../ToggleWrapper/createToggleWrapper.js";
import { handleEnter } from "../../utils/listItemEnterHandler.js";

export const createToggleListItemBlockConfig = createBlockConfig(
  () =>
    ({
      type: "toggleListItem" as const,
      propSchema: {
        ...defaultProps,
      },
      content: "inline" as const,
    }) as const,
);

export const createToggleListItemBlockSpec = createBlockSpec(
  createToggleListItemBlockConfig,
  {
    meta: {
      isolating: false,
    },
    render(block, editor) {
      const paragraphEl = document.createElement("p");
      const toggleWrapper = createToggleWrapper(
        block as any,
        editor,
        paragraphEl,
      );
      return { ...toggleWrapper, contentDOM: paragraphEl };
    },
    toExternalHTML(block) {
      const li = document.createElement("li");
      const p = document.createElement("p");
      addDefaultPropsExternalHTML(block.props, li);
      li.appendChild(p);

      return {
        dom: li,
        contentDOM: p,
      };
    },
  },
  [
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
