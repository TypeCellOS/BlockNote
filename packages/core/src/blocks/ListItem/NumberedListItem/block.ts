import { getBlockInfoFromSelection } from "../../../api/getBlockInfoFromPos.js";
import { createBlockNoteExtension } from "../../../editor/BlockNoteExtension.js";
import { createBlockConfig, createBlockSpec } from "../../../schema/index.js";
import {
  addDefaultPropsExternalHTML,
  defaultProps,
  parseDefaultProps,
} from "../../defaultProps.js";
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
        return undefined;
      }

      const parent = element.parentElement;

      if (parent === null) {
        return undefined;
      }

      if (
        parent.tagName === "OL" ||
        (parent.tagName === "DIV" && parent.parentElement?.tagName === "OL")
      ) {
        const startIndex = parseInt(parent.getAttribute("start") || "1");

        const defaultProps = parseDefaultProps(element);

        if (element.previousElementSibling || startIndex === 1) {
          return defaultProps;
        }

        return {
          ...defaultProps,
          start: startIndex,
        };
      }

      return undefined;
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
      key: "numbered-list-item-shortcuts",
      inputRules: [
        {
          find: new RegExp(`^(\\d+)\\.\\s$`),
          replace({ match, editor }) {
            const blockInfo = getBlockInfoFromSelection(
              editor.prosemirrorState,
            );

            if (blockInfo.blockNoteType === "heading") {
              return;
            }
            const start = parseInt(match[1]);
            return {
              type: "numberedListItem",
              props: {
                start: start !== 1 ? start : undefined,
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
