import { BlockTypeSelectItem } from "@blocknote/react";
import { TbMathFunction } from "react-icons/tb";

/**
 * Block type select item for the Math block, for use with the formatting
 * toolbar's `BlockTypeSelect` (spread into its `items` alongside the defaults).
 * The Math block lives in an optional package, so it isn't part of the default
 * items - this lets consumers opt it in.
 */
export const getMathBlockTypeSelectItems = (
  name = "Math",
): BlockTypeSelectItem[] => [
  {
    name,
    type: "math",
    icon: TbMathFunction,
  },
];
