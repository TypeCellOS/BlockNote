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
import type { DiffVersioningExtension } from "../../y/extensions/DiffVersioningExtension.js";
import { findTypeInOtherYdoc, yXmlFragmentToBlocks } from "../utils.js";
import type {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../schema/index.js";

/**
 * Install history separately, using the editor's Yjs collaboration fragment.
 * Register DiffVersioningExtension from `@blocknote/core/y` to opt into
 * content comparisons. Diffs mark changes, not their original authors.
 */
export function YjsVersioningExtension(options: {
  storage: VersionStorage<Uint8Array>;
  resolveUsers?: UserStoreOrResolver;
  scrollToFirstChange?: boolean;
}) {
  return createVersioningExtension((editor) => ({
    adapter: {
      get supportsComparison() {
        return editor.getExtension("diffVersioning") !== undefined;
      },
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

export function createYjsVersionView<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
>(
  editor: BlockNoteEditor<BSchema, ISchema, SSchema>,
  fragment: Y.XmlFragment,
): VersionViewAdapter<Uint8Array> {
  return {
    get supportsComparison() {
      return editor.getExtension("diffVersioning") !== undefined;
    },
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
        show({ content, comparison }) {
          if (closed) {
            throw new Error("Version view is closed");
          }
          fork.replaceSnapshot(content);
          if (comparison) {
            const diff =
              editor.getExtension<typeof DiffVersioningExtension>(
                "diffVersioning",
              );
            if (!diff) {
              throw new Error("Version comparison requires a diff renderer");
            }
            function blocksFromUpdate(update: Uint8Array) {
              const doc = new Y.Doc();
              try {
                Y.applyUpdate(doc, update);
                return yXmlFragmentToBlocks(
                  editor,
                  findTypeInOtherYdoc(fragment, doc),
                );
              } finally {
                doc.destroy();
              }
            }
            // The binding points at a disposable fork. Any rendered suggestion
            // marks stay there and are discarded when switching or closing.
            diff.renderDiff(
              blocksFromUpdate(content),
              blocksFromUpdate(comparison.content),
            );
          }
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
