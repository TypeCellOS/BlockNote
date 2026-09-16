import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import type { User, UserStoreOrResolver } from "../../user/index.js";

/**
 * Represents a single version of a document: a label on a point in its history,
 * plus the metadata the sidebar renders. Versions are listed, named, restored
 * and previewed through the {@link VersioningEndpoints}.
 */
export interface VersionSnapshot {
  /**
   * The unique identifier for this version. Backend-defined: YHub derives it
   * from the version's server timestamp (`String(to)`), the in-memory adapter
   * hands out its own ids.
   */
  id: string;

  /**
   * The name of this version. A version is "named" exactly when this is
   * defined — that's what the sidebar's named-only filter keys off.
   */
  name?: string;

  /**
   * The timestamp of the last edit this version contains (unix ms). For
   * timestamp-addressed backends (YHub) this is the server-side `to` of the
   * activity entry, and it is what `getContent`/`getAttributions` resolve the
   * content window from.
   */
  createdAt: number;

  /**
   * The id(s) of the user(s) that authored this version, as raw user ids —
   * never pre-resolved to display names. The view layer resolves them via the
   * {@link VersioningExtension}'s user store (see
   * {@link VersioningExtensionOptions.resolveUsers}), reactively updating as
   * user info loads. Only used when {@link secondaryLabel} is unset.
   */
  by?: User["id"] | User["id"][];

  /**
   * An optional secondary label for the version, which can display additional
   * information such as a custom description. This is for display purposes only
   * and is not used for any logic in the versioning system.
   *
   * For author attribution, prefer {@link by}: it holds raw user ids that the
   * view layer resolves to user info (and keeps up to date as users load).
   * When both are set, `secondaryLabel` wins.
   */
  secondaryLabel?: string;

  /**
   * When this version was produced by restoring an earlier one, that earlier
   * version — as much of it as is still known. Carried rather than looked up:
   * the source version may since have been merged into another row, or have
   * scrolled out of the fetched window.
   */
  restoredFrom?: {
    /** The restored version's {@link VersionSnapshot.id}. */
    id: string;
    /**
     * Its {@link VersionSnapshot.createdAt}, which is what the view renders as
     * the "Restored from <date>" label.
     */
    createdAt: number;
  };

  /**
   * Any further keys the backend stores alongside the version, passed through
   * untyped. BlockNote never interprets these — they're a slot for app-specific
   * metadata (e.g. a "Make a copy" target id) that a custom sidebar menu item
   * can read off the row.
   */
  metadata?: Record<string, unknown>;
}

/**
 * Identifier for a single {@link VersionSnapshot}, either the bare id or the
 * whole reference.
 */
export type VersionSnapshotIdentifier = string | Pick<VersionSnapshot, "id">;

/**
 * What a preview is showing. Both members carry a {@link VersionSnapshot}, but
 * they differ in where the content comes from:
 *
 * - `current`: the **live document**, serialised at the moment the preview was
 *   entered (via {@link VersioningExtensionOptions.serializeCurrentContent}).
 *   Its `snapshot` is the list's current entry, so `createdAt` is the server
 *   timestamp of the newest recorded edit — which is what timestamp-addressed
 *   backends need to resolve the attribution window.
 * - `snapshot`: a stored version, fetched via
 *   {@link VersioningEndpoints.getContent}.
 */
export type PreviewTarget =
  | { kind: "current"; snapshot: VersionSnapshot }
  | { kind: "snapshot"; snapshot: VersionSnapshot };

/**
 * What the editor is currently showing: the live, editable document, or a
 * read-only preview of the current version / a stored version, optionally
 * diffed against a baseline.
 */
export type VersioningView =
  | { mode: "live" }
  | { mode: "current"; compareToId?: string }
  | { mode: "snapshot"; snapshotId: string; compareToId?: string };

/** The {@link VersioningView} members that put the editor in preview mode. */
export type VersioningPreviewView = Exclude<VersioningView, { mode: "live" }>;

/**
 * Whether an async versioning operation is in flight. A preview outranks a
 * listing: when both run, the UI should show the preview's loader on the row
 * being switched to, not the whole-list one.
 */
export type VersioningStatus =
  | { type: "idle" }
  | { type: "listing" }
  | { type: "loading-preview"; view: VersioningPreviewView };

/**
 * The version list. Versions are unknown until the first
 * {@link VersioningExtension.list}; once loaded a current entry always exists
 * (the newest recorded edit *is* the current version).
 */
export type VersioningList =
  | { loaded: false }
  | {
      loaded: true;
      /** The live document's row — always the top row of the sidebar. */
      current: VersionSnapshot;
      /** Stored versions, newest first. Never contains {@link current}. */
      snapshots: VersionSnapshot[];
    };

/** The {@link VersioningList} once {@link VersioningExtension.list} has run. */
export type LoadedVersioningList = Extract<VersioningList, { loaded: true }>;

/** The {@link VersioningExtension}'s store state. */
export type VersioningState = {
  list: VersioningList;
  view: VersioningView;
  status: VersioningStatus;
  /**
   * Whether a restore is in flight. While one is, the editor is read-only
   * even though the view is live: the document is about to be replaced, so
   * nothing typed into it would survive.
   */
  restoring: boolean;
};

