import { createBlockNoteExtension } from "../../../editor/BlockNoteExtension.js";
import { createBlockConfig, createBlockSpec } from "../../../schema/index.js";
import {
  addDefaultPropsExternalHTML,
  defaultProps,
  parseDefaultProps,
} from "../../defaultProps.js";
import { handleEnter } from "../../utils/listItemEnterHandler.js";
import { getListItemContent } from "../getListItemContent.js";

export type CheckListItemBlockConfig = ReturnType<
  typeof createCheckListItemConfig
>;

export const createCheckListItemConfig = createBlockConfig(
  () =>
    ({
      type: "checkListItem" as const,
      propSchema: {
        ...defaultProps,
        checked: { default: false, type: "boolean" },
      },
      content: "inline",
    }) as const,
);

export const createCheckListItemBlockSpec = createBlockSpec(
  createCheckListItemConfig,
  {
    meta: {
      isolating: false,
    },
    parse(element) {
      if (element.tagName === "input") {
        // Ignore if we already parsed an ancestor list item to avoid double-parsing.
        if (element.closest("[data-content-type]") || element.closest("li")) {
          return undefined;
        }

        if ((element as HTMLInputElement).type === "checkbox") {
          return { checked: (element as HTMLInputElement).checked };
        }
        return undefined;
      }
      if (element.tagName !== "LI") {
        return undefined;
      }

      const parent = element.parentElement;

      if (parent === null) {
        return undefined;
      }

      if (
        parent.tagName === "UL" ||
        (parent.tagName === "DIV" && parent.parentElement?.tagName === "UL")
      ) {
        const checkbox =
          (element.querySelector("input[type=checkbox]") as HTMLInputElement) ||
          null;

        if (checkbox === null) {
          return undefined;
        }

        return { ...parseDefaultProps(element), checked: checkbox.checked };
      }

      return;
    },
    // As `li` elements can contain multiple paragraphs, we need to merge their contents
    // into a single one so that ProseMirror can parse everything correctly.
    parseContent: ({ el, schema }) =>
      getListItemContent(el, schema, "checkListItem"),
    render(block, editor) {
      const dom = document.createDocumentFragment();

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = block.props.checked;
      if (block.props.checked) {
        checkbox.setAttribute("checked", "");
      }
      checkbox.addEventListener("change", () => {
        editor.updateBlock(block, { props: { checked: !block.props.checked } });
      });
      // We use a <p> tag, because for <li> tags we'd need a <ul> element to put
      // them in to be semantically correct, which we can't have due to the
      // schema.
      const paragraph = document.createElement("p");

      dom.appendChild(checkbox);
      dom.appendChild(paragraph);

      return {
        dom,
        contentDOM: paragraph,
      };
    },
    toExternalHTML(block) {
      const dom = document.createElement("li");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = block.props.checked;
      if (block.props.checked) {
        checkbox.setAttribute("checked", "");
      }
      // We use a <p> tag, because for <li> tags we'd need a <ul> element to put
      // them in to be semantically correct, which we can't have due to the
      // schema.
      const paragraph = document.createElement("p");
      addDefaultPropsExternalHTML(block.props, dom);

      dom.appendChild(checkbox);
      dom.appendChild(paragraph);

      return {
        dom,
        contentDOM: paragraph,
      };
    },
    runsBefore: ["bulletListItem"],
  },
  [
    createBlockNoteExtension({
      key: "check-list-item-shortcuts",
      keyboardShortcuts: {
        Enter: ({ editor }) => {
          return handleEnter(editor, "checkListItem");
        },
        "Mod-Shift-9": ({ editor }) => {
          const cursorPosition = editor.getTextCursorPosition();

          if (
            editor.schema.blockSchema[cursorPosition.block.type].content !==
            "inline"
          ) {
            return false;
          }

          editor.updateBlock(cursorPosition.block, {
            type: "checkListItem",
            props: {},
          });
          return true;
        },
      },
      inputRules: [
        {
          find: new RegExp(`\\[\\s*\\]\\s$`),
          replace() {
            return {
              type: "checkListItem",
              props: {
                checked: false,
              },
              content: [],
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
      ],
    }),
  ],
);
