import {
  BlockNoteEditor,
  SourceBlockWithPreviewExtension,
} from "@blocknote/core";
import { insertOrUpdateBlockForSlashMenu } from "@blocknote/core/extensions";
import { DefaultReactSuggestionItem } from "@blocknote/react";
import { TextSelection } from "prosemirror-state";
import { TbMathFunction } from "react-icons/tb";

import { getMathDictionary } from "./i18n/dictionary.js";

/**
 * Slash menu items for the Math block and inline Math content, for use with
 * the suggestion menu (combine with the default items via `combineByGroup`).
 * The Math specs live in an optional package, so the items aren't part of the
 * defaults - this lets consumers opt them in. Only items whose spec is
 * actually in the editor's schema are returned.
 */
export function getMathSlashMenuItems(
  editor: BlockNoteEditor<any, any, any>,
): Omit<DefaultReactSuggestionItem, "key">[] {
  const items: Omit<DefaultReactSuggestionItem, "key">[] = [];

  if ("mathBlock" in editor.schema.blockSchema) {
    items.push({
      ...getMathDictionary(editor).slash_menu.math_block,
      icon: <TbMathFunction size={18} />,
      onItemClick: () => {
        const block = insertOrUpdateBlockForSlashMenu(editor, {
          type: "mathBlock",
        });
        // Opens the new block's source popup so the equation can be typed
        // right away.
        editor
          .getExtension(SourceBlockWithPreviewExtension)
          ?.store.setState((state) => ({ ...state, popupOpen: block.id }));
        requestAnimationFrame(() => {
          editor.setTextCursorPosition(block.id, "end");
          editor.focus();
        });
      },
    });
  }

  if ("math" in editor.schema.inlineContentSchema) {
    items.push({
      ...getMathDictionary(editor).slash_menu.inline_math,
      icon: <TbMathFunction size={18} />,
      onItemClick: () => {
        const view = editor.prosemirrorView!;
        const insertPos = view.state.selection.from;

        editor.insertInlineContent([
          { type: "math", content: "" },
          // Adds a trailing space so the cursor can leave the equation.
          " ",
        ]);
        // Moves the cursor into the (empty) equation, which opens its source
        // popup so it can be typed right away.
        requestAnimationFrame(() => {
          const view = editor.prosemirrorView!;
          view.dispatch(
            view.state.tr.setSelection(
              TextSelection.create(view.state.doc, insertPos + 1),
            ),
          );
          editor.focus();
        });
      },
    });
  }

  return items;
}
