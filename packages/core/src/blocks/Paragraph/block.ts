import { createBlockNoteExtension } from "../../editor/BlockNoteExtension.js";
import { createBlockConfig, createBlockSpec } from "../../schema/index.js";
import { defaultProps } from "../defaultProps.js";

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

      return undefined;
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
        "Mod-Alt-0": ({ editor }) => {
          const cursorPosition = editor.getTextCursorPosition();

          if (
            editor.schema.blockSchema[cursorPosition.block.type].content !==
            "inline"
          ) {
            return false;
          }

          editor.updateBlock(cursorPosition.block, {
            type: "paragraph",
            props: {},
          });
          return true;
        },
      },
    }),
  ],
);
