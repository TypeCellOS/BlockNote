import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import {
  createExtension,
  createStore,
  type ExtensionOptions,
} from "../../editor/BlockNoteExtension.js";
import { normalizeToUserStore } from "../../user/index.js";
import { ReadOnlyExtension } from "../ReadOnly/ReadOnly.js";
import { createVersioningCommands } from "./commands.js";
import { createListSession } from "./list.js";
import { createPreviewSession } from "./preview.js";
import { deriveStatus, findSnapshot, isReadOnly } from "./state.js";
import type {
  VersioningExtensionOptions,
  VersioningState,
  VersionSnapshotIdentifier,
} from "./types.js";

export { LOADING_PREVIEW_CLASS, LOADING_PREVIEW_DELAY_MS } from "./preview.js";
export type * from "./types.js";

/**
 * The composition root: resolves options, creates the store, wires the three
 * sessions (list, preview, commands) together, and exposes the extension
 * facade. Each store field has exactly one writer — `list` the list session,
 * `view` the preview session, `restoring` the commands — and `status` is
 * derived here from the sessions' in-flight state.
 */
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
      scrollToFirstChange: scrollToFirstChangeEnabled = true,
    } = typeof optionsOrFactory === "function"
      ? optionsOrFactory(editor)
      : optionsOrFactory;

    const endpoints =
      typeof endpointsRaw === "function" ? endpointsRaw(editor) : endpointsRaw;
    // Capture the controller method so the restore branch has a callable type.
    const applyRestore = preview.applyRestore?.bind(preview);
    // With no resolver this is an empty store: `getUser` always misses, so the
    // view layer falls back to showing the raw ids from `VersionSnapshot.by`.
    const userStore = normalizeToUserStore(resolveUsers);
    const store = createStore<VersioningState>(
      {
        list: { loaded: false },
        view: { mode: "live" },
        status: { type: "idle" },
        restoring: false,
      },
      {
        // Sync the ReadOnly gate with the new state. Writing through the
        // store keeps this in one place, including for external `setState`.
        onUpdate(state, prevState) {
          if (isReadOnly(state) !== isReadOnly(prevState)) {
            editor
              .getExtension(ReadOnlyExtension)!
              .setReadOnly(isReadOnly(state), "versioning");
          }
        },
      },
    );

    const listSession = createListSession({
      store,
      endpoints,
      onStatusChange: () => syncStatus(),
    });
    const previewSession = createPreviewSession({
      store,
      endpoints,
      preview,
      serializeCurrentContent,
      editor,
      scrollToFirstChangeEnabled,
      onStatusChange: () => syncStatus(),
    });
    const commands = createVersioningCommands({
      store,
      endpoints,
      getCurrentDocument,
      applyRestore,
      refreshList: listSession.refresh,
      exitPreview: previewSession.exitPreview,
    });

    /**
     * The single writer of the busy `status`: both sessions report their
     * in-flight state here, so a preview settling mid-list never clobbers a
     * visible listing.
     */
    function syncStatus() {
      store.setState((state) => ({
        ...state,
        status: deriveStatus(listSession.isListing, previewSession.loadingView),
      }));
    }

    return {
      key: "versioning",
      store,
      userStore,
      /** Open history: fetch its list from the backend. */
      list: listSession.refresh,
      getSnapshot: (id: VersionSnapshotIdentifier) =>
        findSnapshot(store.state.list, id),
      // Comparison is only offered when the preview controller can actually
      // render a diff (see PreviewController.supportsComparison). A getter so a
      // controller whose `supportsComparison` is itself dynamic (e.g. gated on
      // an opt-in diff extension that may be registered after this one) is read
      // lazily, not captured at init time.
      get canCompare() {
        return preview.supportsComparison !== false;
      },
      create: commands.create,
      restore: commands.restore,
      rename: commands.rename,
      remove: commands.remove,
      previewSnapshot: previewSession.previewSnapshot,
      previewCurrentVersion: previewSession.previewCurrentVersion,
      exitPreview: previewSession.exitPreview,
      /**
       * Scroll the first change of the rendered diff into view. Runs
       * automatically after preview unless disabled; exposed for hosts.
       * @returns whether a change was found.
       */
      scrollToFirstChange: previewSession.scrollToFirstChange,
    } as const;
  },
);