/**
 * The backend contract for versioning: **where version data lives** (pure
 * storage — in-memory, `localStorage`, HTTP, …). Counterpart to
 * {@link PreviewController} (*how a version is rendered*) and
 * {@link VersioningExtensionOptions} (*how the live editor is bridged in*);
 * {@link VersioningExtension} orchestrates the three.
 *
 * Type params trace the data flow:
 * @typeParam Input - Live document handle passed to {@link create} / {@link restore},
 *   from {@link VersioningExtensionOptions.getCurrentDocument} (e.g. `Y.Node`, `Block[]`).
 * @typeParam Output - Serialised version content from {@link getContent} /
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
   * List the document's versions: the `current` entry (the newest recorded
   * edit, which the live document is previewed as) plus every stored version.
   * `snapshots` never contains `current`; the extension sorts it newest-first.
   */
  list: () => Promise<{
    current: VersionSnapshot;
    snapshots: VersionSnapshot[];
  }>;
  /**
   * Name the current version. For continuous-history backends (YHub) this
   * attaches a name to the newest recorded edit rather than capturing new
   * content; for snapshot backends it captures the live document.
   *
   * @note omit to disable naming.
   */
  create?: (
    /** Live document, from {@link VersioningExtensionOptions.getCurrentDocument}. */
    content: Input,
    options: {
      /** The name to give the current version. */
      name?: string;
    },
  ) => Promise<VersionSnapshot>;
  /**
   * Restore the document to a version.
   *
   * @returns The restored content ({@link Output}, **not `void`**) — passed to
   *   {@link PreviewController.applyRestore}.
   * @note omit to disable restore.
   */
  restore?: (
    /** Live document, from {@link VersioningExtensionOptions.getCurrentDocument}. */
    doc: Input,
    /** The version to restore. */
    snapshot: VersionSnapshot,
  ) => Promise<Output>;
  /**
   * Fetch a version's content ({@link Output}) for preview — same format as
   * {@link VersioningExtensionOptions.serializeCurrentContent}. Sibling of
   * {@link getAttributions}; both are the storage-side fetch that
   * {@link PreviewController.enterPreview} renders.
   */
  getContent: (snapshot: VersionSnapshot) => Promise<Output>;
  /**
   * Fetch diff-authorship data ({@link Attributions}: who/when) for the range
   * `compareTo → target`, rendered by {@link PreviewController.enterPreview}
   * (its only consumer). Lives on the endpoint, not `enterPreview`, so one
   * preview controller pairs with attribution-capable (YHub) or attribution-less
   * (`localStorage`) backends — {@link Attributions} is that seam.
   *
   * @note omit and previews still render the content diff, minus attribution.
   */
  getAttributions?: (
    /** What's being previewed (the "new" side of the diff). */
    target: PreviewTarget,
    /** The baseline it's diffed against (the "old" side). */
    compareTo?: VersionSnapshot,
  ) => Promise<Attributions>;
  /**
   * Rename a version. An `undefined` (or empty) name clears the name, which
   * drops the version out of the sidebar's named-only filter.
   *
   * @note omit to disable rename.
   */
  rename?: (snapshot: VersionSnapshot, name?: string) => Promise<void>;
  /**
   * Permanently remove a version. For continuous-history backends this removes
   * the *name*, so the row stays as an automatic entry.
   *
   * @note omit to disable removal.
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
 * Controls **how a version is rendered** — the render-side counterpart to
 * {@link VersioningEndpoints} (storage). {@link VersioningExtension} fetches
 * content/attributions from the endpoints and delegates rendering here; keeping
 * the two separate lets one controller pair with different backends.
 *
 * @typeParam Output - Serialised version content; matches the endpoints' `Output`.
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
   *
   * May return a promise; the extension awaits it before scrolling to the first
   * change, so a controller that renders asynchronously still gets the scroll at
   * the right moment.
   */
  enterPreview: (
    /** Content to preview ({@link Output}). */
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
     * What this preview is for (metadata only — the content is
     * `snapshotContent` / `compareToContent`). Lets a controller label the
     * preview with e.g. the version's name, without smuggling it through the
     * {@link Attributions} channel.
     */
    context?: { target: PreviewTarget; compareTo?: VersionSnapshot },
  ) => void | Promise<void>;
  /** Exit preview mode and resume normal editing. */
  exitPreview: () => void;
  /**
   * Apply restored content to the live document. Called with the {@link Output}
   * from {@link VersioningEndpoints.restore}, after preview mode has exited.
   * Omit when this controller cannot restore the live document.
   */
  applyRestore?: (snapshotContent: Output) => void;
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
   * Backend storage for versions.
   */
  endpoints:
    | VersioningEndpoints<Input, Output, Attributions>
    | VersioningEndpointsFactory<Input, Output, Attributions>;
  /**
   * Controls how version previews and restores are rendered in the editor.
   */
  preview: PreviewController<Output, Attributions>;
  /**
   * The **live, mutable document handle** ({@link Input}) the backend names
   * versions *from* / restores *into*. Passed to
   * {@link VersioningEndpoints.create} and {@link VersioningEndpoints.restore}.
   * Cf. {@link serializeCurrentContent} (a detached copy); the two coincide for
   * some backends (in-memory: `Input === Output === Block[]`) and differ for
   * others (Yjs: `Y.Node` vs `Uint8Array`).
   */
  getCurrentDocument: () => Input;
  /**
   * The live document **serialised to version format** ({@link Output}, matching
   * {@link VersioningEndpoints.getContent}), for showing the current version
   * (see {@link VersioningExtension.previewCurrentVersion}). Cf.
   * {@link getCurrentDocument} (the live handle).
   *
   * @note omit and the UI can't preview the current version. Gates the
   * extension's optional `previewCurrentVersion` method.
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
  /**
   * Whether entering a preview scrolls the first change of the diff into view
   * and briefly highlights its block. Insertions are preferred over format
   * changes and deletions; changes hidden inside collapsed content are
   * represented by the visible block that contains them.
   *
   * @default true
   */
  scrollToFirstChange?: boolean;
};
