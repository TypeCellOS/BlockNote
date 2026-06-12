import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import type { Block } from "../../blocks/defaultBlocks.js";
import type {
  PreviewController,
  VersioningEndpoints,
  VersioningExtensionOptions,
  VersionSnapshot,
} from "./Versioning.js";
import { sortSnapshotsNewestFirst } from "./Versioning.js";

// ---------------------------------------------------------------------------
// Preview Controller
// ---------------------------------------------------------------------------

/**
 * Create a {@link PreviewController} that swaps the BlockNote document in and
 * out using `editor.replaceBlocks`.
 *
 * When entering preview mode the current document is saved so it can be
 * restored on exit. Successive `enterPreview` calls without an intervening
 * `exitPreview` preserve the original saved document.
 */
export function createInMemoryPreviewController(
  editor: BlockNoteEditor<any, any, any>,
): PreviewController<Block<any, any, any>[]> {
  let savedDoc: Block<any, any, any>[] | undefined;

  const replaceDoc = (blocks: Block<any, any, any>[]) => {
    editor.replaceBlocks(editor.document, blocks);
  };

  return {
    enterPreview(snapshotContent: Block<any, any, any>[], _compareToContent?: Block<any, any, any>[]) {
      // Save the live doc on first enter (successive enters keep the original).
      if (savedDoc === undefined) {
        savedDoc = editor.document;
      }
      replaceDoc(snapshotContent);
    },

    exitPreview() {
      if (savedDoc !== undefined) {
        replaceDoc(savedDoc);
        savedDoc = undefined;
      }
    },

    applyRestore(snapshotContent: Block<any, any, any>[]) {
      replaceDoc(snapshotContent);
      // Clear saved doc — the restored content is now the live document.
      savedDoc = undefined;
    },
  };
}

// ---------------------------------------------------------------------------
// Endpoints (in-memory storage)
// ---------------------------------------------------------------------------

/**
 * Create a {@link VersioningEndpoints} that stores snapshots entirely in
 * memory.  Useful for local-only / non-collaborative editors where you want
 * versioning without any persistence layer.
 *
 * Snapshots are stored as BlockNote document JSON (`Block[]`).
 */
export function createInMemoryVersioningEndpoints(): VersioningEndpoints<
  Block<any, any, any>[],
  Block<any, any, any>[]
> {
  const snapshots: VersionSnapshot[] = [];
  const contents = new Map<string, Block<any, any, any>[]>();
  let nextId = 1;

  return {
    async list() {
      return sortSnapshotsNewestFirst([...snapshots]);
    },

    async create(currentDoc, options) {
      const now = Date.now();
      const id = String(nextId++);
      const snapshot: VersionSnapshot = {
        id,
        name: options?.name,
        createdAt: now,
        updatedAt: now,
      };
      snapshots.push(snapshot);
      contents.set(id, structuredClone(currentDoc));
      return snapshot;
    },

    async restore(currentDoc, id) {
      const snapshotContent = contents.get(id);
      if (!snapshotContent) {
        throw new Error(`Snapshot ${id} not found`);
      }

      // Create a "Restored from …" snapshot of the current state before
      // restoring, so the user can undo the restore.
      const now = Date.now();
      const backupId = String(nextId++);
      const backup: VersionSnapshot = {
        id: backupId,
        name: "Before restore",
        createdAt: now,
        updatedAt: now,
        restoredFromSnapshotId: id,
      };
      snapshots.push(backup);
      contents.set(backupId, structuredClone(currentDoc));

      return structuredClone(snapshotContent);
    },

    async getContent(id) {
      const content = contents.get(id);
      if (!content) {
        throw new Error(`Snapshot ${id} not found`);
      }
      return structuredClone(content);
    },

    async updateSnapshotName(id, name) {
      const snapshot = snapshots.find((s) => s.id === id);
      if (!snapshot) {
        throw new Error(`Snapshot ${id} not found`);
      }
      snapshot.name = name;
      snapshot.updatedAt = Date.now();
    },
  };
}

// ---------------------------------------------------------------------------
// Adapter (convenience)
// ---------------------------------------------------------------------------

/**
 * Create all the options needed to wire a {@link VersioningExtension} with
 * fully in-memory storage and BlockNote JSON-based preview.
 *
 * @example
 * ```ts
 * import { VersioningExtension } from "@blocknote/core/extensions";
 * import { createInMemoryVersioningAdapter } from "@blocknote/core/extensions";
 *
 * const editor = BlockNoteEditor.create({
 *   extensions: [
 *     VersioningExtension(createInMemoryVersioningAdapter(editor)),
 *   ],
 * });
 * ```
 */
export function createInMemoryVersioningAdapter(
  editor: BlockNoteEditor<any, any, any>,
): VersioningExtensionOptions<Block<any, any, any>[], Block<any, any, any>[]> {
  return {
    endpoints: createInMemoryVersioningEndpoints(),
    preview: createInMemoryPreviewController(editor),
    getCurrentState: () => editor.document,
  };
}
