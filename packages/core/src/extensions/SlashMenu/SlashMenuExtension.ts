import { Extension } from "@tiptap/core";
import { createSuggestionPlugin } from "../../shared/plugins/suggestion/SuggestionPlugin";
import defaultCommands from "./defaultCommands";
import { SlashMenuItem } from "./SlashMenuItem";

export type SlashMenuOptions = {
  commands: { [key: string]: SlashMenuItem };
};

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
        pluginName: "slash-commands",
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
