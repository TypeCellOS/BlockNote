import * as Y from "yjs";
import { ySyncPluginKey } from "y-prosemirror";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { ForkYDocExtension } from "./ForkYDoc.js";
import type {
  VersionStorage,
  VersionViewAdapter,
} from "../../extensions/Versioning/types.js";
import { createVersioningExtension } from "../../extensions/Versioning/Versioning.js";
import type { UserStoreOrResolver } from "../../user/index.js";
import { CollaborationExtension } from "./index.js";

/** Install history separately, using the editor's Yjs collaboration fragment. */
export function YjsVersioningExtension(options: {
  storage: VersionStorage<Uint8Array>;
  resolveUsers?: UserStoreOrResolver;
  scrollToFirstChange?: boolean;
}) {
  return createVersioningExtension((editor) => ({
    adapter: {
      supportsComparison: false,
      open() {
        const collaboration = editor.getExtension(CollaborationExtension);
        if (!collaboration) {
          throw new Error("Yjs versioning requires Yjs collaboration");
        }
        return createYjsVersionView(editor, collaboration.fragment).open();
      },
    },
    ...options,
  }))();
}

export function createYjsVersionView(
  editor: BlockNoteEditor,
  fragment: Y.XmlFragment,
): VersionViewAdapter<Uint8Array> {
  return {
    supportsComparison: false,
    open() {
      const fork = editor.getExtension(ForkYDocExtension);
      if (
        !fork ||
        fork.store.state.isForked ||
        ySyncPluginKey.getState(editor.prosemirrorState)?.type !== fragment
      ) {
        throw new Error(
          "Versioning requires an active live binding and an available fork",
        );
      }
      const current = {
        content: Y.encodeStateAsUpdate(fragment.doc!),
        capturedAt: Date.now(),
      };
      try {
        fork.fork();
      } catch (error) {
        fork.merge({ keepChanges: false });
        throw error;
      }
      let closed = false;
      return {
        current,
        show({ content }) {
          if (closed) {
            throw new Error("Version view is closed");
          }
          fork.replaceSnapshot(content);
        },
        close() {
          if (closed) {
            return;
          }
          fork.merge({ keepChanges: false });
          closed = true;
        },
      };
    },
  };
}
