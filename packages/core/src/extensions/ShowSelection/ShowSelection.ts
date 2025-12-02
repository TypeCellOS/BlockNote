import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import {
  createExtension,
  createStore,
} from "../../editor/BlockNoteExtension.js";

const PLUGIN_KEY = new PluginKey(`blocknote-show-selection`);

/**
 * Plugin that shows adds a decoration around the current selection
 * This can be used to highlight the current selection in the UI even when the
 * text editor is not focused.
 */
export const ShowSelectionExtension = createExtension(({ editor }) => {
  const store = createStore(
    { enabled: false },
    {
      onUpdate() {
        editor.transact((tr) => tr.setMeta(PLUGIN_KEY, {}));
      },
    },
  );
  return {
    key: "showSelection",
    store,
    prosemirrorPlugins: [
      new Plugin({
        key: PLUGIN_KEY,
        props: {
          decorations: (state) => {
            const { doc, selection } = state;
            if (!store.state.enabled) {
              return DecorationSet.empty;
            }
            const dec = Decoration.inline(selection.from, selection.to, {
              "data-show-selection": "true",
            });
            return DecorationSet.create(doc, [dec]);
          },
        },
      }),
    ],
    /**
     * Show or hide the selection decoration
     */
    showSelection(shouldShow: boolean) {
      store.setState({ enabled: shouldShow });
    },
  } as const;
});
