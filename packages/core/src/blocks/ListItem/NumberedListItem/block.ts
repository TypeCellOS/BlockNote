import { createBlockNoteExtension } from "../../../editor/BlockNoteExtension.js";
import { createBlockConfig, createBlockSpec } from "../../../schema/index.js";
import { defaultProps } from "../../defaultProps.js";
import { handleEnter } from "../../utils/listItemEnterHandler.js";
import { getListItemContent } from "../getListItemContent.js";
import { NumberedListIndexingDecorationPlugin } from "./IndexingPlugin.js";

export type NumberedListItemBlockConfig = ReturnType<
  typeof createNumberedListItemBlockConfig
>;

export const createNumberedListItemBlockConfig = createBlockConfig(
  () =>
    ({
      type: "numberedListItem" as const,
      propSchema: {
        ...defaultProps,
        start: { default: undefined, type: "number" } as const,
      },
      content: "inline",
    }) as const,
);

export const createNumberedListItemBlockSpec = createBlockSpec(
  createNumberedListItemBlockConfig,
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
        parent.tagName === "OL" ||
        (parent.tagName === "DIV" && parent.parentElement?.tagName === "OL")
      ) {
        return {};
      }

      return false;
    },
    // As `li` elements can contain multiple paragraphs, we need to merge their contents
    // into a single one so that ProseMirror can parse everything correctly.
    parseContent: ({ el, schema }) =>
      getListItemContent(el, schema, "numberedListItem"),
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
      key: "numbered-list-item-shortcuts",
      inputRules: [
        {
          find: new RegExp(`^(\\d+)\\.\\s$`),
          replace({ match }) {
            return {
              type: "numberedListItem",
              props: {
                start: parseInt(match[1]),
              },
            };
          },
        },
      ],
      keyboardShortcuts: {
        Enter: ({ editor }) => {
          return handleEnter(editor, "numberedListItem");
        },
        "Mod-Shift-7": ({ editor }) => {
          const cursorPosition = editor.getTextCursorPosition();

          if (
            editor.schema.blockSchema[cursorPosition.block.type].content !==
            "inline"
          ) {
            return false;
          }

          editor.updateBlock(cursorPosition.block, {
            type: "numberedListItem",
            props: {},
          });
          return true;
        },
      },
      plugins: [NumberedListIndexingDecorationPlugin()],
    }),
  ],
);
