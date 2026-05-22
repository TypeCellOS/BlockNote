import * as Y from "@y/y";
import {
  createExtension,
  createStore,
  ExtensionOptions,
} from "../../editor/BlockNoteExtension.js";
import { CollaborationOptions } from "./index.js";
import { YCursorExtension } from "./YCursorPlugin.js";
import { findTypeInOtherYdoc } from "../utils.js";
import { configureYProsemirror } from "@y/prosemirror";

export const ForkYDocExtension = createExtension(
  ({ editor, options }: ExtensionOptions<CollaborationOptions>) => {
    let forkedState:
      | {
          originalFragment: Y.Type;
          forkedFragment: Y.Type;
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
        // Copy the original document to a new Yjs document
        Y.applyUpdateV2(
          doc,
          initialUpdate ?? Y.encodeStateAsUpdateV2(originalFragment.doc!),
        );

        // Find the forked fragment in the new Yjs document
        const forkedFragment = findTypeInOtherYdoc(originalFragment, doc);

        forkedState = {
          originalFragment,
          forkedFragment,
        };

        // Need to reset all the yjs plugins
        editor.unregisterExtension([YCursorExtension]);
        editor.exec(configureYProsemirror({ ytype: forkedFragment }));

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

        const { originalFragment, forkedFragment } = forkedState;
        // Register the plugins again, based on the original fragment (which is still in the original options)
        editor.registerExtension([YCursorExtension(options)]);
        editor.exec(
          configureYProsemirror({
            ytype: originalFragment,
            attributionManager: options.attributionManager,
          }),
        );

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
