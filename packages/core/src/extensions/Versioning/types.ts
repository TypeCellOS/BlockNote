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
 * Backend operations for stored {@link VersionSnapshot} metadata and content.
 * Operations never read the editor's displayed preview as the live document.
 * Optional methods determine which actions the controller and sidebar offer.
 * Read signals belong to the current view/request; mutations are not cancelled
 * by closing the view and must complete their backend operation independently.
 */
export interface VersionStorage<Content, Attributions = never> {
  /** Load history metadata. The controller sorts it by descending creation time. */
  list(signal: AbortSignal): Promise<VersionSnapshot[]>;
  /** Load a stored version's content for {@link VersionView.show}. */
  getContent(id: string, signal: AbortSignal): Promise<Content>;
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
  ) => Promise<Attributions>;
  /**
   * Name current. Snapshot stores save `content` from {@link VersionView.current};
   * continuous-history stores name their latest checkpoint instead.
   * Returns its metadata, or `undefined` when there is no checkpoint to name.
   */
  create?: (
    content: Content,
    name?: string,
  ) => Promise<VersionSnapshot | undefined>;
  /**
   * Restore a stored version to the live document, including backend-specific
   * application. The controller closes its original {@link VersionView} on success.
   */
  restore?: (id: string) => Promise<void>;
  /** Change a stored version's name; `undefined` clears it. Refresh {@link VersionStorage.list} afterward. */
  rename?: (id: string, name?: string) => Promise<void>;
  /**
   * Remove a stored version, or only its name on continuous-history backends.
   * The controller refreshes {@link VersionStorage.list} and reconciles selection.
   */
  remove?: (id: string) => Promise<void>;
}

/**
 * Published state of versioning, distinct from the independently syncing live document.
 * `live` means no temporary {@link VersionView} is owned; `versions` describes
 * the frozen preview and its asynchronous reads.
 */
export type VersioningState =
  | { mode: "live" }
  | {
      mode: "versions";
      /** Capture time from {@link VersionView.current}, in Unix milliseconds. */
      capturedAt: number;
      /** Last successfully rendered {@link VersionSelection}. */
      displayed: VersionSelection;
      /** Stored baseline identifier used by the displayed comparison, if any. */
      compareTo?: string;
      /** Requested selection still loading; {@link VersioningState.displayed} remains visible. */
      pending?: VersionSelection;
      /**
       * History loading status. Previously loaded {@link VersionSnapshot} rows
       * remain available during refresh or failure; `failed` carries no raw error.
       */
      history:
        | { status: "loading"; versions?: VersionSnapshot[] }
        | { status: "ready"; versions: VersionSnapshot[] }
        | { status: "failed"; versions?: VersionSnapshot[] };
      /** A live restore is in progress; editing and new selections remain blocked. */
      restoring: boolean;
    };

/**
 * Outcome of a controller read, selection, restore, or removal operation.
 * `done` means it completed; `cancelled` means its request/view was superseded;
 * `unavailable` means the action cannot run in the current state or is unsupported
 * by {@link VersionStorage}. Unexpected failures reject rather than returning this type.
 */
export type VersionOperationResult =
  | { status: "done" }
  | { status: "cancelled" }
  | { status: "unavailable" };
