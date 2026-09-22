import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import type { Block } from "../../blocks/defaultBlocks.js";
import type { Dictionary } from "../../i18n/dictionary.js";
import { en } from "../../i18n/locales/en.js";
import type { DiffVersioningExtension } from "../../y/extensions/DiffVersioningExtension.js";
import type {
  PreviewController,
  PreviewTarget,
  VersioningEndpoints,
  VersioningExtensionOptions,
  VersionSnapshot,
} from "./Versioning.js";

/** Reserved current-row id; stored versions use numeric ids. */
export const IN_MEMORY_CURRENT_VERSION_ID = "current";

/** Label for the version introducing the diff's changes. */
function versionLabel(target: PreviewTarget, dictionary: Dictionary): string {
  switch (target.kind) {
    case "current":
      return target.snapshot.name ?? dictionary.versioning.current_version;
    case "snapshot":
      return target.snapshot.name ?? dictionary.versioning.unnamed_version;
  }
}

// ---------------------------------------------------------------------------
// Preview Controller
// ---------------------------------------------------------------------------

/** Preview controller exposing the live document while a preview replaces it. */
export type InMemoryPreviewController = PreviewController<
  Block<any, any, any>[]
> & {
  applyRestore: (snapshotContent: Block<any, any, any>[]) => void;
  /** Saved live content while previewing, otherwise the editor document. */
  getLiveDocument: () => Block<any, any, any>[];
  /** Whether a preview has replaced the live document on screen. */
  readonly isPreviewing: boolean;
};

/**
 * Swap preview content through `replaceBlocks`, preserving the live document
 * across successive previews until exit.
 */
export function createInMemoryPreviewController(
  editor: BlockNoteEditor<any, any, any>,
): InMemoryPreviewController {
  let savedDoc: Block<any, any, any>[] | undefined;

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
    get isPreviewing() {
      return savedDoc !== undefined;
    },
    getLiveDocument() {
      return savedDoc ?? editor.document;
    },
    enterPreview(
      snapshotContent: Block<any, any, any>[],
      compareToContent?: Block<any, any, any>[],
      _attributions?: unknown,
      context?: { target: PreviewTarget; compareTo?: VersionSnapshot },
    ) {
      // Save the live doc on first enter (successive enters keep the original).
      if (savedDoc === undefined) {
        savedDoc = editor.document;
      }

      const diff = getDiff();
      if (compareToContent && diff) {
        // Render a diff of compareTo → snapshot, labelling the changes with the
        // previewed version's name (the diff's single "author").
        diff.renderDiff(
          snapshotContent,
          compareToContent,
          context && versionLabel(context.target, editor.dictionary),
        );
        return;
      }

      // No comparison requested, or no diff extension registered: just show the
      // snapshot content statically.
      replaceDoc(snapshotContent);
    },

    exitPreview() {
      if (savedDoc !== undefined) {
        // Replacing the blocks also drops the attribution marks a diff leaves.
        replaceDoc(savedDoc);
        savedDoc = undefined;
      }
    },

    applyRestore(snapshotContent: Block<any, any, any>[]) {
      // The restored content is the live document from here on, so leave
      // preview state *before* replacing it: the replace below is an edit, not
      // a preview transition.
      savedDoc = undefined;
      replaceDoc(snapshotContent);
    },
  };
}

// ---------------------------------------------------------------------------
// Endpoints (in-memory storage)
// ---------------------------------------------------------------------------

/**
 * A version to start an in-memory store with
 * (see {@link InMemoryVersioningOptions.initialVersions}).
 */
export type InMemoryVersion = {
  /** The version's name. Leave unset for an automatic (unnamed) version. */
  name?: string;
  /** When the version was created (unix ms). */
  createdAt: number;
  /** The document as of this version. */
  content: Block<any, any, any>[];
};

export type InMemoryVersioningOptions = {
  /** Preloaded history. New versions always sort above these, even with future dates. */
  initialVersions?: InMemoryVersion[];
};

