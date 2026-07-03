import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import type { Block } from "../../blocks/defaultBlocks.js";
import type { DiffVersioningExtension } from "../../y/extensions/DiffVersioningExtension.js";
import type {
  PreviewController,
  VersioningEndpoints,
  VersioningExtensionOptions,
  VersionSnapshot,
} from "./Versioning.js";
import { CURRENT_VERSION_ID, sortSnapshotsNewestFirst } from "./Versioning.js";

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
  // True while a diff (attribution marks) is on screen, so exit/restore knows to
  // route the cleanup through the diff extension's node-view rebuild.
  let showingDiff = false;

  const replaceDoc = (blocks: Block<any, any, any>[]) => {
    editor.replaceBlocks(editor.document, blocks);
  };

  // The opt-in diff extension, if the consuming editor registered it. Looked up
  // by key so this module keeps zero runtime dependency on `@y/*`.
  const getDiff = () =>
    editor.getExtension<typeof DiffVersioningExtension>("diffVersioning");

  return {
    // Comparison is only possible when the (opt-in) diff extension is present —
    // otherwise previewing a comparison just statically shows the snapshot, so
    // the UI shouldn't offer it. A getter (not a static `true`) so it's
    // independent of the order the extensions were registered in: the diff
    // extension is typically added after the versioning extension, and this is
    // read lazily (on render) once both are registered.
    get supportsComparison() {
      return getDiff() !== undefined;
    },
    enterPreview(
      snapshotContent: Block<any, any, any>[],
      compareToContent?: Block<any, any, any>[],
    ) {
      // Save the live doc on first enter (successive enters keep the original).
      if (savedDoc === undefined) {
        savedDoc = editor.document;
      }

      const diff = getDiff();
      if (compareToContent && diff) {
        // Render an attributed diff of compareTo → snapshot.
        diff.renderDiff(snapshotContent, compareToContent);
        showingDiff = true;
        return;
      }

      // No comparison requested, or no diff extension registered: just show the
      // snapshot content statically.
      showingDiff = false;
      replaceDoc(snapshotContent);
    },

    exitPreview() {
      if (savedDoc !== undefined) {
        const diff = getDiff();
        if (showingDiff && diff) {
          diff.clearDiff(savedDoc);
        } else {
          replaceDoc(savedDoc);
        }
        savedDoc = undefined;
        showingDiff = false;
      }
    },

    applyRestore(snapshotContent: Block<any, any, any>[]) {
      const diff = getDiff();
      if (showingDiff && diff) {
        diff.clearDiff(snapshotContent);
      } else {
        replaceDoc(snapshotContent);
      }
      // Clear saved doc — the restored content is now the live document.
      savedDoc = undefined;
      showingDiff = false;
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

    async restore(currentDoc, snapshot) {
      // Stored snapshots always have string ids (only the synthetic current
      // entry carries the symbol, and it never reaches these methods).
      const id = String(snapshot.id);
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

    async getContent(snapshot) {
      const id = String(snapshot.id);
      const content = contents.get(id);
      if (!content) {
        throw new Error(`Snapshot ${id} not found`);
      }
      return structuredClone(content);
    },

    async rename(snapshot, name) {
      const stored = snapshots.find((s) => s.id === snapshot.id);
      if (!stored) {
        throw new Error(`Snapshot ${String(snapshot.id)} not found`);
      }
      stored.name = name;
      stored.updatedAt = Date.now();
    },

    async remove(snapshot) {
      const index = snapshots.findIndex((s) => s.id === snapshot.id);
      if (index === -1) {
        throw new Error(`Snapshot ${String(snapshot.id)} not found`);
      }
      snapshots.splice(index, 1);
      contents.delete(String(snapshot.id));
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
  const endpoints = createInMemoryVersioningEndpoints();

  return {
    // The raw endpoints are pure snapshot storage. The "current version" is a
    // view concern owned by the adapter (it's the layer that knows about the
    // live editor), so we wrap `list()` to always surface a current entry: the
    // live document is the editable working copy, and the entry is how the user
    // returns to live editing and compares against saved snapshots. No
    // timestamp/author is tracked, so the row just reads "Current version"
    // (see CurrentSnapshot in @blocknote/react).
    endpoints: {
      ...endpoints,
      list: async () => {
        const current: VersionSnapshot = {
          id: CURRENT_VERSION_ID,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        return [current, ...(await endpoints.list())];
      },
    },
    preview: createInMemoryPreviewController(editor),
    getCurrentDocument: () => editor.document,
    // The live document is already in the snapshot content format (`Block[]`),
    // so previewing "current" as a diff just reuses the live blocks.
    serializeCurrentContent: () => editor.document,
  };
}
