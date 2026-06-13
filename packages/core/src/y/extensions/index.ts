import type * as Y from "@y/y";
import type { Awareness } from "@y/protocols/awareness";
import {
  createExtension,
  ExtensionOptions,
} from "../../editor/BlockNoteExtension.js";
import { RelativePositionMappingExtension } from "./RelativePositionMapping.js";
import { CollaborationUser, YCursorExtension } from "./YCursorPlugin.js";
import { YSyncExtension } from "./YSync.js";
import { YSuggestionPlugin } from "./YSuggestions.js";
import { BlockNoteEditorOptions } from "../../editor/BlockNoteEditor.js";
import { SuggestionsExtension } from "./Suggestions.js";
import { createYjsVersioningAdapter } from "./Versioning.js";
import {
  VersioningExtension,
  VersioningEndpoints,
} from "../../extensions/Versioning/index.js";

export type CollaborationOptions = {
  /**
   * The Yjs Type that's used for collaboration.
   */
  fragment: Y.Type;
  /**
   * The user info for the current user that's shown to other collaborators.
   */
  user: {
    name: string;
    color: string;
  };
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
   * The attribution manager for the collaboration.
   */
  attributionManager?: Y.DiffAttributionManager;
  /**
   * The suggestion doc for the collaboration. If using suggestion mode
   */
  suggestionDoc?: Y.Doc;

  /**
   * The endpoints for the versioning functionality.
   */
  versioningEndpoints?: VersioningEndpoints<Y.Type, Uint8Array>;
};

export const CollaborationExtension = createExtension(
  ({ editor, options }: ExtensionOptions<CollaborationOptions>) => {
    return {
      key: "collaboration",
      blockNoteExtensions: [
        options.suggestionDoc ? SuggestionsExtension(options) : null,
        RelativePositionMappingExtension(),
        YSyncExtension(options),
        YCursorExtension(options),
        YSuggestionPlugin(),
        options.versioningEndpoints
          ? VersioningExtension({
              ...createYjsVersioningAdapter(editor, options.fragment),
              endpoints: options.versioningEndpoints,
            })
          : null,
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
  return {
    ...options,
    extensions: [
      ...(options.extensions ?? []),
      CollaborationExtension(options.collaboration),
    ],
    // We disable the default prosemirror history plugin, since it's not compatible with yjs
    disableExtensions: ["history", ...(options.disableExtensions ?? [])],
    // We don't want the default initial content, since it will generate a random id for the initial block on each client,
    // leading to conflicts when syncing happens afterwards.
    initialContent: [{ type: "paragraph", id: "initialBlockId" }],
  };
}

export * from "./RelativePositionMapping.js";
export * from "./YCursorPlugin.js";
export * from "./YSync.js";
export * from "./Versioning.js";
export * from "./Suggestions.js";
