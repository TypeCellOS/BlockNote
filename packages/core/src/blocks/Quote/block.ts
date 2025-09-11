import { createBlockNoteExtension } from "../../editor/BlockNoteExtension.js";
import { createBlockConfig, createBlockSpec } from "../../schema/index.js";
import {
  addDefaultPropsExternalHTML,
  defaultProps,
  parseDefaultProps,
} from "../defaultProps.js";

export type QuoteBlockConfig = ReturnType<typeof createQuoteBlockConfig>;

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
        const { backgroundColor, textColor } = parseDefaultProps(element);

        return { backgroundColor, textColor };
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
    toExternalHTML(block) {
      const quote = document.createElement("blockquote");
      addDefaultPropsExternalHTML(block.props, quote);

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
        "Mod-Alt-q": ({ editor }) => {
          const cursorPosition = editor.getTextCursorPosition();

          if (
            editor.schema.blockSchema[cursorPosition.block.type].content !==
            "inline"
          ) {
            return false;
          }

          editor.updateBlock(cursorPosition.block, {
            type: "quote",
            props: {},
          });
          return true;
        },
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
