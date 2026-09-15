import { VersioningExtension } from "@blocknote/core/extensions";
import { GoDiff } from "react-icons/go";

import { useDictionary } from "../../../../i18n/dictionary.js";
import { useExtension } from "../../../../hooks/useExtension.js";
import { usePreviewRow } from "../../usePreviewRow.js";
import { useVersioningSidebar } from "../../VersioningSidebarContext.js";
import { useVersionSnapshot } from "../../VersionSnapshotContext.js";
import {
  VersionMenuItem,
  type DefaultVersionMenuItemProps,
  type VersionMenuAction,
} from "../VersionMenuItem.js";

/**
 * "Compare with this version" — moves the diff baseline to this row, keeping
 * whatever is currently being shown (the current version when nothing, or this
 * same version, was being shown).
 *
 * Hidden on the current row (a version is never diffed against itself) and when
 * the backend can't diff at all.
 */
export function useCompareWithVersionAction(): VersionMenuAction {
  const versioning = useExtension(VersioningExtension);
  const { store, canCompare } = versioning;
  const { setComparisonMode, run } = useVersioningSidebar();
  const previewRow = usePreviewRow();
  const { snapshot, isCurrent } = useVersionSnapshot();

  if (isCurrent || !canCompare) {
    return { available: false };
  }

  return {
    available: true,
    execute: () => {
      setComparisonMode(true);

      const { view, list } = store.state;
      if (!list.loaded) {
        return;
      }
      const shown =
        view.mode === "snapshot" && view.snapshotId !== snapshot.id
          ? versioning.getSnapshot(view.snapshotId)
          : undefined;
      return run(() =>
        previewRow(shown ?? list.current, {
          compareTo: { type: "snapshot", id: snapshot.id },
        }),
      );
    },
  };
}

/** The default item; customize its behavior with {@link useCompareWithVersionAction}. */
export function CompareWithVersionItem(
  props: DefaultVersionMenuItemProps = {},
) {
  const dict = useDictionary();
  const action = useCompareWithVersionAction();
  if (!action.available) {
    return null;
  }

  return (
    <VersionMenuItem
      {...props}
      icon={props.icon === undefined ? <GoDiff /> : props.icon}
      onClick={() => {
        void action.execute();
      }}
    >
      {props.children === undefined
        ? dict.versioning.compare_with_menuitem
        : props.children}
    </VersionMenuItem>
  );
}
