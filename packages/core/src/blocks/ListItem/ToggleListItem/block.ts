import { createExtension } from "../../../editor/BlockNoteExtension.js";
import { createBlockConfig, createBlockSpec } from "../../../schema/index.js";
import {
  addDefaultPropsExternalHTML,
  defaultProps,
  parseDefaultProps,
} from "../../defaultProps.js";
import { getDetailsContent } from "../../getDetailsContent.js";
import {
  createToggleFrame,
  isToggleOpen,
} from "../../ToggleWrapper/createToggleFrame.js";

export type ToggleListItemBlockConfig = ReturnType<
  typeof createToggleListItemBlockConfig
>;

export const createToggleListItemBlockConfig = createBlockConfig(
  () =>
    ({
      type: "toggleListItem" as const,
      propSchema: {
        ...defaultProps,
      },
      content: "inline" as const,
    }) as const,
);

export const createToggleListItemBlockSpec = createBlockSpec(
  createToggleListItemBlockConfig,
  {
    // Enter continues the list, and Enter in an empty item ends it: the item
    // turns into a paragraph. While the toggle is open, Enter in its text
    // starts its children, and Enter in an empty child adds another child.
    experimental_keyboard: (block) => {
      const open = isToggleOpen(block);
      return {
        splitKeepsType: true,
        emptyEnterResets: true,
        enter: open ? "into-children" : "split",
        emptyChildEnter: open ? "stay" : "outdent",
      };
    },
    meta: {
      isolating: false,
      // A block dragged onto the toggle becomes its first child.
      dropsIntoChildren: () => true,
    },
    parse(element) {
      if (element.tagName === "DETAILS") {
        // Skip <details> that contain a heading in <summary> — those are
        // toggle headings, handled by the heading block's parse rule.

        return parseDefaultProps(element);
      }

      if (element.tagName === "LI") {
        const parent = element.parentElement;

        if (
          parent &&
          (parent.tagName === "UL" ||
            (parent.tagName === "DIV" &&
              parent.parentElement?.tagName === "UL"))
        ) {
          const details = element.querySelector(":scope > details");
          if (details) {
            return parseDefaultProps(element);
          }
        }
      }

      return undefined;
    },
    parseContent: ({ el, schema }) => {
      const details =
        el.tagName === "DETAILS" ? el : el.querySelector(":scope > details");

      if (!details) {
        throw new Error("No details found in toggleListItem parseContent");
      }

      return getDetailsContent(
        details as HTMLElement,
        schema,
        "toggleListItem",
      );
    },
    runsBefore: ["bulletListItem"],
    render() {
      const paragraphEl = document.createElement("p");
      return { dom: paragraphEl, contentDOM: paragraphEl };
    },
    renderFrame: createToggleFrame,
    toExternalHTML(block) {
      const li = document.createElement("li");
      const details = document.createElement("details");
      details.setAttribute("open", "");
      const summary = document.createElement("summary");
      const p = document.createElement("p");
      summary.appendChild(p);
      details.appendChild(summary);

      addDefaultPropsExternalHTML(block.props, li);
      li.appendChild(details);

      return {
        dom: li,
        contentDOM: p,
        childrenDOM: details,
      };
    },
  },
  [
    createExtension({
      key: "toggle-list-item-shortcuts",
      keyboardShortcuts: {
        "Mod-Shift-6": ({ editor }) => {
          const cursorPosition = editor.getTextCursorPosition();

          if (
            editor.schema.blockSchema[cursorPosition.block.type].content !==
            "inline"
          ) {
            return false;
          }

          editor.updateBlock(cursorPosition.block, {
            type: "toggleListItem",
            props: {},
          });
          return true;
        },
      },
    }),
  ],
);
