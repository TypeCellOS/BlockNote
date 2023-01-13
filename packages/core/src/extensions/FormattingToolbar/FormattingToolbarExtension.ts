import { Extension } from "@tiptap/core";
import { PluginKey } from "prosemirror-state";
import { FormattingToolbarFactory } from "./FormattingToolbarFactoryTypes";
import { createFormattingToolbarPlugin } from "./FormattingToolbarPlugin";

/**
 * The menu that is displayed when selecting a piece of text.
 */
export const FormattingToolbarExtension = Extension.create<{
  formattingToolbarFactory: FormattingToolbarFactory;
}>({
  name: "FormattingToolbarExtension",

  addProseMirrorPlugins() {
    if (!this.options.formattingToolbarFactory) {
      throw new Error(
        "UI Element factory not defined for FormattingToolbarExtension"
      );
    }

    return [
      createFormattingToolbarPlugin({
        editor: this.editor,
        formattingToolbarFactory: this.options.formattingToolbarFactory,
        pluginKey: new PluginKey("FormattingToolbarPlugin"),
      }),
    ];
  },
});
