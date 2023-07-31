import { Plugin, PluginKey } from "prosemirror-state";

import { BlockNoteEditor } from "../../BlockNoteEditor";
import { EventEmitter } from "../../shared/EventEmitter";
import {
  SuggestionsMenuState,
  setupSuggestionsMenu,
} from "../../shared/plugins/suggestion/SuggestionPlugin";
import { BlockSchema } from "../Blocks/api/blockTypes";
import { BaseSlashMenuItem } from "./BaseSlashMenuItem";

export const slashMenuPluginKey = new PluginKey("SlashMenuPlugin");

export class SlashMenuProsemirrorPlugin<
  BSchema extends BlockSchema,
  SlashMenuItem extends BaseSlashMenuItem<BSchema>
> extends EventEmitter<any> {
  public readonly plugin: Plugin;
  public readonly itemCallback: (item: SlashMenuItem) => void;

  constructor(editor: BlockNoteEditor<BSchema>, items: SlashMenuItem[]) {
    super();
    const suggestions = setupSuggestionsMenu<SlashMenuItem, BSchema>(
      editor,
      (state) => {
        this.emit("update", state);
      },
      slashMenuPluginKey,
      "/",
      (query) =>
        items.filter(
          ({ name, aliases }: SlashMenuItem) =>
            name.toLowerCase().startsWith(query.toLowerCase()) ||
            (aliases &&
              aliases.filter((alias) =>
                alias.toLowerCase().startsWith(query.toLowerCase())
              ).length !== 0)
        ),
      ({ item, editor }) => item.execute(editor)
    );

    this.plugin = suggestions.plugin;
    this.itemCallback = suggestions.itemCallback;
  }

  public onUpdate(
    callback: (state: SuggestionsMenuState<SlashMenuItem>) => void
  ) {
    return this.on("update", callback);
  }
}
