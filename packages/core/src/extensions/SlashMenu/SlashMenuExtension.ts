import { Extension } from "@tiptap/core";
import { Node } from "prosemirror-model";
import { PluginKey } from "prosemirror-state";
import { createSuggestionPlugin } from "../../shared/plugins/suggestion/SuggestionPlugin";
import { SuggestionsMenuFactory } from "../../shared/plugins/suggestion/SuggestionsMenuFactoryTypes";
import { BaseSlashMenuItem } from "./BaseSlashMenuItem";
import { EditorFunctions } from "../../api/EditorFunctions";
import { Block } from "../Blocks/api/blockTypes";

export type SlashMenuOptions = {
  blockCache: WeakMap<Node, Block> | undefined;
  commands: BaseSlashMenuItem[] | undefined;
  slashMenuFactory: SuggestionsMenuFactory<any> | undefined;
};

export const SlashMenuPluginKey = new PluginKey("suggestions-slash-commands");

export const SlashMenuExtension = Extension.create<SlashMenuOptions>({
  name: "slash-command",

  addOptions() {
    return {
      blockCache: undefined,
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
        editor: this.editor,
        editorFunctions: new EditorFunctions(
          this.editor,
          this.options.blockCache!
        ),
        defaultTriggerCharacter: "/",
        suggestionsMenuFactory: this.options.slashMenuFactory!,
        items: (query) => {
          return commands.filter((cmd: BaseSlashMenuItem) => cmd.match(query));
        },
        onSelectItem: ({ item, editorFunctions }) => {
          item.execute(editorFunctions);
        },
      }),
    ];
  },
});
