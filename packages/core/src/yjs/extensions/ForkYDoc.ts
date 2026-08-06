import { yUndoPluginKey } from "y-prosemirror";
import * as Y from "yjs";
import {
  createExtension,
  createStore,
  ExtensionOptions,
} from "../../editor/BlockNoteExtension.js";
import type { CollaborationOptions } from "./index.js";
import { YCursorExtension } from "./YCursorPlugin.js";
import { YSyncExtension } from "./YSync.js";
import { YUndoExtension } from "./YUndo.js";
import { findTypeInOtherYdoc } from "../utils.js";

export const ForkYDocExtension = createExtension(
  ({ editor, options }: ExtensionOptions<CollaborationOptions>) => {
    let forkedState:
      | {
          originalFragment: Y.XmlFragment;
          undoStack: Y.UndoManager["undoStack"];
          forkedFragment: Y.XmlFragment;
        }
      | undefined = undefined;

    const store = createStore({ isForked: false });

    return {
      key: "yForkDoc",
      store,
      /**
       * Fork the Y.js document from syncing to the remote,
       * allowing modifications to the document without affecting the remote.
       * These changes can later be rolled back or applied to the remote.
       */
      fork({
        /**
         * The initial update to apply to the forked document.
         * If not provided, the current document state is used.
         */
        initialUpdate,
      }: {
        initialUpdate?: Uint8Array;
      } = {}) {
        if (forkedState) {
          return;
        }

        const originalFragment = options.fragment;

        if (!originalFragment) {
          throw new Error("No fragment to fork from");
        }

        const doc = new Y.Doc();
        // Copy the original document (or apply the provided update) to a new Yjs document
        Y.applyUpdate(
          doc,
          initialUpdate ?? Y.encodeStateAsUpdate(originalFragment.doc!),
        );

        // Find the forked fragment in the new Yjs document
        const forkedFragment = findTypeInOtherYdoc(originalFragment, doc);

        forkedState = {
          undoStack: yUndoPluginKey.getState(editor.prosemirrorState)!
            .undoManager.undoStack,
          originalFragment,
          forkedFragment,
        };

        const newOptions = {
          ...options,
          fragment: forkedFragment,
        };

        // Atomically swap the yjs plugins to avoid re-entrant dispatch issues
        // where y-prosemirror's view hooks can dispatch a transaction between
        // separate unregister/register calls, re-introducing stale plugins.
        editor.replaceExtension(
          ["ySync", "yCursor", "yUndo"],
          [
            YSyncExtension(newOptions),
            // No need to register the cursor plugin again, it's a local fork
            YUndoExtension(),
          ],
        );

        // Tell the store that the editor is now forked
        store.setState({ isForked: true });
      },

      /**
       * Resume syncing the Y.js document to the remote
       * If `keepChanges` is true, any changes that have been made to the forked document will be applied to the original document.
       * Otherwise, the original document will be restored and the changes will be discarded.
       */
      merge({ keepChanges }: { keepChanges: boolean }) {
        if (!forkedState) {
          return;
        }

        const { originalFragment, forkedFragment, undoStack } = forkedState;

        // Atomically swap the forked plugins back to the original ones
        editor.replaceExtension(
          ["ySync", "yCursor", "yUndo"],
          [
            YSyncExtension(options),
            YCursorExtension(options),
            YUndoExtension(),
          ],
        );

        // Reset the undo stack to the original undo stack
        yUndoPluginKey.getState(
          editor.prosemirrorState,
        )!.undoManager.undoStack = undoStack;

        if (keepChanges) {
          // Apply any changes that have been made to the fork, onto the original doc
          const update = Y.encodeStateAsUpdate(
            forkedFragment.doc!,
            Y.encodeStateVector(originalFragment.doc!),
          );
          // Applying this change will add to the undo stack, allowing it to be undone normally
          Y.applyUpdate(originalFragment.doc!, update, editor);
        }
        // Reset the forked state
        forkedState = undefined;
        // Tell the store that the editor is no longer forked
        store.setState({ isForked: false });
      },
    } as const;
  },
);
