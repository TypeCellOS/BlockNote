import { updateBlockTr } from "../../api/blockManipulation/commands/updateBlock/updateBlock.js";
import { getBlockInfoFromTransaction } from "../../api/getBlockInfoFromPos.js";
import { defaultProps } from "../../blocks/defaultProps.js";
import { BlockNoteExtension } from "../../editor/BlockNoteExtension.js";
import {
  createBlockConfig,
  createBlockSpec,
} from "../../schema/blocks/playground.js";

const config = createBlockConfig(() => ({
  type: "checkListItem" as const,
  propSchema: {
    ...defaultProps,
    checked: { default: false, type: "boolean" },
  },
  content: "inline",
}));

export class CheckListItemExtension extends BlockNoteExtension {
  public static key() {
    return "check-list-item-shortcuts";
  }

  constructor() {
    super();
    this.inputRules = [
      {
        find: new RegExp(`\\[\\s*\\]\\s$`),
        replace() {
          return {
            type: "checkListItem",
            props: {
              checked: false,
            },
          };
        },
      },
      {
        find: new RegExp(`\\[[Xx]\\]\\s$`),
        replace() {
          return {
            type: "checkListItem",
            props: {
              checked: true,
            },
          };
        },
      },
    ];

    this.keyboardShortcuts = {
      "Mod-Shift-9": ({ editor }) =>
        editor.transact((tr) => {
          const blockInfo = getBlockInfoFromTransaction(tr);

          if (
            !blockInfo.isBlockContainer ||
            blockInfo.blockContent.node.type.spec.content !== "inline*"
          ) {
            return true;
          }

          updateBlockTr(tr, blockInfo.bnBlock.beforePos, {
            type: "checkListItem",
            props: {},
          });
          return true;
        }),
    };
  }
}

export const definition = createBlockSpec(config).implementation(
  () => ({
    parse(element) {
      if (element.tagName === "input") {
        // Ignore if we already parsed an ancestor list item to avoid double-parsing.
        if (element.closest("[data-content-type]") || element.closest("li")) {
          return;
        }

        if ((element as HTMLInputElement).type === "checkbox") {
          return { checked: (element as HTMLInputElement).checked };
        }
        return;
      }
      if (element.tagName !== "LI") {
        return;
      }

      const parent = element.parentElement;

      if (parent === null) {
        return;
      }

      if (
        parent.tagName === "UL" ||
        (parent.tagName === "DIV" && parent.parentElement?.tagName === "UL")
      ) {
        const checkbox =
          (element.querySelector("input[type=checkbox]") as HTMLInputElement) ||
          null;

        if (checkbox === null) {
          return;
        }

        return { checked: checkbox.checked };
      }

      return;
    },
    // TODO how do we represent this??
    //   // As `li` elements can contain multiple paragraphs, we need to merge their contents
    // // into a single one so that ProseMirror can parse everything correctly.
    // getContent: (node, schema) =>
    //   getListItemContent(node, schema, this.name),
    // node: "bulletListItem",
    render(block) {
      const div = document.createElement("div");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = block.props.checked;
      if (block.props.checked) {
        checkbox.setAttribute("checked", "");
      }
      // We use a <p> tag, because for <li> tags we'd need a <ul> element to put
      // them in to be semantically correct, which we can't have due to the
      // schema.
      const paragraphEl = document.createElement("p");

      div.appendChild(checkbox);
      div.appendChild(paragraphEl);

      return {
        dom: div,
        contentDOM: paragraphEl,
      };
    },
  }),
  () => [new CheckListItemExtension()],
);
