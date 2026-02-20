import { yUndoPluginKey } from "y-prosemirror";
import * as Y from "yjs";
import {
  createExtension,
  createStore,
  ExtensionOptions,
} from "../../editor/BlockNoteExtension.js";
import { CollaborationOptions } from "./Collaboration.js";
import { YCursorExtension } from "./YCursorPlugin.js";
import { YSyncExtension } from "./YSync.js";
import { YUndoExtension } from "./YUndo.js";

/**
 * To find a fragment in another ydoc, we need to search for it.
 */
function findTypeInOtherYdoc<T extends Y.AbstractType<any>>(
  ytype: T,
  otherYdoc: Y.Doc,
): T {
  const ydoc = ytype.doc!;
  if (ytype._item === null) {
    /**
     * If is a root type, we need to find the root key in the original ydoc
     * and use it to get the type in the other ydoc.
     */
    const rootKey = Array.from(ydoc.share.keys()).find(
      (key) => ydoc.share.get(key) === ytype,
    );
    if (rootKey == null) {
      throw new Error("type does not exist in other ydoc");
    }
    return otherYdoc.get(rootKey, ytype.constructor as new () => T) as T;
  } else {
    /**
     * If it is a sub type, we use the item id to find the history type.
     */
    const ytypeItem = ytype._item;
    const otherStructs = otherYdoc.store.clients.get(ytypeItem.id.client) ?? [];
    const itemIndex = Y.findIndexSS(otherStructs, ytypeItem.id.clock);
    const otherItem = otherStructs[itemIndex] as Y.Item;
    const otherContent = otherItem.content as Y.ContentType;
    return otherContent.type as T;
  }
}

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
      fork() {
        if (forkedState) {
          return;
        }

        const originalFragment = options.fragment;

        if (!originalFragment) {
          throw new Error("No fragment to fork from");
        }

        const doc = new Y.Doc();
        // Copy the original document to a new Yjs document
        Y.applyUpdate(doc, Y.encodeStateAsUpdate(originalFragment.doc!));

        // Find the forked fragment in the new Yjs document
        const forkedFragment = findTypeInOtherYdoc(originalFragment, doc);

        forkedState = {
          undoStack: yUndoPluginKey.getState(editor.prosemirrorState)!
            .undoManager.undoStack,
          originalFragment,
          forkedFragment,
        };

        // Need to reset all the yjs plugins
        editor.unregisterExtension([
          YUndoExtension,
          YCursorExtension,
          YSyncExtension,
        ]);
        const newOptions = {
          ...options,
          fragment: forkedFragment,
        };
        // Register them again, based on the new forked fragment
        editor.registerExtension([
          YSyncExtension(newOptions),
          // No need to register the cursor plugin again, it's a local fork
          YUndoExtension(),
        ]);

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
        // Remove the forked fragment's plugins
        editor.unregisterExtension(["ySync", "yCursor", "yUndo"]);

        const { originalFragment, forkedFragment, undoStack } = forkedState;
        // Register the plugins again, based on the original fragment (which is still in the original options)
        editor.registerExtension([
          YSyncExtension(options),
          YCursorExtension(options),
          YUndoExtension(),
        ]);

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
