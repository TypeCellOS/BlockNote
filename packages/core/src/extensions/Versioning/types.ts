/**
 * Metadata for a stored document version returned by {@link VersionStorage.list}.
 * Its content is loaded separately through {@link VersionStorage.getContent}.
 * The frozen current document belongs to {@link VersionView.current}, not this list.
 */
export interface VersionSnapshot {
  /** Storage identifier used by {@link VersionSelection} and {@link VersionStorage}. */
  id: string;
  /** Version timestamp in milliseconds since the Unix epoch. */
  createdAt: number;
  /** Optional user-assigned name, changed through {@link VersionStorage.rename}. */
  name?: string;
  /** Author identifier or identifiers, resolved to users by the sidebar's user store. */
  by?: string | string[];
  /** Optional additional text displayed beneath the version's name or timestamp. */
  secondaryLabel?: string;
  /** Original version whose content produced this version through a restore. */
  restoredFrom?: { id: string; createdAt: number };
  /** Backend-specific metadata, opaque to the versioning controller. */
  metadata?: unknown;
  /** Backend-provided attribution labels associated with this version. */
  customAttributions?: Record<string, string>;
}

/** One newest-first page. Identifiers and query options stay stable across pages. */
export interface VersionSnapshotPage {
  snapshots: VersionSnapshot[];
  /** Opaque continuation; absent when history is exhausted. */
  nextCursor?: string;
}

/**
 * Document to display in an open {@link VersionView}.
 * `current` selects the capture made at opening, not the latest live document.
 * `snapshot` selects a stored {@link VersionSnapshot} by its identifier.
 */
export type VersionSelection =
  | { type: "current" }
  | { type: "snapshot"; id: string };

/**
 * Resolved input to {@link VersionView.show}; all asynchronous loading has finished.
 * Content and attribution formats are defined by the matching {@link VersionStorage}
 * and {@link VersionViewAdapter}.
 */
export interface VersionDisplay<Content, Attributions> {
  /** Target document content to render. */
  content: Content;
  /** Older baseline and optional change attributions for a comparison preview. */
  comparison?: { content: Content; attributions?: Attributions };
  /** Selection represented by `content`, used for rendering labels and context. */
  target: VersionSelection;
}

/**
 * One temporary document view acquired through {@link VersionViewAdapter.open}.
 * Owns document binding, cursor suppression, and undo isolation while the live
 * collaborative document continues synchronizing separately.
 */
export interface VersionView<Content, Attributions> {
  /**
   * Detached content captured at opening, stable until {@link VersionView.close}.
   * `capturedAt` is Unix time in milliseconds, also used as the current-document
   * attribution cutoff by {@link VersionStorage.getAttributions}.
   */
  readonly current: { content: Content; capturedAt: number };
  /**
   * Synchronously render a resolved {@link VersionDisplay} without reconnecting
   * live synchronization or publishing preview cursors. Never called after close.
   */
  show(display: VersionDisplay<Content, Attributions>): void;
  /**
   * Discard the temporary view and restore live bindings and undo state.
   * Safe to call repeatedly. Does not apply a {@link VersionStorage.restore}.
   */
  close(): void;
}

/**
 * Backend-specific owner of isolated {@link VersionView} instances.
 * Paired with a {@link VersionStorage} using the same content and attribution formats.
 */
export interface VersionViewAdapter<Content, Attributions = never> {
  /** Whether {@link VersionView.show} supports {@link VersionDisplay.comparison}. */
  readonly supportsComparison: boolean;
  /**
   * Immediately freeze the displayed document and acquire its isolated view.
   * If acquisition throws, the adapter must undo any partially acquired bindings.
   */
  open(): VersionView<Content, Attributions>;
}

/**
 * Safe classifications for expected provider failures. An unknown timeout outcome
 * must be reconciled with the server before retrying a non-idempotent mutation.
 */
export type VersionError =
  | { type: "network" }
  | { type: "timeout"; outcome: "unknown" | "unchanged" }
  | { type: "forbidden" }
  | { type: "conflict" }
  | { type: "not-found" }
  | { type: "server"; status: number };

/** Expected failures are values. Unexpected bugs still reject. */
export type VersionResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: VersionError };

/** Existing data remains visible during refresh and after a failed refresh. */
export type VersionQueryState<T> =
  | { status: "pending"; data?: T; error?: never }
  | { status: "success"; data: T; error?: never }
  | { status: "error"; data?: T; error: VersionError };

