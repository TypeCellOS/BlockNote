import { BlockSchemaWithBlock, createBlockSpec } from "@blocknote/core";
import { ReactSlashMenuItem } from "@blocknote/react";
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

export const insertSeparator: ReactSlashMenuItem<
  BlockSchemaWithBlock<"separator", typeof Separator.config>
> = {
  name: "Insert Separator",
  execute: (editor) => {
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

  aliases: ["separator", "horizontal", "line", "rule"],
  group: "Media",
  icon: <RiSeparator />,
  hint: "Insert a button which inserts a block below it",
};
