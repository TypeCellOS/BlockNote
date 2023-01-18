import { Extension } from "@tiptap/core";
import { PluginKey } from "prosemirror-state";
import { createSuggestionPlugin } from "../../shared/plugins/suggestion/SuggestionPlugin";
import { SuggestionsMenuFactory } from "../../shared/plugins/suggestion/SuggestionsMenuFactoryTypes";
import defaultCommands from "./defaultCommands";
import { SlashMenuItem } from "./SlashMenuItem";

export type SlashMenuOptions = {
  commands: { [key: string]: SlashMenuItem };
  slashMenuFactory: SuggestionsMenuFactory<any> | undefined;
};

export const SlashMenuPluginKey = new PluginKey("suggestions-slash-commands");

export const SlashMenuExtension = Extension.create<SlashMenuOptions>({
  name: "slash-command",

  addOptions() {
    return {
      commands: defaultCommands,
      slashMenuFactory: undefined, // TODO: fix undefined
    };
  },

  addProseMirrorPlugins() {
    if (!this.options.slashMenuFactory) {
      throw new Error("UI Element factory not defined for SlashMenuExtension");
    }

    return [
      createSuggestionPlugin<SlashMenuItem>({
        pluginKey: SlashMenuPluginKey,
        editor: this.editor,
        char: "/",
        suggestionsMenuFactory: this.options.slashMenuFactory!,
        items: (query) => {
          const commands = [];

          for (const key in this.options.commands) {
            commands.push(this.options.commands[key]);
          }

          return commands.filter((cmd: SlashMenuItem) => cmd.match(query));
        },
        onSelectItem: ({ item, editor, range }) => {
          item.execute(editor, range);
        },
      }),
    ];
  },
});
