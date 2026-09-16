import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
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

/** Delayed editor loading class, so fast previews never flash. */
function createLoadingIndicator(editor: Pick<BlockNoteEditor, "domElement">) {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  return {
    show() {
      if (timeout === undefined) {
        timeout = setTimeout(() => {
          timeout = undefined;
          editor.domElement?.classList.add(LOADING_PREVIEW_CLASS);
        }, LOADING_PREVIEW_DELAY_MS);
      }
    },
    hide() {
      clearTimeout(timeout);
      timeout = undefined;
      editor.domElement?.classList.remove(LOADING_PREVIEW_CLASS);
    },
  };
}

/** Owns preview fetching, supersession, rendering, and returning to the live document. */
export function createVersioningPreview<Output, Attributions>({
  store,
  endpoints,
  preview,
  serializeCurrentContent,
  getSnapshot,
  setView,
  syncStatus,
  editor,
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
  setView: (view: VersioningView) => void;
  syncStatus: () => void;
  editor: Pick<BlockNoteEditor, "domElement">;
  scrollToFirstChangeEnabled: boolean;
}) {
  const loadingIndicator = createLoadingIndicator(editor);
  let loadingPreview: VersioningPreviewView | undefined;
  /** Invalidates pending fetches and scheduled scrolling on entry or exit. */
  let previewToken = 0;

  /**
   * Last requested controller render; fetch failures roll back here, never to
   * a superseded preview that was not rendered.
   */
  let renderedView: VersioningView = { mode: "live" };

  /** Publish a loading view, keeping one loader delay across fast switches. */
  function setLoadingPreview(view: VersioningPreviewView | undefined) {
    loadingPreview = view;
    if (view) {
      loadingIndicator.show();
    } else {
      loadingIndicator.hide();
    }
    syncStatus();
  }

  function requireSnapshot(id: VersionSnapshotIdentifier): VersionSnapshot {
    const snapshot = getSnapshot(id);
    if (!snapshot) {
      throw new Error(
        `Snapshot not found: ${typeof id === "object" ? id.id : id}`,
      );
    }
    return snapshot;
  }

  function scheduleScrollToFirstChange(token: number) {
    if (!scrollToFirstChangeEnabled) {
      return;
    }
    // Let preview layout settle; timers also run in background tabs.
    setTimeout(() => {
      if (token !== previewToken) {
        return;
      }
      scrollToFirstChangeIn(editor.domElement);
    }, SCROLL_TO_FIRST_CHANGE_DELAY_MS);
  }

  /**
   * Fetch and render unless superseded. Fetch failures restore the rendered
   * view; controller failures keep it read-only until the controller exits.
   */
  async function enterPreview(
    target: PreviewTarget,
    compareToSnapshot: VersionSnapshot | undefined,
  ) {
    const getPrimaryContent =
      target.kind === "snapshot"
        ? () => endpoints.getContent(target.snapshot)
        : serializeCurrentContent;
    if (!getPrimaryContent) {
      throw new Error(
        "previewCurrentVersion requires `serializeCurrentContent` to be " +
          "provided to the VersioningExtension options.",
      );
    }
    const view: VersioningPreviewView =
      target.kind === "snapshot"
        ? {
            mode: "snapshot",
            snapshotId: target.snapshot.id,
            compareToId: compareToSnapshot?.id,
          }
        : { mode: "current", compareToId: compareToSnapshot?.id };
    const token = ++previewToken;
    setView(view);
    setLoadingPreview(view);

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
      preview.enterPreview(content, compareToContent, attributions, {
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
      // Only the latest request owns the loader; a superseded one must not
      // clear the spinner of the preview that replaced it.
      if (token === previewToken) {
        setLoadingPreview(undefined);
      }
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

      await enterPreview({ kind: "snapshot", snapshot }, compareToSnapshot);
    },

    /**
     * Freeze the live document, optionally diffed against a stored version.
     * The target carries list metadata; see {@link PreviewTarget} for attribution bounds.
     */
    async previewCurrentVersion(previewOptions?: {
      /**
       * The version to diff the live document against (the baseline). When
       * omitted, the live document is shown without a diff.
       */
      compareTo?: VersionSnapshotIdentifier;
    }) {
      const { list: versions } = store.state;
      if (!versions.loaded) {
        throw new Error(
          "previewCurrentVersion requires the version list to be loaded; " +
            "call `list()` first.",
        );
      }

      const compareToSnapshot = getSnapshot(previewOptions?.compareTo);

      await enterPreview(
        { kind: "current", snapshot: versions.current },
        compareToSnapshot,
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
      setLoadingPreview(undefined);
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
