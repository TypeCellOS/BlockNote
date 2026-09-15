import type { Store } from "../../util/Store.js";
import {
  SCROLL_TO_FIRST_CHANGE_DELAY_MS,
  scrollToFirstChange as scrollToFirstChangeIn,
} from "./scrollToFirstChange.js";
import type {
  PreviewController,
  PreviewTarget,
  VersionSnapshot,
  VersionSnapshotIdentifier,
  VersioningEndpoints,
  VersioningPreviewView,
  VersioningState,
  VersioningView,
} from "./types.js";

/** Editor loading class, applied after {@link LOADING_PREVIEW_DELAY_MS}. */
export const LOADING_PREVIEW_CLASS = "bn-loading";

/** Delay the loading indicator so fast previews do not flash. */
export const LOADING_PREVIEW_DELAY_MS = 400;

/** Keeps the delayed editor loader visible across preview switches. */
function createLoadingIndicator(getEditorDOM: () => HTMLElement | undefined) {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  return function syncLoadingIndicator(loading: boolean) {
    if (loading) {
      if (timeout === undefined) {
        timeout = setTimeout(() => {
          timeout = undefined;
          getEditorDOM()?.classList.add(LOADING_PREVIEW_CLASS);
        }, LOADING_PREVIEW_DELAY_MS);
      }
      return;
    }
    clearTimeout(timeout);
    timeout = undefined;
    getEditorDOM()?.classList.remove(LOADING_PREVIEW_CLASS);
  };
}

