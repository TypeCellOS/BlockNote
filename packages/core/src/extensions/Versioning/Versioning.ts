import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import {
  createExtension,
  createStore,
  type ExtensionOptions,
} from "../../editor/BlockNoteExtension.js";
import {
  normalizeToUserStore,
  type User,
  type UserStoreOrResolver,
} from "../../user/index.js";

/**
 * Represents a single snapshot of a document's history, including metadata and content information.
 * Snapshots are used for versioning and can be created, listed, restored, and previewed through the
 * {@link VersioningEndpoints}.
 */
export interface VersionSnapshot {
  /**
   * The unique identifier for the snapshot. A plain string for real snapshots;
   * the {@link CURRENT_VERSION_ID} symbol for the synthetic "Current version"
   * entry (which no backend ever persists or round-trips).
   */
  id: string | typeof CURRENT_VERSION_ID;

  /**
   * The name of the snapshot.
   */
  name?: string;

  /**
   * The timestamp when the snapshot was created (unix timestamp).
   */
  createdAt: number;

  /**
   * The timestamp when the snapshot was last updated (unix timestamp).
   */
  updatedAt: number;

  /**
   * An optional secondary label for the snapshot, which can display additional information such as a custom description.
   * This is for display purposes only and is not used for any logic in the versioning system.
   *
   * For author attribution, prefer {@link by}: it holds raw user ids that the
   * view layer resolves to user info (and keeps up to date as users load).
   * When both are set, `secondaryLabel` wins.
   */
  secondaryLabel?: string;

  /**
   * The id(s) of the user(s) that authored this version, as raw user ids —
   * never pre-resolved to display names. The view layer resolves them via the
   * {@link VersioningExtension}'s user store (see
   * {@link VersioningExtensionOptions.resolveUsers}), reactively updating as
   * user info loads. Only used when {@link secondaryLabel} is unset.
   */
  by?: User["id"] | User["id"][];

  /**
   * The ID of the previous snapshot that this snapshot was restored from.
   */
  restoredFromSnapshotId?: string;
}

/**
 * Identifier for a single {@link VersionSnapshot}, either the bare id or the
 * whole reference. Tracks {@link VersionSnapshot.id}, so it also accepts the
 * {@link CURRENT_VERSION_ID} symbol.
 */
export type VersionSnapshotIdentifier =
  | VersionSnapshot["id"]
  | Pick<VersionSnapshot, "id">;

/**
 * The `id` of the synthetic "Current version" entry — the live document shown at
 * the top of `list()` and set as `previewedSnapshotId` while previewing it (see
 * {@link VersioningExtension.previewCurrentVersion}).
 *
 * A `unique symbol`, not a string, so it can never clash with a real snapshot id.
 * It's client-only — never fetched via `getContent` / `getAttributions` (the row
 * is previewed live) and never serialised, so no backend round-trips it. Because
 * {@link VersionSnapshot.id} is `string | typeof CURRENT_VERSION_ID`, code that
 * needs a string form for this one row (e.g. a React `key`) derives it locally.
 */
export const CURRENT_VERSION_ID: unique symbol = Symbol("bn-current-version");

/**
 * The backend contract for versioning: **where snapshot data lives** (pure
 * storage — in-memory, `localStorage`, HTTP, …). Counterpart to
 * {@link PreviewController} (*how a snapshot is rendered*) and
 * {@link VersioningExtensionOptions} (*how the live editor is bridged in*);
 * {@link VersioningExtension} orchestrates the three.
 *
 * Type params trace the data flow:
 * @typeParam Input - Live document handle passed to {@link create} / {@link restore},
 *   from {@link VersioningExtensionOptions.getCurrentDocument} (e.g. `Y.Type`, `Block[]`).
 * @typeParam Output - Serialised snapshot content from {@link getContent} /
 *   {@link restore}, rendered by {@link PreviewController.enterPreview} (e.g. `Uint8Array`).
 * @typeParam Attributions - Optional diff-authorship data from {@link getAttributions},
 *   also consumed by {@link PreviewController.enterPreview} (e.g. `Y.ContentMap`).
 */
export interface VersioningEndpoints<
  Input = any,
  Output = any,
  Attributions = any,
