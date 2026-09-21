import type { VersionSnapshot } from "@blocknote/core/extensions";
import { createContext, useContext, type ReactNode } from "react";
import type { VersioningSnapshotState } from "../../editor/ComponentsContext.js";

/**
 * Everything a version row's menu items need to know about the row they were
 * rendered in. Read it with {@link useVersionSnapshot} — that's the seam that
 * lets an application drop its own item (e.g. "Make a copy") into
 * `snapshotMenu` without threading props through the sidebar.
 */
export type VersionSnapshotContextValue = {
  /** The version this row shows. */
  snapshot: VersionSnapshot;
  /** Whether this row is the current version (the live document). */
  isCurrent: boolean;
  /** The row's mutually exclusive selection and comparison state. */
  state: VersioningSnapshotState;
  /**
   * Focus this row's name field. Naming an unnamed current version and renaming
   * a stored one both go through here; the row picks the right verb on commit.
   */
  startRename: () => void;
};

const VersionSnapshotContext = createContext<
  VersionSnapshotContextValue | undefined
>(undefined);

export function VersionSnapshotProvider(props: {
  value: VersionSnapshotContextValue;
  children: ReactNode;
}) {
  return (
    <VersionSnapshotContext.Provider value={props.value}>
      {props.children}
    </VersionSnapshotContext.Provider>
  );
}

/**
 * The version row the calling component is rendered in. Only valid inside a
 * row's actions menu (or anything else the row renders).
 */
export function useVersionSnapshot(): VersionSnapshotContextValue {
  const context = useContext(VersionSnapshotContext);
  if (!context) {
    throw new Error(
      "useVersionSnapshot must be used within a version row (e.g. inside the " +
        "sidebar's `snapshotMenu`)",
    );
  }
  return context;
}
