import { createBlockNoteExtension } from "../../../editor/BlockNoteExtension.js";
import { createBlockConfig, createBlockSpec } from "../../../schema/index.js";
import { defaultProps } from "../../defaultProps.js";
import { handleEnter } from "../../utils/listItemEnterHandler.js";
import { getListItemContent } from "../getListItemContent.js";

export const createBulletListItemBlockConfig = createBlockConfig(
  () =>
    ({
      type: "bulletListItem" as const,
      propSchema: {
        ...defaultProps,
      },
      content: "inline",
    }) as const,
);

export const createBulletListItemBlockSpec = createBlockSpec(
  createBulletListItemBlockConfig,
  {
    meta: {
      isolating: false,
    },
    parse(element) {
      if (element.tagName !== "LI") {
        return false;
      }

      const parent = element.parentElement;

      if (parent === null) {
        return false;
      }

      if (
        parent.tagName === "UL" ||
        (parent.tagName === "DIV" && parent.parentElement?.tagName === "UL")
      ) {
        return {};
      }

      return false;
    },
    // As `li` elements can contain multiple paragraphs, we need to merge their contents
    // into a single one so that ProseMirror can parse everything correctly.
    parseContent: ({ el, schema }) =>
      getListItemContent(el, schema, "bulletListItem"),
    render() {
      // We use a <p> tag, because for <li> tags we'd need a <ul> element to put
      // them in to be semantically correct, which we can't have due to the
      // schema.
      const dom = document.createElement("p");

      return {
        dom,
        contentDOM: dom,
      };
    },
  },
  [
    createBlockNoteExtension({
      key: "bullet-list-item-shortcuts",
      keyboardShortcuts: {
        Enter: ({ editor }) => {
          return handleEnter(editor, "bulletListItem");
        },
        "Mod-Shift-8": ({ editor }) => {
          const cursorPosition = editor.getTextCursorPosition();

          if (
            editor.schema.blockSchema[cursorPosition.block.type].content !==
            "inline"
          ) {
            return false;
          }

          editor.updateBlock(cursorPosition.block, {
            type: "bulletListItem",
            props: {},
          });
          return true;
        },
      },
      inputRules: [
        {
          find: new RegExp(`^[-+*]\\s$`),
          replace() {
            return {
              type: "bulletListItem",
              props: {},
            };
          },
        },
      ],
    }),
  ],
);
