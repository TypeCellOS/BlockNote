import { updateBlockTr } from "../../api/blockManipulation/commands/updateBlock/updateBlock.js";
import { getBlockInfoFromTransaction } from "../../api/getBlockInfoFromPos.js";
import { defaultProps } from "../../blocks/defaultProps.js";
import {
  createBlockConfig,
  createBlockNoteExtension,
  createBlockSpec,
} from "../../schema/blocks/playground.js";

const config = createBlockConfig(() => ({
  type: "paragraph" as const,
  propSchema: defaultProps,
  content: "inline",
}));

export const definition = createBlockSpec(config).implementation(
  () => ({
    parse: (e) => {
      const paragraph = e.querySelector("p");
      if (!paragraph) {
        return undefined;
      }

      return {};
    },
    render: () => {
      const dom = document.createElement("p");
      return {
        dom,
        contentDOM: dom,
      };
    },
    runsBefore: ["default"],
  }),
  () => [
    createBlockNoteExtension({
      key: "paragraph-shortcuts",
      keyboardShortcuts: {
        "Mod-Alt-0": ({ editor }) =>
          editor.transact((tr) => {
            const blockInfo = getBlockInfoFromTransaction(tr);

            if (
              !blockInfo.isBlockContainer ||
              blockInfo.blockContent.node.type.spec.content !== "inline*"
            ) {
              return true;
            }

            updateBlockTr(tr, blockInfo.bnBlock.beforePos, {
              type: "paragraph",
              props: {},
            });
            return true;
          }),
      },
    }),
  ],
);
