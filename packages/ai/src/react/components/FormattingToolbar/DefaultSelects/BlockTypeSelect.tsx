import {
  Block,
  BlockSchema,
  Dictionary,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import {
  BlockTypeSelect as CoreBlockTypeSelect,
  blockTypeSelectItems as blockTypeSelectCoreItems,
  useDictionary,
} from "@blocknote/react";
import type { IconType } from "react-icons";
import { RiSparkling2Fill } from "react-icons/ri";

export type BlockTypeSelectItem = {
  name: string;
  type: string;
  props?: Record<string, boolean | number | string>;
  icon: IconType;
  isSelected: (
    block: Block<BlockSchema, InlineContentSchema, StyleSchema>
  ) => boolean;
};

export const blockTypeSelectItems = (
  dict: Dictionary
): BlockTypeSelectItem[] => [
  ...blockTypeSelectCoreItems(dict),
  {
    name: dict.slash_menu.ai_block.title,
    type: "ai",
    icon: RiSparkling2Fill,
    isSelected: (block) => block.type === "ai",
  },
];

export const BlockTypeSelect = (props: { items?: BlockTypeSelectItem[] }) => {
  const dict = useDictionary();

  return (
    <CoreBlockTypeSelect items={props.items || blockTypeSelectItems(dict)} />
  );
};
