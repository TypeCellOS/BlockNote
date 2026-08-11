import { BlockTypeSelectItem } from "@blocknote/react";
import { TbSitemap } from "react-icons/tb";

/**
 * Block type select item for the Diagram block, for use with the formatting
 * toolbar's `BlockTypeSelect` (spread into its `items` alongside the defaults).
 * The Diagram block lives in an optional package, so it isn't part of the
 * default items - this lets consumers opt it in.
 */
export const getDiagramBlockTypeSelectItems = (
  name = "Diagram",
): BlockTypeSelectItem[] => [
  {
    name,
    type: "diagram",
    icon: TbSitemap,
  },
];
