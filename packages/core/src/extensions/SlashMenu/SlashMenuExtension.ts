import { Extension } from "@tiptap/core";
import { PluginKey } from "prosemirror-state";
import { createSuggestionPlugin } from "../../shared/plugins/suggestion/SuggestionPlugin";
import { SuggestionsMenuFactory } from "../../shared/plugins/suggestion/SuggestionsMenuFactoryTypes";
import { SlashMenuItem } from "./SlashMenuItem";

export type SlashMenuOptions = {
  commands: SlashMenuItem[] | undefined;
  slashMenuFactory: SuggestionsMenuFactory<any> | undefined;
};

export const SlashMenuPluginKey = new PluginKey("suggestions-slash-commands");

export const SlashMenuExtension = Extension.create<SlashMenuOptions>({
  name: "slash-command",

  addOptions() {
    return {
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
      createSuggestionPlugin<SlashMenuItem>({
        pluginKey: SlashMenuPluginKey,
        editor: this.editor,
        defaultTriggerCharacter: "/",
        suggestionsMenuFactory: this.options.slashMenuFactory!,
        items: (query) => {
          return commands.filter((cmd: SlashMenuItem) => cmd.match(query));
        },
        onSelectItem: ({ item, editor, range }) => {
          item.execute(editor, range);
        },
      }),
    ];
  },
});
