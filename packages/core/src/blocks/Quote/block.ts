import { updateBlockTr } from "../../api/blockManipulation/commands/updateBlock/updateBlock.js";
import { getBlockInfoFromTransaction } from "../../api/getBlockInfoFromPos.js";
import { createBlockConfig, createBlockSpec } from "../../schema/index.js";
import { createBlockNoteExtension } from "../../editor/BlockNoteExtension.js";
import { defaultProps } from "../defaultProps.js";

export const createQuoteBlockConfig = createBlockConfig(
  () =>
    ({
      type: "quote" as const,
      propSchema: {
        backgroundColor: defaultProps.backgroundColor,
        textColor: defaultProps.textColor,
      },
      content: "inline" as const,
    }) as const,
);

export const createQuoteBlockSpec = createBlockSpec(
  createQuoteBlockConfig,
  {
    meta: {
      isolating: false,
    },
    parse(element) {
      if (element.tagName === "BLOCKQUOTE") {
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
  },
  [
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
