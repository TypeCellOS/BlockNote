import {
  BlockNoteEditor,
  addNodeAndExtensionsToSpec,
  createPropSchemaFromZod,
} from "@blocknote/core";
import { z } from "zod/v4";

import { RiSeparator } from "react-icons/ri";

export const Separator = addNodeAndExtensionsToSpec(
  {
    type: "separator" as const,
    propSchema: createPropSchemaFromZod(z.object({})),
    content: "none",
  },
  {
    render: () => {
      const separator = document.createElement("div");
      separator.setAttribute(
        "style",
        "height: 1px; background-color: black; width: 100%;",
      );

      const parent = document.createElement("div");
      parent.setAttribute(
        "style",
        "height: 1rem; display: flex; justify-content: center; align-items: center;",
      );
      parent.appendChild(separator);

      return {
        dom: parent,
      };
    },
  },
);

export const insertSeparator = {
  title: "Insert Separator",
  onItemClick: (editor: BlockNoteEditor<any, any, any>) => {
    editor.insertBlocks(
      [
        {
          type: "separator",
        },
      ],
      editor.getTextCursorPosition().block,
      "after",
    );
  },
  subtext: "Insert a button which inserts a block below it",
  icon: <RiSeparator />,
  aliases: ["separator", "horizontal", "line", "rule"],
  group: "Other",
};
