import {
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useEffect, useState } from "react";

export function useSuggestionMenuData<
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(editor: BlockNoteEditor<BSchema, I, S>, triggerCharacter: string) {
  const [query, setQuery] = useState<string>("");

  useEffect(() => {
    return editor.suggestionMenus.onDataUpdate(triggerCharacter, (data) => {
      setQuery(data.query);
    });
  }, [editor.suggestionMenus, triggerCharacter]);

  return {
    query: query,
    closeMenu: editor.suggestionMenus.closeMenu,
    clearQuery: editor.suggestionMenus.clearQuery,
  };
}
