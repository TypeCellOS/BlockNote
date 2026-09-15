import { Plugin, PluginKey } from "prosemirror-state";
import {
  createExtension,
  createStore,
  type ExtensionOptions,
} from "../../editor/BlockNoteExtension.js";

const PLUGIN_KEY = new PluginKey("bn-read-only");

/** Owns application editability and independent feature restrictions. */
export const ReadOnlyExtension = createExtension(
  ({
    editor,
    options,
  }: ExtensionOptions<{ editable?: boolean } | undefined>) => {
    const store = createStore(
      {
        applicationEditable: options?.editable ?? true,
        enabledSet: new Set<string>(),
      },
      {
        onUpdate(state, prevState) {
          if (
            (state.applicationEditable && state.enabledSet.size === 0) ===
            (prevState.applicationEditable && prevState.enabledSet.size === 0)
          ) {
            return;
          }
          const view = editor.prosemirrorView;
          if (view && !view.isDestroyed) {
            // Recompute plugin editability and notify UI subscribers without a
            // document change. Reuse any transaction already in progress.
            editor.transact((tr) => tr.setMeta("editable", true));
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
          props: {
            editable: () =>
              store.state.applicationEditable &&
              store.state.enabledSet.size === 0,
          },
        }),
      ],
      /** Set the application's preference without releasing feature restrictions. */
      setApplicationEditable(editable: boolean) {
        if (store.state.applicationEditable === editable) {
          return;
        }
        store.setState({ ...store.state, applicationEditable: editable });
      },
      /**
       * Enable or disable read-only mode for a feature identified by key.
       * Passing false releases only that feature's restriction; other features
       * and the application's editor.isEditable setting still apply.
       * Repeated calls with the same key are idempotent.
       */
      setReadOnly(readOnly: boolean, key: string) {
        store.setState({
          ...store.state,
          enabledSet: readOnly
            ? new Set([...store.state.enabledSet, key])
            : new Set([...store.state.enabledSet].filter((k) => k !== key)),
        });
      },
    } as const;
  },
);
