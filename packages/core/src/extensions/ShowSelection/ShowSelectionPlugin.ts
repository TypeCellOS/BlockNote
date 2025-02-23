import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";

const PLUGIN_KEY = new PluginKey(`blocknote-show-selection`);

/**
 * Plugin that shows adds a decoration around the current selection
 * This can be used to highlight the current selection in the UI even when the
 * text editor is not focused.
 */
export class ShowSelectionPlugin {
  public readonly plugin: Plugin;
  private forceSelectionVisible = false;

  public constructor(private readonly editor: BlockNoteEditor<any, any, any>) {
    this.plugin = new Plugin({
      key: PLUGIN_KEY,
      props: {
        decorations: (state) => {
          const { doc, selection } = state;

          if (!this.forceSelectionVisible) {
            return DecorationSet.empty;
          }

          const dec = Decoration.inline(selection.from, selection.to, {
            "data-show-selection": "true",
          });

          return DecorationSet.create(doc, [dec]);
        },
      },
    });
  }

  public set ForceSelectionVisible(forceSelectionVisible: boolean) {
    if (this.forceSelectionVisible === forceSelectionVisible) {
      return;
    }

    this.forceSelectionVisible = forceSelectionVisible;

    this.editor.prosemirrorView?.dispatch(
      this.editor.prosemirrorView?.state.tr.setMeta(PLUGIN_KEY, {})
    );
  }

  public get ForceSelectionVisible() {
    return this.forceSelectionVisible;
  }
}
