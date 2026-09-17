import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import type { User, UserStoreOrResolver } from "../../user/index.js";

/** Metadata for a point in document history, managed by {@link VersioningEndpoints}. */
export interface VersionSnapshot {
  /** Backend-defined identifier (e.g. a YHub server timestamp or an in-memory id). */
  id: string;

  /** A version is named exactly when this is defined; used by the named-only filter. */
  name?: string;

  /**
   * Last included edit, in Unix milliseconds. Timestamp-addressed backends use
   * this to resolve content and attribution windows.
   */
  createdAt: number;

  /**
   * Raw author ids, resolved reactively through the extension's user store.
   * Only displayed when {@link secondaryLabel} is unset.
   */
  by?: User["id"] | User["id"][];

  /** Custom display label, taking precedence over author labels from {@link by}. */
  secondaryLabel?: string;

  /**
   * Source of a restore. Carried explicitly because the source may no longer
   * be listed (e.g. merged into another activity window).
   */
  restoredFrom?: {
    /** The restored version's {@link VersionSnapshot.id}. */
    id: string;
    /** Source timestamp, displayed in the "Restored from" label. */
    createdAt: number;
  };

  /** Application metadata for custom actions; BlockNote does not interpret it. */
  metadata?: Record<string, unknown>;
}

/** A version id or an object carrying it. */
export type VersionSnapshotIdentifier = string | Pick<VersionSnapshot, "id">;

/**
 * Preview content source:
 * - `current`: serialize the live document. Snapshot metadata comes from the last
 *   listing and must not cap attribution windows for newer live edits.
 * - `snapshot`: fetch stored content via {@link VersioningEndpoints.getContent}.
 */
export type PreviewTarget =
  | { kind: "current"; snapshot: VersionSnapshot }
  | { kind: "snapshot"; snapshot: VersionSnapshot };

/** The editable live document, or a read-only preview with an optional baseline. */
export type VersioningView =
  | { mode: "live" }
  | { mode: "current"; compareToId?: string }
  | { mode: "snapshot"; snapshotId: string; compareToId?: string };

/** The {@link VersioningView} members that put the editor in preview mode. */
export type VersioningPreviewView = Exclude<VersioningView, { mode: "live" }>;

/** What the extension is currently loading: a list fetch or a preview. */
export type VersioningLoadingState =
  | { type: "idle" }
  | { type: "listing" }
  | { type: "loading-preview"; view: VersioningPreviewView };

/** Unknown until the first listing; once loaded, always contains a current row. */
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
  /** A list fetch is in flight; `getLoadingState` derives from this. */
  listing: boolean;
  /** The view whose content is still loading, if any; `getLoadingState` derives from this. */
  loadingView?: VersioningPreviewView;
  /** Holds the editor read-only during restore, including while the view is live. */
  restoring: boolean;
};

/**
 * Version storage, paired with a {@link PreviewController} for rendering.
 * @typeParam Input - Live document handle supplied by `getCurrentDocument`.
 * @typeParam Output - Serialized content fetched/restored and passed to the controller.
 * @typeParam Attributions - Diff authorship data passed to the controller.
 */
export interface VersioningEndpoints<
  Input = any,
  Output = any,
  Attributions = any,
> {
  /**
   * Current metadata and stored versions (excluding current). The extension
   * sorts stored versions newest-first.
   */
  list: () => Promise<{
    current: VersionSnapshot;
    snapshots: VersionSnapshot[];
  }>;
  /**
   * Name the current version: capture content for snapshot backends, or label
   * the newest edit for continuous-history backends. Omit to disable naming.
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
   * Restore a version and return content for {@link PreviewController.applyRestore}.
   * Omit to disable restore.
   */
  restore?: (
    /** Live document, from {@link VersioningExtensionOptions.getCurrentDocument}. */
    doc: Input,
    /** The version to restore. */
    snapshot: VersionSnapshot,
  ) => Promise<Output>;
  /** Fetch serialized content for {@link PreviewController.enterPreview}. */
  getContent: (snapshot: VersionSnapshot) => Promise<Output>;
  /**
   * Fetch authorship for `compareTo → target`, passed to the preview controller.
   * Omit for content comparisons without authorship.
   */
  getAttributions?: (
    /** What's being previewed (the "new" side of the diff). */
    target: PreviewTarget,
    /** The baseline it's diffed against (the "old" side). */
    compareTo?: VersionSnapshot,
  ) => Promise<Attributions>;
  /** Rename a version; undefined or empty clears its name. Omit to disable rename. */
  rename?: (snapshot: VersionSnapshot, name?: string) => Promise<void>;
  /**
   * Remove a stored version, or just its name on continuous-history backends.
   * Omit to disable removal.
   */
  remove?: (snapshot: VersionSnapshot) => Promise<void>;
}

/** Editor-aware endpoint factory. Type parameters match {@link VersioningEndpoints}. */
export type VersioningEndpointsFactory<
  Input = any,
  Output = any,
  Attributions = any,
> = (
  editor: BlockNoteEditor<any, any, any>,
) => VersioningEndpoints<Input, Output, Attributions>;

/**
 * Renders content fetched by {@link VersioningEndpoints}.
 * Type parameters match the endpoints' serialized content and authorship data.
 */
export interface PreviewController<Output = any, Attributions = any> {
  /** Whether comparisons are supported; defaults to true. Exposed as `canCompare`. */
  supportsComparison?: boolean;
  /**
   * Render fetched content synchronously so superseded requests cannot render
   * after exit. Put asynchronous work in the endpoints.
   */
  enterPreview: (
    /** Content to preview ({@link Output}). */
    snapshotContent: Output,
    /** When set, diff `compareToContent` (baseline) against `snapshotContent`. */
    compareToContent?: Output,
    /** Diff authorship; only meaningful with `compareToContent`. */
    attributions?: Attributions,
    /** Preview metadata for labels, separate from content and authorship. */
    context?: { target: PreviewTarget; compareTo?: VersionSnapshot },
  ) => undefined;
  /** Exit preview mode and resume normal editing. */
  exitPreview: () => void;
  /** Apply the restore endpoint's content after exiting preview. Omit if unsupported. */
  applyRestore?: (snapshotContent: Output) => void;
}

/**
 * Bridges live editor data to version storage and rendering.
 * Type parameters match {@link VersioningEndpoints}.
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
   * Live handle passed to create/restore (e.g. `Y.Node` or `Block[]`).
   * Unlike `serializeCurrentContent`, this need not be detached or serialized.
   */
  getCurrentDocument: () => Input;
  /**
   * Serialize live content to the endpoint's output format for current previews.
   * Omit to disable the extension's `previewCurrentVersion` method.
   */
  serializeCurrentContent?: () => Output | Promise<Output>;
  /**
   * Resolve {@link VersionSnapshot.by} for author labels; unresolved ids display raw.
   * Accepts a resolver or a shared store to deduplicate loading across features.
   */
  resolveUsers?: UserStoreOrResolver;
  /**
   * Scroll to and highlight the first change after preview. Prefers insertions,
   * then formatting, then deletions; collapsed changes use a visible ancestor.
   * @default true
   */
  scrollToFirstChange?: boolean;
};
