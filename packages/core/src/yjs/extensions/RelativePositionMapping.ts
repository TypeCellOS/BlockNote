import {
  absolutePositionToRelativePosition,
  relativePositionToAbsolutePosition,
  ySyncPluginKey,
} from "y-prosemirror";
import { createExtension } from "../../editor/BlockNoteExtension.js";
import type { PositionMappingExtension } from "../../extensions/index.js";

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

        // 0 is a special case & always should map to itself
        if (position === 0) {
          return () => 0;
        }

        // If the document is empty, it has not been synced yet
        if (ySyncPluginState.binding.type.length === 0) {
          // so, we just fallback to the prosemirror position mapping extension
          // If a remote transaction or sync happens in this case. The position map will be invalidated,
          // and the positions will be moved to the end of the document
          // This is acceptable, because the document had not been synced so there are no positions to map properly into
          const fallback =
            editor.getExtension<typeof PositionMappingExtension>(
              "positionMapping",
            );
          if (!fallback) {
            throw new Error(
              "positionMapping extension is not available; cannot map position before sync",
            );
          }
          return fallback.mapPosition(position, side);
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
          // Resolve against the doc that owns the currently bound type, and not
          // against `curYSyncPluginState.doc`. Those can point at different
          // Y.Docs (e.g. right after forking the doc, see `ForkYDocExtension`),
          // in which case the resolved type wouldn't be part of the bound
          // fragment and the position would be reported as "not found".
          const boundType = curYSyncPluginState.binding.type;
          const pos = relativePositionToAbsolutePosition(
            boundType.doc,
            boundType,
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
