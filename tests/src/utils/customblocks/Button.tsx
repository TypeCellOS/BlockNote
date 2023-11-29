import {
  BaseSlashMenuItem,
  BlockSchemaWithBlock,
  createBlockSpec,
  defaultProps,
} from "@blocknote/core";

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
            },
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

export const insertButton: BaseSlashMenuItem<
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
  // group: "Media",
  // icon: <RiRadioButtonFill />,
  // hint: "Insert a button which inserts a block below it",
};
