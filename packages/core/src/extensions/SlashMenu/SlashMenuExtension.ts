import { Extension } from "@tiptap/core";
import { PluginKey } from "prosemirror-state";
import { createSuggestionPlugin } from "../../shared/plugins/suggestion/SuggestionPlugin";
import { SuggestionsMenuFactory } from "../../shared/plugins/suggestion/SuggestionsMenuFactoryTypes";
import { BaseSlashMenuItem } from "./BaseSlashMenuItem";
import { BlockNoteEditor } from "../../BlockNoteEditor";

export type SlashMenuOptions = {
  editor: BlockNoteEditor | undefined;
  commands: BaseSlashMenuItem[] | undefined;
  slashMenuFactory: SuggestionsMenuFactory<any> | undefined;
};

export const SlashMenuPluginKey = new PluginKey("suggestions-slash-commands");

export const SlashMenuExtension = Extension.create<SlashMenuOptions>({
  name: "slash-command",

  addOptions() {
    return {
      editor: undefined,
      commands: undefined,
      slashMenuFactory: undefined,
    };
  },

  addProseMirrorPlugins() {
    if (!this.options.slashMenuFactory || !this.options.commands) {
      throw new Error("required args not defined for SlashMenuExtension");
    }

    const commands = this.options.commands;

    return [
      createSuggestionPlugin<BaseSlashMenuItem>({
        pluginKey: SlashMenuPluginKey,
        editor: this.options.editor!,
        defaultTriggerCharacter: "/",
        suggestionsMenuFactory: this.options.slashMenuFactory!,
        items: (query) => {
          return commands.filter((cmd: BaseSlashMenuItem) => cmd.match(query));
        },
        onSelectItem: ({ item, editor }) => {
          item.execute(editor);
        },
      }),
    ];
  },
});
