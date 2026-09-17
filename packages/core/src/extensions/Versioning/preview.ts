import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import type { Store } from "../../util/Store.js";
import {
  scheduleScrollToFirstChange,
  scrollToFirstChange,
} from "./scrollToFirstChange.js";
import { findSnapshot, resolveCompareTo } from "./state.js";
import type {
  PreviewController,
  PreviewTarget,
  VersioningEndpoints,
  VersioningPreviewView,
  VersionSnapshotIdentifier,
  VersioningState,
  VersioningView,
  VersionSnapshot,
} from "./types.js";

/** Editor loading class, applied after {@link LOADING_PREVIEW_DELAY_MS}. */
export const LOADING_PREVIEW_CLASS = "bn-loading";

/** Delay the loading indicator so fast previews do not flash. */
export const LOADING_PREVIEW_DELAY_MS = 400;

/**
 * The preview loading indicator. Owns the loading class on the editor, shown
 * after {@link LOADING_PREVIEW_DELAY_MS} while a preview is fetching and
 * hidden when it settles. Nothing else — the caller publishes the loading
 * view to the store.
 */
function createLoadingIndicator(editor: BlockNoteEditor<any, any, any>) {
  let loaderTimeout: ReturnType<typeof setTimeout> | undefined;

  return {
    /**
     * Show or hide the loading class. Showing keeps one delay across fast
     * preview switches: restarting the timer on every row would re-flash the
     * class for a preview that is already loading.
     */
    setLoading(loading: boolean) {
      if (loading) {
        if (loaderTimeout === undefined) {
          loaderTimeout = setTimeout(() => {
            editor.domElement?.classList.add(LOADING_PREVIEW_CLASS);
          }, LOADING_PREVIEW_DELAY_MS);
        }
      } else {
        if (loaderTimeout !== undefined) {
          clearTimeout(loaderTimeout);
          loaderTimeout = undefined;
        }
        editor.domElement?.classList.remove(LOADING_PREVIEW_CLASS);
      }
    },
  };
}

/**
 * The preview half of the versioning store. Owns the `view` and `loadingView`
 * fields, the loading indicator, and which preview is currently on screen.
 *
 * The controller renders synchronously, so the only async step is fetching
 * content. A single token (bumped for every request and on exit) guarantees
 * only the newest request renders: an older fetch that settles late — or one
 * that settles after exit — bails instead of drawing over the document.
 */
export function createPreviewSession({
  store,
  endpoints,
  preview,
  serializeCurrentContent,
  editor,
  scrollToFirstChangeEnabled,
}: {
  store: Store<VersioningState>;
  endpoints: VersioningEndpoints;
  preview: PreviewController;
  serializeCurrentContent?: () => any;
  editor: BlockNoteEditor<any, any, any>;
  scrollToFirstChangeEnabled: boolean;
}) {
  // Newest request wins: only the call holding this token may render.
  let latestPreview = 0;
  // The view whose content is actually on screen. Trails the requested view
  // while content loads, so a failed fetch can put back what was there before
  // (see the catch below). Set before `enterPreview` so a controller that
  // throws mid-render still owns the screen until `exitPreview`.
  let renderedView: VersioningView = { mode: "live" };
  const loadingIndicator = createLoadingIndicator(editor);

  function setLoading(view: VersioningPreviewView | undefined) {
    loadingIndicator.setLoading(view !== undefined);
    if (store.state.loadingView !== view) {
      store.setState((state) => ({ ...state, loadingView: view }));
    }
  }

  async function showPreview(
    view: VersioningPreviewView,
    target: PreviewTarget,
    compareTo: VersionSnapshot | undefined,
    getPrimaryContent: () => Promise<any>,
  ) {
    const request = ++latestPreview;
    store.setState((state) => ({ ...state, view }));
    setLoading(view);
    try {
      const [content, compareToContent, attributions] = await Promise.all([
        getPrimaryContent(),
        compareTo && endpoints.getContent(compareTo),
        compareTo && endpoints.getAttributions?.(target, compareTo),
      ]);
      // A restore is replacing the document: don't draw a preview over it.
      if (request !== latestPreview || store.state.restoring) {
        return;
      }
      renderedView = view;
      preview.enterPreview(content, compareToContent, attributions, {
        target,
        compareTo,
      });
      setLoading(undefined);

      scheduleScrollToFirstChange(() => editor.domElement, {
        enabled: scrollToFirstChangeEnabled,
        isCurrent: () => store.state.view === view,
      });
    } catch (error) {
      if (request === latestPreview) {
        // Back to what is actually on screen; a superseded request owns nothing.
        store.setState((state) => ({ ...state, view: renderedView }));
        setLoading(undefined);
      }
      throw error;
    }
  }

  return {
    async previewSnapshot(
      this: void,
      id: VersionSnapshotIdentifier,
      previewOptions?: { compareTo?: VersionSnapshotIdentifier },
    ) {
      const snapshot = findSnapshot(store.state.list, id);
      if (snapshot === undefined) {
        throw new Error(
          `Snapshot not found: ${typeof id === "object" ? id.id : id}`,
        );
      }
      const compareTo = resolveCompareTo(
        store.state.list,
        previewOptions?.compareTo,
      );
      await showPreview(
        {
          mode: "snapshot",
          snapshotId: snapshot.id,
          compareToId: compareTo?.id,
        },
        { kind: "snapshot", snapshot },
        compareTo,
        () => endpoints.getContent(snapshot),
      );
    },
    ...(serializeCurrentContent
      ? {
          async previewCurrentVersion(
            this: void,
            previewOptions?: {
              compareTo?: VersionSnapshotIdentifier;
            },
          ) {
            const versions = store.state.list;
            if (!versions.loaded) {
              throw new Error(
                "previewCurrentVersion requires the version list to be loaded; " +
                  "call `list()` first.",
              );
            }
            const compareTo = resolveCompareTo(
              store.state.list,
              previewOptions?.compareTo,
            );
            await showPreview(
              { mode: "current", compareToId: compareTo?.id },
              { kind: "current", snapshot: versions.current },
              compareTo,
              serializeCurrentContent!,
            );
          },
        }
      : {}),
    exitPreview(this: void) {
      // In-flight fetches bail out instead of rendering over the live document.
      latestPreview++;
      setLoading(undefined);
      if (store.state.view.mode === "live") {
        return;
      }
      store.setState((state) => ({ ...state, view: { mode: "live" } }));
      // Only leave what was rendered; a still-fetching preview never touched
      // the document.
      if (renderedView.mode !== "live") {
        renderedView = { mode: "live" };
        preview.exitPreview();
      }
    },
    scrollToFirstChange: () => scrollToFirstChange(editor.domElement),
  };
}