/**
 * Backend operations for stored version metadata and content. Expected failures
 * return results; unexpected bugs throw. Mutations continue when the view closes.
 */
export interface VersionStorage<Content, Attributions = never> {
  /**
   * Prepend a separate frozen Current version. Defaults to true. Set false when
   * the newest listed checkpoint represents Current; opening loads that checkpoint
   * instead of the local capture, without comparing their content.
   */
  readonly showCurrentVersion?: boolean;
  /** The list includes the first available recorded version, even when otherwise limited. */
  readonly historyIncludesBeginning?: boolean;
  /** Load the first page, or continue with the opaque cursor from the previous page. */
  list(
    signal: AbortSignal,
    cursor?: string,
  ): Promise<VersionResult<VersionSnapshotPage>>;
  /**
   * Load stored content. As a comparison baseline, the earliest version is
   * loaded from before its first edit, so comparing since the beginning
   * includes that edit. Any other baseline is the version as it is.
   */
  getContent(
    id: string,
    signal: AbortSignal,
    options?: { baseline?: boolean },
  ): Promise<VersionResult<Content>>;
  /**
   * Load change attribution data between `baselineId` and `target` for
   * {@link VersionDisplay.comparison}. For a current target, `capturedAt` is the
   * capture timestamp from {@link VersionView.current}, not a history-row timestamp.
   */
  getAttributions?: (
    target: VersionSelection,
    baselineId: string,
    capturedAt: number,
    signal: AbortSignal,
  ) => Promise<VersionResult<Attributions>>;
  /**
   * Name current. Snapshot stores save `content` from {@link VersionView.current};
   * continuous-history stores must identify the captured checkpoint, not a later one.
   * Success returns checkpoint metadata. No checkpoint to name is a typed failure.
   */
  create?: (
    content: Content,
    name?: string,
    capturedAt?: number,
  ) => Promise<VersionResult<VersionSnapshot>>;
  /**
   * Restore a stored version to the live document, including backend-specific
   * application. Success means the live document has received the restore, not
   * just that the server accepted it. The controller discards pre-restore views;
   * opening during restore is unavailable. Reopen after completion to capture
   * restored Current.
   */
  restore?: (id: string) => Promise<VersionResult<void>>;
  /** Change a stored version's name; `undefined` clears it. Refresh {@link VersionStorage.list} afterward. */
  rename?: (id: string, name?: string) => Promise<VersionResult<void>>;
  /**
   * Remove a stored version, or only its name on continuous-history backends.
   * The controller refreshes {@link VersionStorage.list} and reconciles selection.
   */
  remove?: (id: string) => Promise<VersionResult<void>>;
}

/**
 * Published state of versioning, distinct from the independently syncing live document.
 * `live` means no temporary {@link VersionView} is owned; `versions` describes
 * the frozen preview and its asynchronous reads.
 */
export type VersioningState =
  | { mode: "live"; restoring?: boolean }
  | {
      mode: "versions";
      /** Capture time from {@link VersionView.current}, in Unix milliseconds. */
      capturedAt: number;
      /** Whether Current is a separate local capture. Defaults to true. */
      showCurrentVersion?: boolean;
      /** Last successfully rendered {@link VersionSelection}. */
      displayed: VersionSelection;
      /** Stored baseline identifier used by the displayed comparison, if any. */
      compareTo?: string;
      /** Requested selection still loading; {@link VersioningState.displayed} remains visible. */
      pending?: VersionSelection;
      /**
       * History loading status. Previously loaded {@link VersionSnapshot} rows
       * remain available during refresh or failure; errors contain safe classifications.
       */
      history: VersionQueryState<VersionSnapshot[]> &
        (
          | { status: "pending"; operation?: "refresh" | "loadMore" }
          | { status: "success"; operation?: never }
          | { status: "error"; operation: "refresh" | "loadMore" }
        );
      /** Continuation for the loaded history, retained when a request fails. */
      nextCursor?: string;
      /** A live restore is in progress; editing and new selections remain blocked. */
      restoring: boolean;
    };

/**
 * Outcome of a controller read, selection, or mutation.
 * `done` means it completed; `cancelled` means its request/view was superseded;
 * `unavailable` means the action cannot run in the current state or is unsupported
 * by {@link VersionStorage}. Unexpected failures reject rather than returning this type.
 */
export type VersionOperationResult =
  | { status: "done" }
  | { status: "error"; error: VersionError }
  | { status: "cancelled" }
  | { status: "unavailable" };
