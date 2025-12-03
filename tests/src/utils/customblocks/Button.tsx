import {
  BlockNoteEditor,
  addNodeAndExtensionsToSpec,
  createPropSchemaFromZod,
  defaultZodPropSchema,
} from "@blocknote/core";
import { RiRadioButtonFill } from "react-icons/ri";

export const Button = addNodeAndExtensionsToSpec(
  {
    type: "button" as const,
    propSchema: createPropSchemaFromZod(
      defaultZodPropSchema.pick({
        backgroundColor: true,
      }),
    ),
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
          "after",
        );
      });

      return {
        dom: button,
      };
    },
  },
);

export const insertButton = {
  title: "Insert Button",
  onItemClick: (editor: BlockNoteEditor<any, any, any>) => {
    editor.insertBlocks(
      [
        {
          type: "button",
        },
      ],
      editor.getTextCursorPosition().block,
      "after",
    );
  },
  subtext: "Insert a button which inserts a block below it",
  icon: <RiRadioButtonFill />,
  aliases: ["button", "click", "action"],
  group: "Other",
};
