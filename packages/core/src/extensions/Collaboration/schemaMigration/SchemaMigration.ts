import { Plugin, PluginKey } from "@tiptap/pm/state";
import { ySyncPluginKey } from "y-prosemirror";
import * as Y from "yjs";

import { createExtension } from "../../../editor/BlockNoteExtension.js";
import migrationRules from "./migrationRules/index.js";

// This plugin allows us to update collaboration YDocs whenever BlockNote's
// underlying ProseMirror schema changes. The plugin reads the current Yjs
// fragment and dispatches additional transactions to the ProseMirror state, in
// case things are found in the fragment that don't adhere to the editor schema
// and need to be fixed. These fixes are defined as `MigrationRule`s within the
// `migrationRules` directory.
export const SchemaMigration = createExtension((_editor, options) => {
  const fragment = (options as any)?.collaboration?.fragment as
    | Y.XmlFragment
    | undefined;

  if (!fragment) {
    return;
  }

  let migrationDone = false;
  const pluginKey = new PluginKey("schemaMigration");

  return {
    key: "schemaMigration",
    prosemirrorPlugins: [
      new Plugin({
        key: pluginKey,
        appendTransaction: (transactions, _oldState, newState) => {
          if (migrationDone) {
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

          migrationDone = true;
          return tr;
        },
      }),
    ],
  } as const;
});
