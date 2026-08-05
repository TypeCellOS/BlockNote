import { Plugin, PluginKey } from "@tiptap/pm/state";
import * as Y from "yjs";

import {
  createExtension,
  ExtensionOptions,
} from "../../../editor/BlockNoteExtension.js";
import migrationRules from "./migrationRules/index.js";

// This plugin allows us to update collaboration YDocs whenever BlockNote's
// underlying ProseMirror schema changes. The plugin reads the current Yjs
// fragment and dispatches additional transactions to the ProseMirror state, in
// case things are found in the fragment that don't adhere to the editor schema
// and need to be fixed. These fixes are defined as `MigrationRule`s within the
// `migrationRules` directory.
export const SchemaMigration = createExtension(
  ({ options }: ExtensionOptions<{ fragment: Y.XmlFragment }>) => {
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
              // If any of the transactions are not due to a yjs sync, we don't need to run the migration
              !transactions.some((tr) => tr.getMeta("y-sync$")) ||
              // If none of the transactions result in a document change, we don't need to run the migration
              transactions.every((tr) => !tr.docChanged) ||
              // If the fragment is still empty, we can't run the migration (since it has not yet been applied to the Y.Doc)
              !options.fragment.firstChild
            ) {
              return undefined;
            }

            const tr = newState.tr;
            for (const migrationRule of migrationRules) {
              migrationRule(options.fragment, tr);
            }

            migrationDone = true;

            if (!tr.docChanged) {
              return undefined;
            }

            return tr;
          },
        }),
      ],
    } as const;
  },
);
