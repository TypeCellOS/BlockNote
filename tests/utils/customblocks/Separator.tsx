import { createBlockSpec } from "@blocknote/core";
import { ReactSlashMenuItem } from "@blocknote/react";
import { RiSeparator } from "react-icons/ri";

export const Separator = createBlockSpec({
  type: "separator" as const,
  propSchema: {} as const,
  containsInlineContent: false,
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
});

export const insertSeparator = new ReactSlashMenuItem<{
  separator: typeof Separator;
}>(
  "Insert Separator",
  (editor) => {
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
  ["separator", "horizontal", "line", "rule"],
  "Media",
  <RiSeparator />,
  "Insert a button which inserts a block below it"
);
