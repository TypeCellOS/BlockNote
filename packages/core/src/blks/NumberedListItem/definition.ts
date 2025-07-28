import { updateBlockTr } from "../../api/blockManipulation/commands/updateBlock/updateBlock.js";
import { getBlockInfoFromTransaction } from "../../api/getBlockInfoFromPos.js";
import { defaultProps } from "../../blocks/defaultProps.js";
import { BlockNoteExtension } from "../../editor/BlockNoteExtension.js";
import {
  createBlockConfig,
  createBlockSpec,
} from "../../schema/blocks/playground.js";
import { NumberedListIndexingDecorationPlugin } from "./IndexingPlugin.js";

const config = createBlockConfig(() => ({
  type: "numberedListItem" as const,
  propSchema: {
    ...defaultProps,
    start: { default: undefined, type: "number" },
  },
  content: "inline",
}));

export class NumberedListItemExtension extends BlockNoteExtension {
  public static key() {
    return "numbered-list-item-shortcuts";
  }

  constructor() {
    super();
    this.inputRules = [
      {
        find: new RegExp(`^\\d+\\.\\s$`),
        replace() {
          return {
            type: "numberedListItem",
            props: {},
          };
        },
      },
    ];

    this.keyboardShortcuts = {
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
    };

    this.addProsemirrorPlugin(NumberedListIndexingDecorationPlugin());
  }
}

export const definition = createBlockSpec(config).implementation(
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
    // TODO how do we represent this??
    //   // As `li` elements can contain multiple paragraphs, we need to merge their contents
    // // into a single one so that ProseMirror can parse everything correctly.
    // getContent: (node, schema) =>
    //   getListItemContent(node, schema, this.name),
    // node: "bulletListItem",
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
  () => [new NumberedListItemExtension()],
);
