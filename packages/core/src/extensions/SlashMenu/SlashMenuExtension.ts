import { Extension } from "@tiptap/core";
import { createSuggestionPlugin } from "../../shared/plugins/suggestion/SuggestionPlugin";
import defaultCommands from "./defaultCommands";
import { SlashMenuItem } from "./SlashMenuItem";
import { PluginKey } from "prosemirror-state";

export type SlashMenuOptions = {
  commands: { [key: string]: SlashMenuItem };
};

export const SlashMenuPluginKey = new PluginKey("suggestions-slash-commands");

export const SlashMenuExtension = Extension.create<SlashMenuOptions>({
  name: "slash-command",

  addOptions() {
    return {
      commands: defaultCommands,
    };
  },

  addProseMirrorPlugins() {
    return [
      createSuggestionPlugin<SlashMenuItem>({
        pluginKey: SlashMenuPluginKey,
        editor: this.editor,
        char: "/",
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
