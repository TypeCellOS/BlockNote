import { BlockNoteEditor } from "@blocknote/core";
import { insertOrUpdateBlockForSlashMenu } from "@blocknote/core/extensions";
import { DefaultReactSuggestionItem } from "@blocknote/react";
import { TbSitemap } from "react-icons/tb";

import { getDiagramDictionary } from "./i18n/dictionary.js";

/**
 * Slash menu item for the Diagram block, for use with the suggestion menu
 * (combine with the default items via `combineByGroup`). The Diagram block
 * lives in an optional package, so the item isn't part of the defaults - this
 * lets consumers opt it in. Only returned when the block is actually in the
 * editor's schema.
 */
export function getDiagramSlashMenuItems(
  editor: BlockNoteEditor<any, any, any>,
): Omit<DefaultReactSuggestionItem, "key">[] {
  const items: Omit<DefaultReactSuggestionItem, "key">[] = [];

  if ("diagram" in editor.schema.blockSchema) {
    items.push({
      ...getDiagramDictionary(editor).slash_menu.diagram,
      icon: <TbSitemap size={18} />,
      // Inserts a starter diagram (rather than an empty source) so the
      // preview shows something to click and edit.
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor, {
          type: "diagram",
          content: "graph TD\n    A[Start] --> B[Stop]",
        });
      },
    });
  }

  return items;
}
