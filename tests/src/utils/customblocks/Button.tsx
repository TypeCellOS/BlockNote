import {
  BlockSchemaWithBlock,
  createBlockSpec,
  defaultProps,
} from "@blocknote/core";
import { ReactSlashMenuItem } from "@blocknote/react";
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

export const insertButton: ReactSlashMenuItem<
  BlockSchemaWithBlock<"button", typeof Button.config>,
  any,
  any
> = {
  name: "Insert Button",
  execute: (editor) => {
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
  aliases: ["button", "click", "action"],
  group: "Media",
  icon: <RiRadioButtonFill />,
  hint: "Insert a button which inserts a block below it",
};
