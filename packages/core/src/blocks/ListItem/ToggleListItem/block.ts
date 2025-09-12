import { createBlockNoteExtension } from "../../../editor/BlockNoteExtension.js";
import { createBlockConfig, createBlockSpec } from "../../../schema/index.js";
import {
  addDefaultPropsExternalHTML,
  defaultProps,
} from "../../defaultProps.js";
import { createToggleWrapper } from "../../ToggleWrapper/createToggleWrapper.js";
import { handleEnter } from "../../utils/listItemEnterHandler.js";

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
    meta: {
      isolating: false,
    },
    render(block, editor) {
      const paragraphEl = document.createElement("p");
      const toggleWrapper = createToggleWrapper(
        block as any,
        editor,
        paragraphEl,
      );
      return { ...toggleWrapper, contentDOM: paragraphEl };
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
      key: "toggle-list-item-shortcuts",
      keyboardShortcuts: {
        Enter: ({ editor }) => {
          return handleEnter(editor, "toggleListItem");
        },
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
