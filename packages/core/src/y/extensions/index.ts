import type { Awareness } from "@y/protocols/awareness";
import type * as Y from "@y/y";
import { BlockNoteEditorOptions } from "../../editor/BlockNoteEditor.js";
import {
  createExtension,
  ExtensionOptions,
} from "../../editor/BlockNoteExtension.js";
import { normalizeToUserStore, UserStoreOrResolver } from "../../user/index.js";
import { AttributionExtension } from "./AttributionExtension.js";
import { ForkYDocExtension } from "./ForkYDoc.js";
import { RelativePositionMappingExtension } from "./RelativePositionMapping.js";
import type { ExperimentalVersionDiffs } from "./snapshotPreview.js";
import { SuggestionsExtension } from "./Suggestions.js";
import { CollaborationUser, YCursorExtension } from "./YCursorPlugin.js";
import type { GetAttributionMarkClassName } from "./YAttributionMarks.js";
import { YSyncExtension } from "./YSync.js";

export type CollaborationOptions = {
  /**
   * The Yjs Type that's used for collaboration.
   */
  fragment: Y.Node;
  /**
   * The user info for the current user that's shown to other collaborators.
   */
  user: CollaborationUser;
  /**
   * Resolve user information (usernames, colors) for suggestions and versions,
   * used to drive suggestion-author tooltips, suggestion colors and
   * version-history author labels.
   *
   * Either a resolver function (called with the ids of users that are not yet
   * cached, returning their information — a user store is built from it
   * internally) or a pre-built user store (see `createUserStore`). Pass the same
   * store you give the comments extension so a single de-duped user cache is
   * shared across comments, suggestions and versioning.
   */
  resolveUsers?: UserStoreOrResolver;
  /**
   * A Yjs provider (used for awareness / cursor information)
   */
  provider?: { awareness?: Awareness };
  /**
   * Optional function to customize how cursors of users are rendered
   */
  renderCursor?: (user: CollaborationUser) => HTMLElement;
  /**
   * Optional flag to set when the user label should be shown with the default
   * collaboration cursor. Setting to "always" will always show the label,
   * while "activity" will only show the label when the user moves the cursor
   * or types. Defaults to "activity".
   */
  showCursorLabels?: "always" | "activity";
  /**
   * The renderer for the collaboration.
   */
  renderer?: Y.DiffRenderer;
  /**
   * The suggestion doc for the collaboration. If using suggestion mode
   */
  suggestionDoc?: Y.Doc;

  /**
   * Optional callback to override suggestion-mark styling by change type instead
   * of by author. Given a mark's content/modification type, return a class name
   * applied to the mark and its hover tooltip; the per-user color is then
   * dropped for that mark. See {@link GetAttributionMarkClassName}.
   */
  getAttributionMarkClassName?: GetAttributionMarkClassName;

  /**
   * Experimental refinements of how version history diffs are shown. They only
   * change what a diff shows, never what is stored.
   */
  experimental?: ExperimentalVersionDiffs;
};

export const CollaborationExtension = createExtension(
  ({ options }: ExtensionOptions<CollaborationOptions>) => {
    // Build a single user store here (from a resolver callback or a store the
    // consumer passed in) and hand that same store down to every sub-extension
    // that needs it: suggestions and suggestion-mark tooltips/colors.
    // so they share one de-duped cache. Passing the resolved store (rather than
    // the raw resolver) is what guarantees the sharing: each child re-normalizes
    // it to itself instead of building its own.
    const userStore = normalizeToUserStore(options.resolveUsers);
    const optionsWithUserStore = { ...options, resolveUsers: userStore };
    return {
      key: "collaboration",
      fragment: options.fragment,
      experimental: options.experimental ?? {},
      userStore,
      blockNoteExtensions: [
        options.suggestionDoc
          ? SuggestionsExtension(optionsWithUserStore)
          : null,
        RelativePositionMappingExtension(),
        ForkYDocExtension(options),
        YSyncExtension(optionsWithUserStore),
        YCursorExtension(options),
        AttributionExtension({
          resolveUsers: userStore,
          getAttributionMarkClassName: options.getAttributionMarkClassName,
        }),
      ].filter((a) => a !== null),
    } as const;
  },
);

export function withCollaboration<
  Options extends Partial<BlockNoteEditorOptions<any, any, any>>,
>(
  options: Options & {
    /**
     * Options for configuring the collaboration functionality.
     */
    collaboration: CollaborationOptions;
  },
): Options {
  if (options.initialContent) {
    // eslint-disable-next-line no-console
    console.warn(
      "When using Collaboration, initialContent might cause conflicts, because changes should come from the collaboration provider",
    );
  }
  // Keep normal ProseMirror history: the v14 sync plugin excludes incoming
  // Yjs changes from the local undo stack.
  return {
    ...options,
    extensions: [
      ...(options.extensions ?? []),
      CollaborationExtension(options.collaboration),
    ],
    // We don't want the default initial content, since it will generate a random id for the initial block on each client,
    // leading to conflicts when syncing happens afterwards.
    initialContent: [{ type: "paragraph", id: "initialBlockId" }],
  };
}

export type {
  ExperimentalVersionDiffs,
  VersionDiffFix,
  VersionDiffFixes,
} from "./snapshotPreview.js";
export { versionDiffFixesIncluded } from "./snapshotPreview.js";
export * from "./AttributionExtension.js";
export * from "./DiffVersioningExtension.js";
export * from "./ForkYDoc.js";
export * from "./RelativePositionMapping.js";
export * from "./Suggestions.js";
export * from "./YAttributionMarks.js";
export * from "./YCursorPlugin.js";
export * from "./YSync.js";