> {
  /**
   * List all snapshots for this document, sorted newest-first by
   * {@link VersionSnapshot.createdAt}.
   */
  list: () => Promise<VersionSnapshot[]>;
  /**
   * Create a new snapshot from the current content.
   *
   * @note omit for backends with continuous history (e.g. YHub's activity
   * timeline). Gates the extension's `canCreate` flag.
   */
  create?: (
    /** Live document to snapshot, from {@link VersioningExtensionOptions.getCurrentDocument}. */
    content: Input,
    options?: {
      /** Optional name for this snapshot. */
      name?: string;
      /** Id of the snapshot this one was restored from, if any. */
      restoredFromSnapshot?: VersionSnapshot;
    },
  ) => Promise<VersionSnapshot>;
  /**
   * Restore the document to a snapshot. Implementations should create any backup
   * snapshots they need before returning.
   *
   * @returns The restored content ({@link Output}, **not `void`**) — passed to
   *   {@link PreviewController.applyRestore}.
   * @note omit to disable restore. Gates the extension's `canRestore` flag.
   */
  restore?: (
    /** Live document, from {@link VersioningExtensionOptions.getCurrentDocument} (for backup). */
    doc: Input,
    /** The snapshot to restore. */
    snapshot: VersionSnapshot,
  ) => Promise<Output>;
  /**
   * Fetch a snapshot's content ({@link Output}) for preview — same format as
   * {@link VersioningExtensionOptions.serializeCurrentContent}. Sibling of
   * {@link getAttributions}; both are the storage-side fetch that
   * {@link PreviewController.enterPreview} renders.
   */
  getContent: (snapshot: VersionSnapshot) => Promise<Output>;
  /**
   * Fetch diff-authorship data ({@link Attributions}: who/when) for the range
   * `compareTo → snapshot`, rendered by {@link PreviewController.enterPreview}
   * (its only consumer). Lives on the endpoint, not `enterPreview`, so one
   * preview controller pairs with attribution-capable (YHub) or attribution-less
   * (`localStorage`) backends — {@link Attributions} is that seam.
   *
   * @note omit and previews still render the content diff, minus attribution.
   */
  getAttributions?: (
    /** The previewed snapshot (the "new" side of the diff). */
    snapshot: VersionSnapshot,
    /** The baseline it's diffed against (the "old" side). */
    compareTo?: VersionSnapshot,
  ) => Promise<Attributions>;
  /**
   * Rename a snapshot.
   *
   * @note omit to disable rename. Gates the extension's `canRename` flag.
   */
  rename?: (snapshot: VersionSnapshot, name?: string) => Promise<void>;
  /**
   * Permanently remove a snapshot.
   *
   * @note omit for immutable-history backends (e.g. YHub). Gates the extension's
   * `canRemove` flag.
   */
  remove?: (snapshot: VersionSnapshot) => Promise<void>;
}

/**
 * A factory function for the endpoints to receive a reference to the editor.
 *
 * @typeParam Input - See {@link VersioningEndpoints}.
 * @typeParam Output - See {@link VersioningEndpoints}.
 * @typeParam Attributions - See {@link VersioningEndpoints}.
 */
export type VersioningEndpointsFactory<
  Input = any,
  Output = any,
  Attributions = any,
> = (
  editor: BlockNoteEditor<any, any, any>,
) => VersioningEndpoints<Input, Output, Attributions>;

/**
 * Controls **how a snapshot is rendered** — the render-side counterpart to
 * {@link VersioningEndpoints} (storage). {@link VersioningExtension} fetches
 * content/attributions from the endpoints and delegates rendering here; keeping
 * the two separate lets one controller pair with different backends.
 *
 * @typeParam Output - Serialised snapshot content; matches the endpoints' `Output`.
 * @typeParam Attributions - Optional attribution data; matches the endpoints' `Attributions`.
 */
export interface PreviewController<Output = any, Attributions = any> {
  /**
   * Whether {@link enterPreview} can render a diff (uses `compareToContent`).
   * Defaults to `true`; `false` for show-one-version-only backends (e.g. the Yjs
   * v13 adapter). Surfaced as {@link VersioningExtension.canCompare}.
   */
  supportsComparison?: boolean;
  /**
   * Enter preview mode. Arguments come from the endpoints:
   * {@link VersioningEndpoints.getContent} (content) and
   * {@link VersioningEndpoints.getAttributions} (attributions).
   */
  enterPreview: (
    /** Snapshot to preview ({@link Output}, from {@link VersioningEndpoints.getContent}). */
    snapshotContent: Output,
    /** When set, diff `compareToContent` (baseline) against `snapshotContent`. */
    compareToContent?: Output,
    /**
     * Diff attributions ({@link Attributions}, from
     * {@link VersioningEndpoints.getAttributions}). Only meaningful with
     * `compareToContent`.
     */
    attributions?: Attributions,
    /**
     * The snapshot(s) this preview is for (metadata only — the content is
     * `snapshotContent` / `compareToContent`). Lets a controller label the
     * preview with e.g. the version's name, without smuggling it through the
     * {@link Attributions} channel. `snapshot` is the previewed version (the
     * {@link CURRENT_VERSION_ID} entry when previewing the live document);
     * `compareTo` is the baseline it's diffed against, if any.
     */
    context?: { snapshot: VersionSnapshot; compareTo?: VersionSnapshot },
  ) => void;
  /** Exit preview mode and resume normal editing. */
  exitPreview: () => void;
  /**
   * Apply restored content to the live document. Called with the {@link Output}
   * from {@link VersioningEndpoints.restore}, after preview mode has exited.
   */
  applyRestore: (snapshotContent: Output) => void;
}

