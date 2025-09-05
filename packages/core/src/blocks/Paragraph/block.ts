import { updateBlockTr } from "../../api/blockManipulation/commands/updateBlock/updateBlock.js";
import { getBlockInfoFromTransaction } from "../../api/getBlockInfoFromPos.js";
import { createBlockConfig, createBlockSpec } from "../../schema/index.js";
import { createBlockNoteExtension } from "../../editor/BlockNoteExtension.js";
import { defaultProps, parseDefaultProps } from "../defaultProps.js";

export const createParagraphBlockConfig = createBlockConfig(
  () =>
    ({
      type: "paragraph" as const,
      propSchema: defaultProps,
      content: "inline" as const,
    }) as const,
);

export const createParagraphBlockSpec = createBlockSpec(
  createParagraphBlockConfig,
  {
    meta: {
      isolating: false,
    },
    parse: (e) => {
      if (e.tagName !== "P") {
        return undefined;
      }

      // Edge case for things like images directly inside paragraph.
      if (!e.textContent?.trim()) {
        return undefined;
      }

      return parseDefaultProps(e);
    },
    render: () => {
      const dom = document.createElement("p");
      return {
        dom,
        contentDOM: dom,
      };
    },
    runsBefore: ["default"],
  },
  [
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
