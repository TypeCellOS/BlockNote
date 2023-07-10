// import { Extension } from "@tiptap/core";
// import { PluginKey } from "prosemirror-state";
// import { BlockNoteEditor } from "../../BlockNoteEditor";
// import { createSuggestionPlugin } from "../../shared/plugins/suggestion/SuggestionPlugin";
// import { BlockSchema } from "../Blocks/api/blockTypes";
// import { BaseSlashMenuItem } from "./BaseSlashMenuItem";
//
// export type SlashMenuOptions<BSchema extends BlockSchema> = {
//   editor: BlockNoteEditor<BSchema> | undefined;
//   commands: BaseSlashMenuItem<BSchema>[] | undefined;
//   onUpdate: any; //SuggestionsMenuFactory<any> | undefined;
// };
//
// export const SlashMenuPluginKey = new PluginKey("suggestions-slash-commands");
//
// export const createSlashMenuExtension = <BSchema extends BlockSchema>() =>
//   Extension.create<SlashMenuOptions<BSchema>>({
//     name: "slash-command",
//
//     addOptions() {
//       return {
//         editor: undefined,
//         commands: undefined,
//         onUpdate: undefined,
//       };
//     },
//
//     addProseMirrorPlugins() {
//       if (!this.options.onUpdate || !this.options.commands) {
//         throw new Error("required args not defined for SlashMenuExtension");
//       }
//
//       const commands = this.options.commands;
//
//       return [
//         createSuggestionPlugin<BaseSlashMenuItem<BSchema>, BSchema>(
//           "SlashMenuPlugin",
//           "/",
//           this.options.editor!,
//           this.options.onUpdate!,
//           ({ item, editor }) => {
//             item.execute(editor);
//           },
//           (query) => {
//             return commands.filter((cmd: BaseSlashMenuItem<BSchema>) =>
//               cmd.match(query)
//             );
//           }
//         ),
//       ];
//     },
//   });