/** Sort snapshots newest-first by creation time. */
export function sortSnapshotsNewestFirst(
  snapshots: VersionSnapshot[],
): VersionSnapshot[] {
  return [...snapshots].sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Options accepted by the {@link VersioningExtension} — **how the live editor is
 * bridged in**, alongside the {@link VersioningEndpoints} (storage) and
 * {@link PreviewController} (rendering).
 *
 * @typeParam Input - See {@link VersioningEndpoints}.
 * @typeParam Output - See {@link VersioningEndpoints}.
 * @typeParam Attributions - See {@link VersioningEndpoints}.
 */
export type VersioningExtensionOptions<
  Input = any,
  Output = any,
  Attributions = any,
> = {
  /**
   * Backend storage for snapshots.
   */
  endpoints:
    | VersioningEndpoints<Input, Output, Attributions>
    | VersioningEndpointsFactory<Input, Output, Attributions>;
  /**
   * Controls how snapshot previews and restores are rendered in the editor.
   */
  preview: PreviewController<Output, Attributions>;
  /**
   * The **live, mutable document handle** ({@link Input}) the backend snapshots
   * *from* / restores *into*. Passed to {@link VersioningEndpoints.create} and
   * {@link VersioningEndpoints.restore}. Cf. {@link serializeCurrentContent} (a
   * detached copy); the two coincide for some backends (in-memory:
   * `Input === Output === Block[]`) and differ for others (Yjs: `Y.Type` vs `Uint8Array`).
   */
  getCurrentDocument: () => Input;
  /**
   * The live document **serialised to snapshot format** ({@link Output}, matching
   * {@link VersioningEndpoints.getContent}), for diffing the live doc against a
   * snapshot (see {@link VersioningExtension.previewCurrentVersion}). Cf.
   * {@link getCurrentDocument} (the live handle).
   *
   * @note omit and the UI can't offer a "Current version" diff. Gates the
   * extension's `canPreviewCurrent` flag.
   */
  serializeCurrentContent?: () => Output | Promise<Output>;
  /**
   * Resolve user information for the author ids in {@link VersionSnapshot.by},
   * used by the view layer to render version-author labels.
   *
   * Either a resolver function (called with the ids of users that are not yet
   * cached, returning their information — a user store is built from it
   * internally) or a pre-built user store (see `createUserStore`). Pass the
   * same store you give the comments/collaboration extensions so a single
   * de-duped user cache is shared across features.
   *
   * @note omit and author ids are displayed as-is.
   */
  resolveUsers?: UserStoreOrResolver;
};

function snapshotNotFoundError(
  id: VersionSnapshotIdentifier | undefined,
): never {
  const idResolved = typeof id === "object" ? id.id : id;
  throw new Error(`Snapshot not found: ${String(idResolved)}`);
}

export const VersioningExtension = createExtension(
  ({
    options: optionsOrFactory,
    editor,
  }: ExtensionOptions<
    | VersioningExtensionOptions
    | ((editor: BlockNoteEditor<any, any, any>) => VersioningExtensionOptions)
  >) => {
    const {
      endpoints: endpointsRaw,
      preview,
      getCurrentDocument,
      serializeCurrentContent,
      resolveUsers,
    } = typeof optionsOrFactory === "function"
      ? optionsOrFactory(editor)
      : optionsOrFactory;

    const endpoints =
      typeof endpointsRaw === "function" ? endpointsRaw(editor) : endpointsRaw;
    // With no resolver this is an empty store: `getUser` always misses, so the
    // view layer falls back to showing the raw ids from `VersionSnapshot.by`.
    const userStore = normalizeToUserStore(resolveUsers);
    const store = createStore<{
      snapshots: VersionSnapshot[];
      /**
       * The id of the version currently shown in the editor (the "new" side of
       * a diff). `undefined` means the live, editable document. Is the
       * {@link CURRENT_VERSION_ID} symbol when previewing the live document as a
       * read-only diff against a snapshot.
       */
      previewedSnapshotId?: string | typeof CURRENT_VERSION_ID;
      /**
       * The id of the snapshot the preview is being diffed against (the
       * "baseline" / old side). `undefined` when not showing a diff. Always a
       * real snapshot id (never the current entry), but typed as the same union
       * as {@link VersionSnapshot.id} since it's copied from one. Used to render
       * the "Comparing to" indicator in the sidebar.
       */
      compareToSnapshotId?: string | typeof CURRENT_VERSION_ID;
    }>({
      snapshots: [],
      previewedSnapshotId: undefined,
      compareToSnapshotId: undefined,
    });

    const getSnapshot = (id: VersionSnapshotIdentifier | undefined) => {
      const idResolved = typeof id === "object" ? id.id : id;
      return store.state.snapshots.find(
        (snapshot) => snapshot.id === idResolved,
      );
    };

    const updateSnapshots = async () => {
      const snapshots = sortSnapshotsNewestFirst(await endpoints.list());
      store.setState((state) => ({
        ...state,
        snapshots,
      }));

      return snapshots;
    };

    const previewSnapshot = async (
      id: VersionSnapshotIdentifier,
      previewOptions?: {
        /**
         * When set, the preview shows a diff against this snapshot (typically the
         * chronologically previous version in the history list).
         */
        compareTo?: VersionSnapshotIdentifier;
      },
    ) => {
      const snapshot = getSnapshot(id);

      if (!snapshot) {
        snapshotNotFoundError(id);
      }

      const compareToSnapshot = previewOptions?.compareTo
        ? getSnapshot(previewOptions.compareTo)
        : undefined;

      store.setState((state) => ({
        ...state,
        previewedSnapshotId: snapshot.id,
        compareToSnapshotId: compareToSnapshot?.id,
      }));

      let compareToContent: unknown;
      let attributions: unknown;
      if (compareToSnapshot) {
        compareToContent = await endpoints.getContent(compareToSnapshot);
        // Attributions describe the diff between the baseline and this
        // snapshot, so they're only meaningful when comparing against another
        // version. Fetching them is optional: previews still render the content
        // diff without author/timestamp information when unavailable.
        if (endpoints.getAttributions) {
          attributions = await endpoints.getAttributions(
            snapshot,
            compareToSnapshot,
          );
        }
      }

      const snapshotContent = await endpoints.getContent(snapshot);
      preview.enterPreview(snapshotContent, compareToContent, attributions, {
        snapshot,
        compareTo: compareToSnapshot,
      });
    };

    /**
     * Preview the live ("current") document as a read-only diff against a
     * snapshot baseline. Unlike {@link previewSnapshot}, the "new" side of the
     * diff is the live document — serialised via `serializeCurrentContent` —
     * rather than a stored snapshot. The editor becomes non-editable while
     * previewing (editing is gated on `previewedSnapshotId === undefined`).
     */
    const previewCurrentVersion = async (previewOptions?: {
      /**
       * The snapshot to diff the live document against (the baseline). When
       * omitted, the live document is shown without a diff.
       */
      compareTo?: VersionSnapshotIdentifier;
    }) => {
      if (!serializeCurrentContent) {
        throw new Error(
          "previewCurrentVersion requires `serializeCurrentContent` to be " +
            "provided to the VersioningExtension options.",
        );
      }

      const compareToSnapshot = previewOptions?.compareTo
        ? getSnapshot(previewOptions.compareTo)
        : undefined;

      store.setState((state) => ({
        ...state,
        previewedSnapshotId: CURRENT_VERSION_ID,
        compareToSnapshotId: compareToSnapshot?.id,
      }));

      // Synthesise a snapshot for the live document so timestamp-based backends
      // (e.g. YHub) resolve the changeset window up to "now", and so the preview
      // controller gets a snapshot to key off. The id is the current-version
      // sentinel; backends ignore it and resolve the window from `createdAt`.
      const currentSnapshot: VersionSnapshot = {
        id: CURRENT_VERSION_ID,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      let compareToContent: unknown;
      let attributions: unknown;
      if (compareToSnapshot) {
        compareToContent = await endpoints.getContent(compareToSnapshot);
        if (endpoints.getAttributions) {
          attributions = await endpoints.getAttributions(
            currentSnapshot,
            compareToSnapshot,
          );
        }
      }

      const currentContent = await serializeCurrentContent();
      preview.enterPreview(currentContent, compareToContent, attributions, {
        snapshot: currentSnapshot,
        compareTo: compareToSnapshot,
      });
    };

    const exitPreview = () => {
      store.setState((state) => ({
        ...state,
        previewedSnapshotId: undefined,
        compareToSnapshotId: undefined,
      }));
      preview.exitPreview();
    };

    return {
      key: "versioning",
      store,
      userStore,
      list: async (): Promise<VersionSnapshot[]> => {
        return await updateSnapshots();
      },
      // Comparison is only offered when the preview controller can actually
      // render a diff (see PreviewController.supportsComparison). A getter so a
      // controller whose `supportsComparison` is itself dynamic (e.g. gated on
      // an opt-in diff extension that may be registered after this one) is read
      // lazily, not captured at init time.
      get canCompare() {
        return preview.supportsComparison !== false;
      },
      canCreate: endpoints.create !== undefined,
      create: endpoints.create
        ? async (options?: {
            /**
             * The optional name for this snapshot.
             */
            name?: string;
            /**
             * The ID of the snapshot this one was restored from, if applicable.
             */
            restoredFromSnapshot?: VersionSnapshotIdentifier;
          }): Promise<VersionSnapshot> => {
            const snapshot = await endpoints.create!(getCurrentDocument(), {
              name: options?.name,
              restoredFromSnapshot: getSnapshot(options?.restoredFromSnapshot),
            });
            // Show the new version immediately. Some backends (e.g. YHub) build
            // their version list from an activity timeline that lags a beat
            // behind the create, so waiting on a re-list would leave the UI
            // briefly stale.
            store.setState((state) => ({
              ...state,
              snapshots: sortSnapshotsNewestFirst([
                ...state.snapshots,
                snapshot,
              ]),
            }));
            // Reconcile with the backend's `list()` — it owns the "current
            // version" entry and any server-assigned metadata. If the refreshed
            // list doesn't include the just-created version yet (indexing lag),
            // keep the optimistic entry so it never flickers out.
            const listed = await endpoints.list();
            store.setState((state) => ({
              ...state,
              snapshots: sortSnapshotsNewestFirst(
                listed.some((s) => s.id === snapshot.id)
                  ? listed
                  : [...listed, snapshot],
              ),
            }));
            return snapshot;
          }
        : undefined,
      canRestore: endpoints.restore !== undefined,
      restore: endpoints.restore
        ? async (id: VersionSnapshotIdentifier) => {
            exitPreview();
            const snapshot = getSnapshot(id);

            if (!snapshot) {
              snapshotNotFoundError(id);
            }
            const snapshotContent = await endpoints.restore!(
              getCurrentDocument(),
              snapshot,
            );
            preview.applyRestore(snapshotContent);
            await updateSnapshots();
            return snapshotContent;
          }
        : undefined,
      canRename: endpoints.rename !== undefined,
      rename: endpoints.rename
        ? async (
            id: VersionSnapshotIdentifier,
            name?: string,
          ): Promise<void> => {
            const snapshot = getSnapshot(id);
            if (!snapshot) {
              snapshotNotFoundError(id);
            }
            await endpoints.rename!(snapshot, name);
            store.setState((state) => ({
              ...state,
              snapshots: state.snapshots.map((s) =>
                s.id === id ? { ...s, name, updatedAt: Date.now() } : s,
              ),
            }));
          }
        : undefined,
      canRemove: endpoints.remove !== undefined,
      remove: endpoints.remove
        ? async (id: VersionSnapshotIdentifier): Promise<void> => {
            const snapshot = getSnapshot(id);
            if (!snapshot) {
              snapshotNotFoundError(id);
            }
            // If the snapshot being removed is the one currently previewed, or
            // the baseline it's being diffed against, exit preview first so the
            // editor returns to the live document instead of showing (or
            // comparing against) a version that no longer exists.
            if (
              store.state.previewedSnapshotId === snapshot.id ||
              store.state.compareToSnapshotId === snapshot.id
            ) {
              exitPreview();
            }
            await endpoints.remove!(snapshot);
            // Remove it optimistically so the row disappears immediately, then
            // reconcile with the backend's authoritative list.
            store.setState((state) => ({
              ...state,
              snapshots: state.snapshots.filter((s) => s.id !== snapshot.id),
            }));
            await updateSnapshots();
          }
        : undefined,
      previewSnapshot,
      canPreviewCurrent: serializeCurrentContent !== undefined,
      previewCurrentVersion: serializeCurrentContent
        ? previewCurrentVersion
        : undefined,
      exitPreview,
    } as const;
  },
);
