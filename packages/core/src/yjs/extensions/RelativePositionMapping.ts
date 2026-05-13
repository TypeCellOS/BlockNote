import {
  absolutePositionToRelativePosition,
  relativePositionToAbsolutePosition,
  ySyncPluginKey,
} from "y-prosemirror";
import { createExtension } from "../../editor/BlockNoteExtension.js";

export const RelativePositionMappingExtension = createExtension(
  ({ editor }) => {
    return {
      key: "yPositionMapping",
      mapPosition: (position: number, side: "left" | "right" = "left") => {
        const ySyncPluginState = ySyncPluginKey.getState(
          editor.prosemirrorState,
        );
        if (!ySyncPluginState) {
          throw new Error("YSync plugin state not found");
        }
        const relativePosition = absolutePositionToRelativePosition(
          position + (side === "right" ? 1 : -1),
          ySyncPluginState.binding.type,
          ySyncPluginState.binding.mapping,
        );

        return () => {
          const curYSyncPluginState = ySyncPluginKey.getState(
            editor.prosemirrorState,
          ) as typeof ySyncPluginState;
          const pos = relativePositionToAbsolutePosition(
            curYSyncPluginState.doc,
            curYSyncPluginState.binding.type,
            relativePosition,
            curYSyncPluginState.binding.mapping,
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
