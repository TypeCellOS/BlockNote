import { RiSparkling2Fill } from "react-icons/ri";

import { BlockTypeSelectItem } from "@blocknote/react";
import { AIDictionary } from "../../../../core";

// TODO: rename?
export const aiBlockTypeSelectItems = (
  dict: AIDictionary
): BlockTypeSelectItem[] => [
  {
    name: dict.slash_menu.ai_block.title,
    type: "ai",
    icon: RiSparkling2Fill,
    isSelected: (block) => block.type === "ai",
    showWhileSelected: true,
    showWhileNotSelected: false,
  },
];
