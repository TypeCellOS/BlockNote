import { Plugin, PluginKey } from "@tiptap/pm/state";
import * as Y from "yjs";

import migrationRules from "./migrationRules/index.js";
import { BlockNoteExtension } from "../../../editor/BlockNoteExtension.js";
import { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";

// This plugin allows us to update collaboration YDocs whenever BlockNote's
// underlying ProseMirror schema changes. The plugin reads the current Yjs
// fragment and dispatches additional transactions to the ProseMirror state, in
// case things are found in the fragment that don't adhere to the editor schema
// and need to be fixed. These fixes are defined as `MigrationRule`s within the
// `migrationRules` directory.
export class SchemaMigrationPlugin extends BlockNoteExtension {
  public static key() {
    return "schemaMigrationPlugin";
  }

  constructor(editor: BlockNoteEditor<any, any, any>) {
    const pluginKey = new PluginKey(SchemaMigrationPlugin.key());

    super();
    this.addProsemirrorPlugin(
      new Plugin({
        key: pluginKey,
        // Plugin state used to ensure the migration transactions only run
        // once, when the initial fragment is loaded.
        state: {
          init: () => ({ migrationDone: false }),
          apply: (tr, oldPluginState) => {
            const newPluginState = tr.getMeta(pluginKey);
            if (newPluginState) {
              return newPluginState;
            }

            return oldPluginState;
          },
        },
        appendTransaction: (transactions, _oldState, newState) => {
          if (pluginKey.getState(newState).migrationDone) {
            return undefined;
          }

          const ySyncPlugin: Plugin<{ doc: Y.XmlFragment["doc"] }> | undefined =
            (editor.extensions["ySyncPlugin"] as BlockNoteExtension | undefined)
              ?.plugins[0];
          if (!ySyncPlugin) {
            return undefined;
          }

          if (
            transactions.length !== 1 ||
            !transactions[0].getMeta(ySyncPlugin)
          ) {
            return undefined;
          }

          const fragment = editor.collaboration?.fragment;
          if (!fragment) {
            return undefined;
          }

          const tr = newState.tr;
          for (const migrationRule of migrationRules) {
            migrationRule(fragment, tr);
          }
          tr.setMeta(pluginKey, { migrationDone: true });

          return tr;
        },
      }),
    );
  }
}
