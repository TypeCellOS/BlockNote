import type { VersioningState } from "@blocknote/core/extensions";

import { getComparisonReconciliation } from "./reconcileComparison.js";
import { usePreviewRow } from "./usePreviewRow.js";
import { useVersioning } from "./useVersioning.js";
import { useVersioningSidebar } from "./VersioningSidebarContext.js";

/** Run only as the latest successful action's follow-up, never on history refresh. */
export function useReconcileComparison() {
  const { store } = useVersioning();
  const { comparisonMode, namedOnly } = useVersioningSidebar();
  const previewRow = usePreviewRow();

  return function reconcileComparison(
    before: VersioningState,
    changedId: string,
  ) {
    const row = getComparisonReconciliation(
      before,
      store.state,
      changedId,
      comparisonMode,
      namedOnly,
    );
    return row ? previewRow(row) : undefined;
  };
}
