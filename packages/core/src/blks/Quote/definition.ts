import { updateBlockTr } from "../../api/blockManipulation/commands/updateBlock/updateBlock.js";
import { getBlockInfoFromTransaction } from "../../api/getBlockInfoFromPos.js";
import { defaultProps } from "../../blocks/defaultProps.js";
import {
  createBlockConfig,
  createBlockNoteExtension,
  createBlockSpec,
} from "../../schema/blocks/playground.js";

const config = createBlockConfig(() => ({
  type: "quote" as const,
  propSchema: { ...defaultProps },
  content: "inline",
}));

export const definition = createBlockSpec(config).implementation(
  () => ({
    parse(element) {
      if (element.querySelector("blockquote")) {
        return {};
      }

      return undefined;
    },
    render() {
      const quote = document.createElement("blockquote");

      return {
        dom: quote,
        contentDOM: quote,
      };
    },
  }),
  () => [
    createBlockNoteExtension({
      key: "quote-block-shortcuts",
      keyboardShortcuts: {
        "Mod-Alt-q": ({ editor }) =>
          editor.transact((tr) => {
            const blockInfo = getBlockInfoFromTransaction(tr);

            if (
              !blockInfo.isBlockContainer ||
              blockInfo.blockContent.node.type.spec.content !== "inline*"
            ) {
              return true;
            }

            updateBlockTr(tr, blockInfo.bnBlock.beforePos, {
              type: "quote",
            });
            return true;
          }),
      },
      inputRules: [
        {
          find: new RegExp(`^>\\s$`),
          replace() {
            return {
              type: "quote",
              props: {},
            };
          },
        },
      ],
    }),
  ],
);
