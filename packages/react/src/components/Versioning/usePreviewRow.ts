import {
  VersioningExtension,
  type VersionSnapshot,
} from "@blocknote/core/extensions";
import { useCallback } from "react";

import { useExtension } from "../../hooks/useExtension.js";
import { useVersioningSidebar } from "./VersioningSidebarContext.js";

/**
 * What showing a row should diff against:
 *
 * - `previous` — the previous visible version (the row below this one
 *   after applying the named-only filter).
 * - `none` — show the version on its own, no diff.
 * - `snapshot` — a specific baseline ("Compare with this version").
 */
export type CompareTarget =
  | { type: "previous" }
  | { type: "none" }
  | { type: "snapshot"; id: string };

/**
 * Preview a row using the sidebar's comparison and filter settings, unless
 * overridden. Current falls back to the live view if it cannot be previewed.
 * Rejects on failure; wrap the complete user action in the sidebar's `run`.
 */
export function usePreviewRow(): (
  row: VersionSnapshot,
  options?: { compareTo?: CompareTarget; namedOnly?: boolean },
) => Promise<void> {
  const { previewSnapshot, previewCurrentVersion, exitPreview, store } =
    useExtension(VersioningExtension);
  const { comparisonMode, namedOnly } = useVersioningSidebar();

  return useCallback(
    async (
      row: VersionSnapshot,
      options?: { compareTo?: CompareTarget; namedOnly?: boolean },
    ) => {
      const { list } = store.state;
      if (!list.loaded) {
        return;
      }

      const isCurrent = row.id === list.current.id;
      const compareTo = options?.compareTo ?? {
        type: comparisonMode ? "previous" : "none",
      };
      let compareToId: string | undefined;
      switch (compareTo.type) {
        case "previous": {
          const snapshots = list.snapshots.filter(
            (snapshot) =>
              !(options?.namedOnly ?? namedOnly) || snapshot.name !== undefined,
          );
          const rowIndex = snapshots.findIndex((s) => s.id === row.id);
          compareToId = isCurrent
            ? snapshots[0]?.id
            : rowIndex === -1
              ? undefined
              : snapshots[rowIndex + 1]?.id;
          break;
        }
        case "snapshot":
          compareToId = compareTo.id;
          break;
        case "none":
          compareToId = undefined;
          break;
        default:
          compareTo satisfies never;
      }

      if (!isCurrent) {
        await previewSnapshot(row.id, { compareTo: compareToId });
      } else if (previewCurrentVersion) {
        await previewCurrentVersion({ compareTo: compareToId });
      } else {
        exitPreview();
      }
    },
    [
      store,
      comparisonMode,
      namedOnly,
      previewCurrentVersion,
      previewSnapshot,
      exitPreview,
    ],
  );
}
