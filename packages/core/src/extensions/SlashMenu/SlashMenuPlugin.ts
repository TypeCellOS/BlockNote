import { Plugin, PluginKey } from "prosemirror-state";

import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import {
  SuggestionsMenuState,
  setupSuggestionsMenu,
} from "../../extensions-shared/suggestion/SuggestionPlugin";
import { BlockSchema, InlineContentSchema, StyleSchema } from "../../schema";
import { EventEmitter } from "../../util/EventEmitter";
import { BaseSlashMenuItem } from "./BaseSlashMenuItem";

export const slashMenuPluginKey = new PluginKey("SlashMenuPlugin");

export class SlashMenuProsemirrorPlugin<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
  SlashMenuItem extends BaseSlashMenuItem<BSchema, I, S>
> extends EventEmitter<any> {
  public readonly plugin: Plugin;
  public readonly executeItem: (item: SlashMenuItem) => void;
  public readonly closeMenu: () => void;
  public readonly clearQuery: () => void;

  constructor(
    editor: BlockNoteEditor<BSchema, I, S>,
    getItems: (query: string) => Promise<SlashMenuItem[]>
  ) {
    super();
    const suggestions = setupSuggestionsMenu<SlashMenuItem, BSchema, I, S>(
      editor,
      (state) => {
        this.emit("update", state);
      },
      slashMenuPluginKey,
      "/",
      getItems,
      ({ item, editor }) => item.execute(editor)
    );

    this.plugin = suggestions.plugin;
    this.executeItem = suggestions.executeItem;
    this.closeMenu = suggestions.closeMenu;
    this.clearQuery = suggestions.clearQuery;
  }

  public onUpdate(
    callback: (state: SuggestionsMenuState<SlashMenuItem>) => void
  ) {
    return this.on("update", callback);
  }
}
