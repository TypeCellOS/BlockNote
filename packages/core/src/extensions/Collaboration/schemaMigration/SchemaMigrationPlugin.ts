import { Plugin, PluginKey } from "@tiptap/pm/state";
import { ySyncPluginKey } from "y-prosemirror";
import * as Y from "yjs";

import { BlockNoteExtension } from "../../../editor/BlockNoteExtension.js";
import migrationRules from "./migrationRules/index.js";

// This plugin allows us to update collaboration YDocs whenever BlockNote's
// underlying ProseMirror schema changes. The plugin reads the current Yjs
// fragment and dispatches additional transactions to the ProseMirror state, in
// case things are found in the fragment that don't adhere to the editor schema
// and need to be fixed. These fixes are defined as `MigrationRule`s within the
// `migrationRules` directory.
export class SchemaMigrationPlugin extends BlockNoteExtension {
  private migrationDone = false;

  public static key() {
    return "schemaMigrationPlugin";
  }

  constructor(fragment: Y.XmlFragment) {
    const pluginKey = new PluginKey(SchemaMigrationPlugin.key());

    super();
    this.addProsemirrorPlugin(
      new Plugin({
        key: pluginKey,
        appendTransaction: (transactions, _oldState, newState) => {
          if (this.migrationDone) {
            return undefined;
          }

          if (
            transactions.length !== 1 ||
            !transactions[0].getMeta(ySyncPluginKey)
          ) {
            return undefined;
          }

          const tr = newState.tr;
          for (const migrationRule of migrationRules) {
            migrationRule(fragment, tr);
          }

          this.migrationDone = true;

          return tr;
        },
      }),
    );
  }
}
