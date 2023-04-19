import { Extension } from "@tiptap/core";
import { PluginKey } from "prosemirror-state";
import { BlockNoteEditor } from "../..";
import { FormattingToolbarFactory } from "./FormattingToolbarFactoryTypes";
import { createFormattingToolbarPlugin } from "./FormattingToolbarPlugin";

/**
 * The menu that is displayed when selecting a piece of text.
 */
export const FormattingToolbarExtension = Extension.create<{
  formattingToolbarFactory: FormattingToolbarFactory;
  editor: BlockNoteEditor;
}>({
  name: "FormattingToolbarExtension",

  addProseMirrorPlugins() {
    if (!this.options.formattingToolbarFactory || !this.options.editor) {
      throw new Error(
        "required args not defined for FormattingToolbarExtension"
      );
    }

    return [
      createFormattingToolbarPlugin({
        tiptapEditor: this.editor,
        editor: this.options.editor,
        formattingToolbarFactory: this.options.formattingToolbarFactory,
        pluginKey: new PluginKey("FormattingToolbarPlugin"),
      }),
    ];
  },
});
