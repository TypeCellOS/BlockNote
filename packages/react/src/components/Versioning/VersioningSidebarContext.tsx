import {
  Dispatch,
  ReactNode,
  SetStateAction,
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";

/**
 * UI-only state shared across the versioning sidebar (the header toggle,
 * {@link CurrentSnapshot}, and each {@link Snapshot}).
 *
 * This is intentionally kept out of the core `VersioningExtension` store: it
 * describes how the *sidebar* interprets clicks, not the editor's preview
 * state. The baseline that drives the rendered diff (and the "Comparing to"
 * indicator) lives in the core store as `compareToSnapshotId`.
 */
export type VersioningSidebarContextValue = {
  /**
   * Whether clicking a version shows a diff against another version. When
   * `true` (the default), clicking a version diffs it against its chronological
   * predecessor, and the baseline can be moved via "Compare with this version".
   * When `false`, clicking a version only views it.
   */
  comparisonMode: boolean;
  setComparisonMode: Dispatch<SetStateAction<boolean>>;
};

const VersioningSidebarContext = createContext<
  VersioningSidebarContextValue | undefined
>(undefined);

export const VersioningSidebarProvider = (props: { children: ReactNode }) => {
  const [comparisonMode, setComparisonMode] = useState(true);

  const value = useMemo(
    () => ({ comparisonMode, setComparisonMode }),
    [comparisonMode],
  );

  return (
    <VersioningSidebarContext.Provider value={value}>
      {props.children}
    </VersioningSidebarContext.Provider>
  );
};

export const useVersioningSidebar = (): VersioningSidebarContextValue => {
  const context = useContext(VersioningSidebarContext);
  if (!context) {
    throw new Error(
      "useVersioningSidebar must be used within a VersioningSidebarProvider",
    );
  }
  return context;
};
