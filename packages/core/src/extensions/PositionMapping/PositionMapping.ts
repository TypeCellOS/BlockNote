import { Mapping } from "prosemirror-transform";
import { createExtension } from "../../editor/BlockNoteExtension.js";

export const PositionMappingExtension = createExtension(({ editor }) => {
  /**
   * The mapping object which holds the position mapping across changes.
   */
  let mapping = new Mapping();
  /**
   * The number of live `mapPosition` closures.
   */
  let numInstances = 0;

  function reset() {
    mapping = new Mapping();
    numInstances = 0;
  }

  // FinalizationRegistry is kept as a non-deterministic fallback for
  // individual closure cleanup during the editor's lifetime.
  const registry =
    typeof FinalizationRegistry !== "undefined"
      ? new FinalizationRegistry(() => {
          numInstances--;
          if (numInstances === 0) {
            reset();
          }
        })
      : null;

  editor.on("create", () => {
    editor._tiptapEditor.on("transaction", ({ transaction }) => {
      if (numInstances === 0) {
        return;
      }
      mapping.appendMapping(transaction.mapping);
    });

    // Deterministic cleanup: when the editor is destroyed, reset state so
    // mapping.maps does not grow unbounded across editor lifecycles.
    editor._tiptapEditor.on("destroy", () => {
      reset();
    });
  });

  return {
    key: "positionMapping",
    mapPosition: (position: number, side: "left" | "right" = "left") => {
      numInstances++;
      const trackedMapLength = mapping.maps.length;

      const getMappedPosition = () => {
        return (
          mapping
            // Only read the history of the mapping that we care about
            .slice(trackedMapLength)
            .map(position, side === "left" ? -1 : 1)
        );
      };

      if (registry) {
        registry.register(getMappedPosition, undefined);
      }

      return getMappedPosition;
    },
  } as const;
});
