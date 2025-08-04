import { updateBlockTr } from "../../api/blockManipulation/commands/updateBlock/updateBlock.js";
import { getBlockInfoFromTransaction } from "../../api/getBlockInfoFromPos.js";
import { defaultProps } from "../../blocks/defaultProps.js";
import { getListItemContent } from "../../blocks/ListItemBlockContent/getListItemContent.js";
import {
  createBlockConfig,
  createBlockNoteExtension,
  createBlockDefinition,
} from "../../schema/index.js";
import { handleEnter } from "../utils/listItemEnterHandler.js";
import { NumberedListIndexingDecorationPlugin } from "./IndexingPlugin.js";

const config = createBlockConfig(() => ({
  type: "numberedListItem" as const,
  propSchema: {
    ...defaultProps,
    start: { default: undefined, type: "number" },
  },
  content: "inline",
}));

export const definition = createBlockDefinition(config).implementation(
  () => ({
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
      getListItemContent(el, schema, "numberedListItem"),
    render() {
      const div = document.createElement("div");
      // We use a <p> tag, because for <li> tags we'd need a <ul> element to put
      // them in to be semantically correct, which we can't have due to the
      // schema.
      const el = document.createElement("p");

      div.appendChild(el);

      return {
        dom: div,
        contentDOM: el,
      };
    },
  }),
  () => [
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
              content: [],
            };
          },
        },
      ],
      keyboardShortcuts: {
        Enter: ({ editor }) => {
          return handleEnter(editor, "numberedListItem");
        },
        "Mod-Shift-7": ({ editor }) =>
          editor.transact((tr) => {
            const blockInfo = getBlockInfoFromTransaction(tr);

            if (
              !blockInfo.isBlockContainer ||
              blockInfo.blockContent.node.type.spec.content !== "inline*"
            ) {
              return true;
            }

            updateBlockTr(tr, blockInfo.bnBlock.beforePos, {
              type: "numberedListItem",
              props: {},
            });
            return true;
          }),
      },
      plugins: [NumberedListIndexingDecorationPlugin()],
    }),
  ],
);
