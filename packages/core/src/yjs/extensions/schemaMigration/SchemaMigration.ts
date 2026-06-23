import { Plugin, PluginKey } from "@tiptap/pm/state";
import * as Y from "yjs";

import {
  createExtension,
  ExtensionOptions,
} from "../../../editor/BlockNoteExtension.js";
import migrationRules, {
  preSyncMigrationRules,
} from "./migrationRules/index.js";

// This plugin allows us to update collaboration YDocs whenever BlockNote's
// underlying ProseMirror schema changes. There are two kinds of migration:
//
// - Pre-sync (`preSyncMigrationRules`): mutate the Yjs fragment directly and
//   must run BEFORE y-prosemirror reconstructs the document. This is required
//   when invalid content would make y-prosemirror reject a node — its error
//   handler DELETES the whole node from the Yjs doc (propagating the deletion
//   to all peers), so the fragment has to be fixed first.
// - Post-sync (`migrationRules`): repair the reconstructed ProseMirror document
//   via an appended transaction, for changes where the node survives sync.
export const SchemaMigration = createExtension(
  ({ editor, options }: ExtensionOptions<{ fragment: Y.XmlFragment }>) => {
    const { fragment } = options;
    const blockSchema = editor.schema.blockSchema;

    // Runs the pre-sync rules over the whole fragment. Safe to call repeatedly:
    // the rules are no-ops once the fragment is clean, so the transaction they
    // run in produces no change (and thus doesn't re-trigger the observer).
    const runPreSyncMigrations = () => {
      fragment.doc?.transact(() => {
        for (const rule of preSyncMigrationRules) {
          rule(fragment, blockSchema);
        }
      });
    };
    // `unobserveDeep` is a no-op if the observer isn't (or is no longer)
    // registered, so this is safe to call more than once.
    const stopPreSyncObserver = () =>
      fragment.unobserveDeep(runPreSyncMigrations);

    // 1. Migrate content that's already present before the editor mounts (e.g.
    //    a document loaded from a database). `observeDeep` only fires on later
    //    changes, so existing content has to be handled explicitly here.
    if (fragment.firstChild) {
      runPreSyncMigrations();
    }
    // 2. Migrate content that streams in from a provider after mount. Registered
    //    here — in the extension factory, before the editor mounts — so it runs
    //    before y-prosemirror's own observer and can clean the fragment first.
    //    Removed once migration is done (see `appendTransaction`).
    fragment.observeDeep(runPreSyncMigrations);

    let migrationDone = false;
    const pluginKey = new PluginKey("schemaMigration");

    return {
      key: "schemaMigration",
      prosemirrorPlugins: [
        new Plugin({
          key: pluginKey,
          view: () => ({
            // Safety net: stop observing if the editor is destroyed before any
            // content ever synced in (so `migrationDone` was never reached).
            destroy: stopPreSyncObserver,
          }),
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
            // The initial document has now synced in and been migrated by the
            // pre-sync observer (which runs before this, during the y-sync). New
            // edits can't introduce content the schema rejects, so the observer
            // is no longer needed — stop it instead of running on every later
            // transaction. (Like the post-sync migration, this is one-shot:
            // disallowed content arriving from an old-version peer *after* the
            // first sync would not be re-migrated.)
            stopPreSyncObserver();

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
