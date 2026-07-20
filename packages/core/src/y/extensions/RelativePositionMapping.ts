import { relativePositionStore, ySyncPluginKey } from "@y/prosemirror";
import { createExtension } from "../../editor/BlockNoteExtension.js";

export const RelativePositionMappingExtension = createExtension(
  ({ editor }) => {
    return {
      key: "yPositionMapping",
      mapPosition: (position: number, side: "left" | "right" = "left") => {
        const ySyncPluginState = ySyncPluginKey.getState(
          editor.prosemirrorState,
        );
        if (!ySyncPluginState?.ytype) {
          throw new Error("YSync plugin state not found");
        }

        // 0 is a special case & always should map to itself
        if (position === 0) {
          return () => 0;
        }

        const posStore = relativePositionStore(
          editor.prosemirrorState.doc.resolve(
            position + (side === "right" ? 1 : -1),
          ),
          ySyncPluginState.ytype,
          ySyncPluginState.renderer,
        );

        return () => {
          const curYSyncPluginState = ySyncPluginKey.getState(
            editor.prosemirrorState,
          ) as typeof ySyncPluginState;
          const pos = posStore(
            editor.prosemirrorState.doc,
            curYSyncPluginState.ytype,
            curYSyncPluginState.renderer,
          );

          // This can happen if the element is garbage collected
          if (pos === null) {
            throw new Error("Position not found, cannot track positions");
          }

          return pos + (side === "right" ? -1 : 1);
        };
      },
    } as const;
  },
);
