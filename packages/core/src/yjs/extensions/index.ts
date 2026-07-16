import type { Awareness } from "y-protocols/awareness";
import type * as Y from "yjs";
import type { BlockNoteEditorOptions } from "../../editor/BlockNoteEditor";
import {
  createExtension,
  type ExtensionOptions,
} from "../../editor/BlockNoteExtension.js";
import { FixUpSchemaExtension } from "./FixUpSchema.js";
import { ForkYDocExtension } from "./ForkYDoc.js";
import { RelativePositionMappingExtension } from "./RelativePositionMapping.js";
import { SchemaMigration } from "./schemaMigration/SchemaMigration.js";
import { YCursorExtension } from "./YCursorPlugin.js";
import { YSyncExtension } from "./YSync.js";
import { YUndoExtension } from "./YUndo.js";

export type CollaborationOptions = {
  /**
   * The Yjs XML fragment that's used for collaboration.
   */
  fragment: Y.XmlFragment;
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
  renderCursor?: (user: any) => HTMLElement;
  /**
   * Optional flag to set when the user label should be shown with the default
   * collaboration cursor. Setting to "always" will always show the label,
   * while "activity" will only show the label when the user moves the cursor
   * or types. Defaults to "activity".
   */
  showCursorLabels?: "always" | "activity";
};

export const CollaborationExtension = createExtension(
  ({ options }: ExtensionOptions<CollaborationOptions>) => {
    return {
      key: "collaboration",
      blockNoteExtensions: [
        FixUpSchemaExtension(),
        ForkYDocExtension(options),
        RelativePositionMappingExtension(),
        SchemaMigration(options),
        YCursorExtension(options),
        YSyncExtension(options),
        YUndoExtension(),
      ],
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

export * from "./ForkYDoc.js";
export * from "./RelativePositionMapping.js";
export * from "./schemaMigration/SchemaMigration.js";
export * from "./YCursorPlugin.js";
export * from "./YSync.js";
export * from "./YUndo.js";
