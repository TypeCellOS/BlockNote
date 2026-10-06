import type {
  VersionSnapshot,
  VersionOperationResult,
} from "@blocknote/core/extensions";
import { useCallback } from "react";

import { useVersioning } from "./useVersioning.js";
import {
  getVersionSelection,
  getPreviousVisibleVersion,
  getVersionList,
} from "./visibleHistory.js";
import { useVersioningSidebar } from "./VersioningSidebarContext.js";

/**
 * What showing a row should diff against:
 *
 * - `previous` — the next older visible version, respecting the named-only filter.
 * - `none` — show the version on its own, no diff.
 * - `snapshot` — a specific baseline ("Compare with this version").
 */
export type CompareTarget =
  | { type: "previous" }
  | { type: "none" }
  | { type: "snapshot"; id: string };

/**
 * Preview a row using the sidebar's comparison setting, unless
 * overridden. The storage policy decides whether Current is the frozen capture
 * or the latest stored checkpoint.
 * Returns expected failures; wrap the complete user action in the sidebar's `run`.
 */
export function usePreviewRow(): (
  row: VersionSnapshot,
  options?: { compareTo?: CompareTarget; namedOnly?: boolean },
) => Promise<VersionOperationResult> {
  const { select, store } = useVersioning();
  const { comparisonMode, namedOnly } = useVersioningSidebar();

  return useCallback(
    async (
      row: VersionSnapshot,
      options?: { compareTo?: CompareTarget; namedOnly?: boolean },
    ) => {
      const list = getVersionList(store.state);
      if (!list.loaded) {
        return { status: "unavailable" };
      }

      const target = getVersionSelection(
        store.state,
        row,
        row.id === list.current?.id,
      );
      const compareTo = options?.compareTo ?? {
        type: comparisonMode ? "previous" : "none",
      };
      let compareToId: string | undefined;
      switch (compareTo.type) {
        case "previous": {
          compareToId = getPreviousVisibleVersion(
            list,
            row,
            options?.namedOnly ?? namedOnly,
          )?.id;
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

      return select(target, { compareTo: compareToId });
    },
    [store, comparisonMode, namedOnly, select],
  );
}
