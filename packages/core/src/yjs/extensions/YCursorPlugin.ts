import { defaultSelectionBuilder, yCursorPlugin } from "y-prosemirror";
import {
  createExtension,
  ExtensionOptions,
} from "../../editor/BlockNoteExtension.js";
import {
  createCollaborationCursorManager,
  type CollaborationUser,
} from "../../extensions/Collaboration/cursor.js";
import type { CollaborationOptions } from "./index.js";

export type { CollaborationUser } from "../../extensions/Collaboration/cursor.js";

export const YCursorExtension = createExtension(
  ({ options, editor }: ExtensionOptions<CollaborationOptions>) => {
    const awareness = options.provider?.awareness;
    awareness?.setLocalStateField("user", options.user);
    const cursors = createCollaborationCursorManager({
      renderCursor: options.renderCursor,
      showCursorLabels: options.showCursorLabels,
      getPortalElement: () => editor.portalElement,
    });
    return {
      key: "yCursor",
      mount() {
        awareness?.on("change", cursors.onAwarenessChange);
        return () => awareness?.off("change", cursors.onAwarenessChange);
      },
      prosemirrorPlugins: awareness
        ? [
            yCursorPlugin(awareness, {
              selectionBuilder: defaultSelectionBuilder,
              cursorBuilder: cursors.cursorBuilder,
            }),
            cursors.plugin,
          ]
        : [],
      dependsOn: ["ySync"],
      updateUser(user: CollaborationUser) {
        awareness?.setLocalStateField("user", user);
      },
      getUser(): CollaborationUser | undefined {
        return awareness?.getLocalState()?.["user"];
      },
    } as const;
  },
);
