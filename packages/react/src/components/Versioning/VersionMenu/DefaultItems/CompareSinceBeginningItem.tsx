import { VersioningExtension } from "@blocknote/core/extensions";
import { GoHistory } from "react-icons/go";

import { useDictionary } from "../../../../i18n/dictionary.js";
import {
  useExtension,
  useExtensionState,
} from "../../../../hooks/useExtension.js";
import { usePreviewRow } from "../../usePreviewRow.js";
import { useVersioningSidebar } from "../../VersioningSidebarContext.js";
import { useVersionSnapshot } from "../../VersionSnapshotContext.js";
import type {
  DefaultVersionMenuItemProps,
  VersionMenuAction,
} from "../VersionMenuItem.js";
import { DefaultVersionMenuItem } from "../DefaultVersionMenuItem.js";

/** Compare current against the oldest stored version, when comparisons are supported. */
export function useCompareSinceBeginningAction(): VersionMenuAction {
  const { canCompare } = useExtension(VersioningExtension);
  const { setComparisonMode, run } = useVersioningSidebar();
  const previewRow = usePreviewRow();
  const { isCurrent } = useVersionSnapshot();

  const list = useExtensionState(VersioningExtension, {
    selector: (state) => state.list,
  });
  const oldest = list.loaded
    ? list.snapshots[list.snapshots.length - 1]
    : undefined;

  if (!isCurrent || !canCompare || !list.loaded || !oldest) {
    return { available: false };
  }

  return {
    available: true,
    execute: () => {
      setComparisonMode(true);
      return run(() =>
        previewRow(list.current, {
          compareTo: { type: "snapshot", id: oldest.id },
        }),
      );
    },
  };
}

/** The default item; customize its behavior with {@link useCompareSinceBeginningAction}. */
export function CompareSinceBeginningItem(
  props: DefaultVersionMenuItemProps = {},
) {
  const dict = useDictionary();
  const action = useCompareSinceBeginningAction();

  return (
    <DefaultVersionMenuItem
      {...props}
      action={action}
      defaultIcon={<GoHistory />}
      defaultLabel={dict.versioning.compare_since_beginning_menuitem}
    />
  );
}
