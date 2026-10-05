import { ySyncPluginKey, yUndoPluginKey } from "y-prosemirror";
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
          redoStack: Y.UndoManager["redoStack"];
          forkedFragment: Y.XmlFragment;
          cursor: ReturnType<ReturnType<typeof YCursorExtension>> | undefined;
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

        const originalUndoManager = yUndoPluginKey.getState(
          editor.prosemirrorState,
        )!.undoManager;
        forkedState = {
          undoStack: originalUndoManager.undoStack,
          redoStack: originalUndoManager.redoStack,
          originalFragment,
          forkedFragment,
          cursor: editor.getExtension(YCursorExtension),
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
          { resetPluginStateFor: [ySyncPluginKey, yUndoPluginKey] },
        );
        options.provider?.awareness?.setLocalStateField("cursor", null);

        // Tell the store that the editor is now forked
        store.setState({ isForked: true });
      },

      /** Replace only the local fork, retaining live restoration state. */
      replaceSnapshot(initialUpdate: Uint8Array) {
        if (!forkedState) {
          throw new Error("Replacing a snapshot requires a forked document");
        }
        const doc = new Y.Doc();
        Y.applyUpdate(doc, initialUpdate);
        const fragment = findTypeInOtherYdoc(forkedState.originalFragment, doc);
        const oldDoc = forkedState.forkedFragment.doc;
        editor.replaceExtension(
          ["ySync", "yUndo"],
          [YSyncExtension({ ...options, fragment }), YUndoExtension()],
          { resetPluginStateFor: [ySyncPluginKey, yUndoPluginKey] },
        );
        forkedState.forkedFragment = fragment;
        oldDoc?.destroy();
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

        const {
          originalFragment,
          forkedFragment,
          undoStack,
          redoStack,
          cursor,
        } = forkedState;

        // Atomically swap the forked plugins back to the original ones
        editor.replaceExtension(
          ["ySync", "yCursor", "yUndo"],
          [
            YSyncExtension(options),
            ...(cursor ? [cursor] : []),
            YUndoExtension(),
          ],
          { resetPluginStateFor: [ySyncPluginKey, yUndoPluginKey] },
        );
        // Restore history saved before forking onto the new original-doc manager.
        const undoManager = yUndoPluginKey.getState(
          editor.prosemirrorState,
        )!.undoManager;
        undoManager.undoStack = undoStack;
        undoManager.redoStack = redoStack;

        if (keepChanges) {
          // Apply any changes that have been made to the fork, onto the original doc
          const update = Y.encodeStateAsUpdate(
            forkedFragment.doc!,
            Y.encodeStateVector(originalFragment.doc!),
          );
          // Keep the existing editor origin for the merged update.
          Y.applyUpdate(originalFragment.doc!, update, editor);
        }
        // Reset the forked state
        forkedState = undefined;
        forkedFragment.doc!.destroy();
        // Tell the store that the editor is no longer forked
        store.setState({ isForked: false });
      },
    } as const;
  },
);
