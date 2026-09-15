import { Plugin, PluginKey } from "prosemirror-state";
import {
  createExtension,
  createStore,
} from "../../editor/BlockNoteExtension.js";

const PLUGIN_KEY = new PluginKey("bn-read-only");

/** Temporarily prevent editing without changing the application's editable setting. */
export const ReadOnlyExtension = createExtension(({ editor }) => {
  const store = createStore(
    { enabledSet: new Set<string>() },
    {
      onUpdate(state, prevState) {
        if (
          (state.enabledSet.size === 0) ===
          (prevState.enabledSet.size === 0)
        ) {
          return;
        }
        const view = editor.prosemirrorView;
        if (view && !view.isDestroyed) {
          // Recompute plugin editability and notify UI subscribers without a
          // document change. Reuse any transaction already in progress.
          editor.transact((tr) => tr.setMeta(PLUGIN_KEY, {}));
        }
      },
    },
  );

  return {
    key: "readOnly",
    store,
    prosemirrorPlugins: [
      new Plugin({
        key: PLUGIN_KEY,
        props: { editable: () => store.state.enabledSet.size === 0 },
      }),
    ],
    /**
     * Enable or disable read-only mode for a feature identified by key.
     * Passing false releases only that feature's restriction; other features
     * and the application's editor.isEditable setting still apply.
     * Repeated calls with the same key are idempotent.
     */
    setReadOnly(readOnly: boolean, key: string) {
      store.setState({
        enabledSet: readOnly
          ? new Set([...store.state.enabledSet, key])
          : new Set([...store.state.enabledSet].filter((k) => k !== key)),
      });
    },
  } as const;
});