/** Owns preview fetching, supersession, rendering, and returning to the live document. */
export function createVersioningPreview<Output, Attributions>({
  store,
  endpoints,
  preview,
  serializeCurrentContent,
  getSnapshot,
  requireSnapshot,
  setView,
  onStatusChange,
  getEditorDOM,
  scrollToFirstChangeEnabled,
}: {
  store: Store<VersioningState>;
  endpoints: Pick<
    VersioningEndpoints<unknown, Output, Attributions>,
    "getContent" | "getAttributions"
  >;
  preview: PreviewController<Output, Attributions>;
  serializeCurrentContent: (() => Output | Promise<Output>) | undefined;
  getSnapshot: (
    id: VersionSnapshotIdentifier | undefined,
  ) => VersionSnapshot | undefined;
  requireSnapshot: (id: VersionSnapshotIdentifier) => VersionSnapshot;
  setView: (view: VersioningView) => void;
  onStatusChange: () => void;
  getEditorDOM: () => HTMLElement | undefined;
  scrollToFirstChangeEnabled: boolean;
}) {
  const syncLoadingIndicator = createLoadingIndicator(getEditorDOM);
  let loadingPreview: VersioningPreviewView | undefined;
  /**
   * Bumped on every preview entry and on `exitPreview`, so an in-flight
   * preview whose fetches resolve after the user moved on can tell that it
   * was superseded and skip rendering.
   */
  let previewToken = 0;

  /**
   * The view the preview controller last rendered (or `live` after an
   * exit). What a failed preview rolls back to: the store must describe what
   * is actually on screen, and a superseded preview that never rendered
   * isn't.
   */
  let renderedView: VersioningView = { mode: "live" };

  function scheduleScrollToFirstChange(token: number) {
    if (!scrollToFirstChangeEnabled) {
      return;
    }
    // Let preview layout settle; timers also run in background tabs.
    setTimeout(() => {
      if (token !== previewToken) {
        return;
      }
      scrollToFirstChangeIn(getEditorDOM());
    }, SCROLL_TO_FIRST_CHANGE_DELAY_MS);
  }

  /**
   * Fetch and render unless superseded. Fetch failures restore the rendered
   * view; controller failures keep it read-only until the controller exits.
   */
  async function enterPreview(
    view: VersioningPreviewView,
    target: PreviewTarget,
    compareToSnapshot: VersionSnapshot | undefined,
    getPrimaryContent: () => Output | Promise<Output>,
  ) {
    const token = ++previewToken;
    setView(view);
    loadingPreview = view;
    onStatusChange();
    syncLoadingIndicator(loadingPreview !== undefined);

    try {
      // Capture current content first; fetch the baseline and authors in parallel.
      const [content, compareToContent, attributions] = await Promise.all([
        getPrimaryContent(),
        compareToSnapshot && endpoints.getContent(compareToSnapshot),
        compareToSnapshot &&
          endpoints.getAttributions?.(target, compareToSnapshot),
      ]);
      if (token !== previewToken) {
        return;
      }

      // Before the call, not after: once the controller has been asked to
      // render, leaving must go through it — even if it throws halfway.
      renderedView = view;
      await preview.enterPreview(content, compareToContent, attributions, {
        target,
        compareTo: compareToSnapshot,
      });

      scheduleScrollToFirstChange(token);
    } catch (error) {
      // Only the newest preview owns the view; an older one failing must not
      // clobber what the user is looking at now.
      if (token === previewToken) {
        setView(renderedView);
      }
      throw error;
    } finally {
      if (loadingPreview === view) {
        loadingPreview = undefined;
      }
      onStatusChange();
      syncLoadingIndicator(loadingPreview !== undefined);
    }
  }

  return {
    async previewSnapshot(
      id: VersionSnapshotIdentifier,
      previewOptions?: {
        /**
         * When set, the preview shows a diff against this version (typically
         * the chronologically previous one in the history list).
         */
        compareTo?: VersionSnapshotIdentifier;
      },
    ) {
      const snapshot = requireSnapshot(id);
      const compareToSnapshot = getSnapshot(previewOptions?.compareTo);

      await enterPreview(
        {
          mode: "snapshot",
          snapshotId: snapshot.id,
          compareToId: compareToSnapshot?.id,
        },
        { kind: "snapshot", snapshot },
        compareToSnapshot,
        () => endpoints.getContent(snapshot),
      );
    },

    /**
     * Preview the **current version**: the live document, frozen at the moment
     * this is called, optionally diffed against a stored version. Unlike
     * {@link previewSnapshot}, the "new" side is serialised from the live
     * document rather than fetched; its `createdAt` (the newest recorded edit's
     * server timestamp) is what timestamp-addressed backends resolve the
     * attribution window from.
     */
    async previewCurrentVersion(previewOptions?: {
      /**
       * The version to diff the live document against (the baseline). When
       * omitted, the live document is shown without a diff.
       */
      compareTo?: VersionSnapshotIdentifier;
    }) {
      if (!serializeCurrentContent) {
        throw new Error(
          "previewCurrentVersion requires `serializeCurrentContent` to be " +
            "provided to the VersioningExtension options.",
        );
      }
      const { list: versions } = store.state;
      if (!versions.loaded) {
        throw new Error(
          "previewCurrentVersion requires the version list to be loaded; " +
            "call `list()` first.",
        );
      }

      const compareToSnapshot = getSnapshot(previewOptions?.compareTo);

      await enterPreview(
        { mode: "current", compareToId: compareToSnapshot?.id },
        { kind: "current", snapshot: versions.current },
        compareToSnapshot,
        serializeCurrentContent,
      );
    },

    exitPreview() {
      // Nothing to leave: entering a preview publishes its view synchronously,
      // so a live view also means no preview is in flight.
      if (store.state.view.mode === "live") {
        return;
      }
      // Supersede any in-flight preview so it doesn't render on top of the
      // live document once its fetches resolve.
      previewToken++;
      loadingPreview = undefined;
      onStatusChange();
      syncLoadingIndicator(loadingPreview !== undefined);
      setView({ mode: "live" });
      // The controller is only asked to leave what it was asked to render. A
      // preview still fetching never replaced the document, and the controller
      // must not "restore" one it never touched (the Yjs controller rebuilds
      // the whole document when asked).
      const rendered = renderedView.mode !== "live";
      renderedView = { mode: "live" };
      if (rendered) {
        preview.exitPreview();
      }
    },

    get loadingPreview() {
      return loadingPreview;
    },
  };
}
