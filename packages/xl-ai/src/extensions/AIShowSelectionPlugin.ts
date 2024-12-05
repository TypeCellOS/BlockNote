import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

const PLUGIN_KEY = new PluginKey(`blocknote-ai-show-selection`);

export class AIShowSelectionPlugin {
  public readonly plugin: Plugin;

  public constructor() {
    this.plugin = new Plugin({
      key: PLUGIN_KEY,
      props: {
        decorations: (state) => {
          const { doc, selection } = state;

          const dec = Decoration.inline(selection.from, selection.to, {
            "data-ai-show-selection": "true",
          });

          return DecorationSet.create(doc, [dec]);
        },
      },
    });
  }
}
