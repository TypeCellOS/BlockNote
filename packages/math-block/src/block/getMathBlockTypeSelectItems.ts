import { BlockNoteEditor } from "@blocknote/core";
import { BlockTypeSelectItem } from "@blocknote/react";
import { TbMathFunction } from "react-icons/tb";

import { getMathDictionary } from "../i18n/dictionary.js";

/**
 * Block type select item for the Math block, for use with the formatting
 * toolbar's `BlockTypeSelect` (spread into its `items` alongside the defaults).
 * The Math block lives in an optional package, so it isn't part of the default
 * items - this lets consumers opt it in. The name comes from the editor's
 * math dictionary, like the default items' names come from its main
 * dictionary.
 */
export const getMathBlockTypeSelectItems = (
  editor: BlockNoteEditor<any, any, any>,
): BlockTypeSelectItem[] => [
  {
    name: getMathDictionary(editor).block_type_select.name,
    type: "mathBlock",
    icon: TbMathFunction,
  },
];
