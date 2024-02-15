import {
  BlockNoteEditor,
  BlockSchema,
  createBlockSpec,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { MantineSuggestionMenuItemProps } from "@blocknote/react";
import { RiSeparator } from "react-icons/ri";

export const Separator = createBlockSpec(
  {
    type: "separator" as const,
    propSchema: {} as const,
    content: "none",
  },
  {
    render: () => {
      const separator = document.createElement("div");
      separator.setAttribute(
        "style",
        "height: 1px; background-color: black; width: 100%;"
      );

      const parent = document.createElement("div");
      parent.setAttribute(
        "style",
        "height: 1rem; display: flex; justify-content: center; align-items: center;"
      );
      parent.appendChild(separator);

      return {
        dom: parent,
      };
    },
  }
);

export const insertSeparator = <
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  closeMenu: () => void,
  clearQuery: () => void
) =>
  ({
    name: "Insert Separator",
    execute: () => {
      closeMenu();
      clearQuery();

      editor.insertBlocks(
        [
          {
            type: "separator",
          },
        ],
        editor.getTextCursorPosition().block,
        "after"
      );
    },
    subtext: "Insert a button which inserts a block below it",
    icon: <RiSeparator />,
    aliases: ["separator", "horizontal", "line", "rule"],
    group: "Other",
  } satisfies MantineSuggestionMenuItemProps);
