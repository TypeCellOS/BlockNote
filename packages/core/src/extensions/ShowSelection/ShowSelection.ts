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
    { enabledSet: new Set<string>() },
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
            if (store.state.enabledSet.size === 0) {
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
     *
     * @param shouldShow - Whether to show the selection decoration
     * @param key - The key of the selection to show or hide,
     * this is necessary to prevent disabling ShowSelection from one place
     * will interfere with other parts of the code that need to show the selection decoration
     * (e.g.: CreateLinkButton and AIExtension)
     */
    showSelection(shouldShow: boolean, key: string) {
      store.setState({
        enabledSet: shouldShow
          ? new Set([...store.state.enabledSet, key])
          : new Set([...store.state.enabledSet].filter((k) => k !== key)),
      });
    },
  } as const;
});
