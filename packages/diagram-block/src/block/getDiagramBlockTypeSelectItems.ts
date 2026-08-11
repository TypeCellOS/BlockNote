import { BlockNoteEditor } from "@blocknote/core";
import { BlockTypeSelectItem } from "@blocknote/react";
import { TbSitemap } from "react-icons/tb";

import { getDiagramDictionary } from "../i18n/dictionary.js";

/**
 * Block type select item for the Diagram block, for use with the formatting
 * toolbar's `BlockTypeSelect` (spread into its `items` alongside the defaults).
 * The Diagram block lives in an optional package, so it isn't part of the
 * default items - this lets consumers opt it in. The name comes from the
 * editor's diagram dictionary, like the default items' names come from its
 * main dictionary.
 */
export const getDiagramBlockTypeSelectItems = (
  editor: BlockNoteEditor<any, any, any>,
): BlockTypeSelectItem[] => [
  {
    name: getDiagramDictionary(editor).block_type_select.name,
    type: "diagram",
    icon: TbSitemap,
  },
];
