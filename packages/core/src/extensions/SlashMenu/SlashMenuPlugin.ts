import { BaseSlashMenuItem } from "./BaseSlashMenuItem";
import { DefaultBlockSchema } from "../Blocks/api/defaultBlocks";
import { BlockNoteEditor } from "../../BlockNoteEditor";
import {
  createSuggestionPlugin,
  SuggestionsMenuState,
} from "../../shared/plugins/suggestion/SuggestionPlugin";
import { PluginKey } from "prosemirror-state";

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
  editor._tiptapEditor.registerPlugin(
    createSuggestionPlugin<SlashMenuItem, DefaultBlockSchema>(
      slashMenuPluginKey,
      "/",
      editor,
      (slashMenuState) => updateSlashMenu(slashMenuState),
      ({ item, editor }) => item.execute(editor),
      items
    )
  );
};
