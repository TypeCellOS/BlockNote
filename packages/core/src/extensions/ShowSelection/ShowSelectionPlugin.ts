import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { BlockNoteExtension } from "../../editor/BlockNoteExtension.js";

const PLUGIN_KEY = new PluginKey(`blocknote-show-selection`);

/**
 * Plugin that shows adds a decoration around the current selection
 * This can be used to highlight the current selection in the UI even when the
 * text editor is not focused.
 */
export class ShowSelectionPlugin extends BlockNoteExtension {
  public static key() {
    return "showSelection";
  }

  private enabled = false;

  public constructor(private readonly editor: BlockNoteEditor<any, any, any>) {
    super();
    this.addProsemirrorPlugin(
      new Plugin({
        key: PLUGIN_KEY,
        props: {
          decorations: (state) => {
            const { doc, selection } = state;

            if (!this.enabled) {
              return DecorationSet.empty;
            }

            const dec = Decoration.inline(selection.from, selection.to, {
              "data-show-selection": "true",
            });

            return DecorationSet.create(doc, [dec]);
          },
        },
      }),
    );
  }

  public setEnabled(enabled: boolean) {
    if (this.enabled === enabled) {
      return;
    }

    this.enabled = enabled;

    this.editor.transact((tr) => tr.setMeta(PLUGIN_KEY, {}));
  }

  public getEnabled() {
    return this.enabled;
  }
}