/** In-memory snapshot storage using BlockNote document JSON (`Block[]`). */
export function createInMemoryVersioningEndpoints(
  options: InMemoryVersioningOptions = {},
  versioningDictionary: Dictionary["versioning"] = en.versioning,
): VersioningEndpoints<Block<any, any, any>[], Block<any, any, any>[]> {
  const snapshots: VersionSnapshot[] = [];
  const contents = new Map<string, Block<any, any, any>[]>();
  let nextId = 1;
  // Set by `restore`, so the current row can show "Restored from <date>" until
  // the next version is named.
  let currentRestoredFrom: VersionSnapshot["restoredFrom"];

  // `Date.now()` only has millisecond resolution, so two versions created in
  // the same tick would share a timestamp and sorting by creation time could
  // list them oldest-first. Hand out
  // strictly increasing timestamps so creation order is always preserved.
  let lastTimestamp = 0;
  function nextTimestamp() {
    lastTimestamp = Math.max(Date.now(), lastTimestamp + 1);
    return lastTimestamp;
  }

  for (const version of options.initialVersions ?? []) {
    const id = String(nextId++);
    snapshots.push({ id, name: version.name, createdAt: version.createdAt });
    contents.set(id, structuredClone(version.content));
    // Whatever is created from here on must sort above the loaded history,
    // even when that history carries timestamps from the future.
    lastTimestamp = Math.max(lastTimestamp, version.createdAt);
  }

  return {
    async list() {
      // The current row is the live document. It has no stored content (it *is*
      // the editor's content), so it only carries display metadata; the adapter
      // overrides `createdAt` with the real last-edit time it tracks.
      return {
        current: {
          id: IN_MEMORY_CURRENT_VERSION_ID,
          createdAt: nextTimestamp(),
          restoredFrom: currentRestoredFrom,
        },
        snapshots: [...snapshots].sort((a, b) => b.createdAt - a.createdAt),
      };
    },

    async create(currentDoc, options) {
      const now = nextTimestamp();
      const id = String(nextId++);
      const snapshot: VersionSnapshot = {
        id,
        name: options.name,
        createdAt: now,
      };
      snapshots.push(snapshot);
      contents.set(id, structuredClone(currentDoc));
      // The named version now covers everything up to now, so the current row
      // starts fresh.
      currentRestoredFrom = undefined;
      return snapshot;
    },

    async restore(currentDoc, snapshot) {
      const id = snapshot.id;
      const snapshotContent = contents.get(id);
      if (!snapshotContent) {
        throw new Error(`Snapshot ${id} not found`);
      }

      // Capture the pre-restore state as its own version so the restore can be
      // undone — the in-memory backend has no continuous history to fall back
      // on the way a server-backed one does.
      const now = nextTimestamp();
      const backupId = String(nextId++);
      snapshots.push({
        id: backupId,
        name: versioningDictionary.before_restore,
        createdAt: now,
      });
      contents.set(backupId, structuredClone(currentDoc));
      currentRestoredFrom = { id: snapshot.id, createdAt: snapshot.createdAt };

      return structuredClone(snapshotContent);
    },

    async getContent(snapshot) {
      const content = contents.get(snapshot.id);
      if (!content) {
        throw new Error(`Snapshot ${snapshot.id} not found`);
      }
      return structuredClone(content);
    },

    async rename(snapshot, name) {
      const stored = snapshots.find((s) => s.id === snapshot.id);
      if (!stored) {
        throw new Error(`Snapshot ${snapshot.id} not found`);
      }
      stored.name = name;
    },

    async remove(snapshot) {
      const index = snapshots.findIndex((s) => s.id === snapshot.id);
      if (index === -1) {
        throw new Error(`Snapshot ${snapshot.id} not found`);
      }
      snapshots.splice(index, 1);
      contents.delete(snapshot.id);
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
 *     VersioningExtension(createInMemoryVersioningAdapter),
 *   ],
 * });
 *
 * // With history loaded from elsewhere:
 * VersioningExtension((editor) =>
 *   createInMemoryVersioningAdapter(editor, { initialVersions }),
 * );
 * ```
 */
export function createInMemoryVersioningAdapter(
  editor: BlockNoteEditor<any, any, any>,
  options?: InMemoryVersioningOptions,
): VersioningExtensionOptions<Block<any, any, any>[], Block<any, any, any>[]> {
  const endpoints = createInMemoryVersioningEndpoints(
    options,
    editor.dictionary.versioning,
  );
  const preview = createInMemoryPreviewController(editor);

  // With no server there is no authoritative "last edit" timestamp, so the
  // adapter keeps one off the editor's own change stream. The client clock is
  // fine here: nothing else reads these timestamps back. Only edits to the
  // *live* document count: a preview replaces the document too, and swapping
  // versions on screen is not editing.
  const loadedAt = Date.now();
  let lastEditedAt: number | undefined;
  editor.onChange(() => {
    if (!preview.isPreviewing) {
      lastEditedAt = Date.now();
    }
  });

  return {
    // The raw endpoints are pure version storage. The current version is the
    // live document, so the adapter — the layer that knows about the editor —
    // stamps it with the real last-edit time.
    endpoints: {
      ...endpoints,
      async list() {
        const { current, snapshots } = await endpoints.list();
        return {
          current: { ...current, createdAt: lastEditedAt ?? loadedAt },
          snapshots,
        };
      },
    },
    preview,
    // Both read the *live* document through the controller: while a preview is
    // open, `editor.document` holds the previewed version, and naming or
    // showing the current version must not capture that.
    getCurrentDocument() {
      return preview.getLiveDocument();
    },
    // The live document is already in the version content format (`Block[]`),
    // so previewing the current version just reuses the live blocks.
    serializeCurrentContent() {
      return preview.getLiveDocument();
    },
  };
}
