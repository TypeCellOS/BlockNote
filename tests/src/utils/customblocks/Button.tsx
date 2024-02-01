import {
  BlockNoteEditor,
  BlockSchema,
  createBlockSpec,
  defaultProps,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { SuggestionMenuItemProps } from "@blocknote/react";
import { RiRadioButtonFill } from "react-icons/ri";

export const Button = createBlockSpec(
  {
    type: "button" as const,
    propSchema: {
      backgroundColor: defaultProps.backgroundColor,
    } as const,
    content: "none",
  },
  {
    render: (block, editor) => {
      const button = document.createElement("button");
      button.innerText = "Insert Block Below";
      button.addEventListener("click", () => {
        editor.insertBlocks(
          [
            {
              type: "paragraph",
              content: "Hello World",
            } as any, // TODO
          ],
          editor.getBlock(block)!,
          "after"
        );
      });

      return {
        dom: button,
      };
    },
  }
);

export const insertButton = <
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  closeMenu: () => void,
  clearQuery: () => void
) =>
  ({
    name: "Insert Button",
    execute: () => {
      closeMenu();
      clearQuery();

      editor.insertBlocks(
        [
          {
            type: "button",
          },
        ],
        editor.getTextCursorPosition().block,
        "after"
      );
    },
    subtext: "Insert a button which inserts a block below it",
    icon: <RiRadioButtonFill />,
    aliases: ["button", "click", "action"],
    group: "Other",
  } satisfies SuggestionMenuItemProps);
