import type * as Y from "yjs";
import type { Awareness } from "y-protocols/awareness";
import {
  createExtension,
  ExtensionOptions,
} from "../../editor/BlockNoteExtension.js";
import { ForkYDocExtension } from "./ForkYDoc.js";
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
        ForkYDocExtension(options),
        YCursorExtension(options),
        YSyncExtension(options),
        YUndoExtension(),
        SchemaMigration(options),
      ],
    } as const;
  },
);
