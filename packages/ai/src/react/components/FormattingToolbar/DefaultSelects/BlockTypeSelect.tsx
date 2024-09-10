import { RiSparkling2Fill } from "react-icons/ri";

import { BlockTypeSelectItem } from "@blocknote/react";
import { Dictionary } from "../../../../core/i18n/dictionary";

// TODO: rename?
export const aiBlockTypeSelectItems = (
  dict: Dictionary
): BlockTypeSelectItem[] => [
  {
    name: dict.slash_menu.ai_block.title,
    type: "ai",
    icon: RiSparkling2Fill,
    isSelected: (block) => block.type === "ai",
  },
];
