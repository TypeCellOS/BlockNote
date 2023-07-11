import { PluginKey } from "prosemirror-state";
import { BlockNoteEditor } from "../../BlockNoteEditor";
import {
  createSuggestionPlugin,
  SuggestionsMenuState,
} from "../../shared/plugins/suggestion/SuggestionPlugin";
import { DefaultBlockSchema } from "../Blocks/api/defaultBlocks";
import { BaseSlashMenuItem } from "./BaseSlashMenuItem";

export const slashMenuPluginKey = new PluginKey("SlashMenuPlugin");
export const createSlashMenu = <
  SlashMenuItem extends BaseSlashMenuItem<DefaultBlockSchema>
>(
  editor: BlockNoteEditor,
  updateSlashMenu: (
    slashMenuState: SuggestionsMenuState<SlashMenuItem>
  ) => void,
  items: (query: string) => SlashMenuItem[]
) => {
  createSuggestionPlugin<SlashMenuItem, DefaultBlockSchema>(
    slashMenuPluginKey,
    "/",
    editor,
    (slashMenuState) => updateSlashMenu(slashMenuState),
    ({ item, editor }) => item.execute(editor),
    items
  );
  return () => editor._tiptapEditor.unregisterPlugin(slashMenuPluginKey);
};
