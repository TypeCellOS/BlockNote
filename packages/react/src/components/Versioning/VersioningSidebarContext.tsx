import { VersioningExtension } from "@blocknote/core/extensions";
import {
  Dispatch,
  ReactNode,
  SetStateAction,
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";

import { useExtension } from "../../hooks/useExtension.js";

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
   * Whether the sidebar exposes version comparison at all. Mirrors the
   * extension's {@link VersioningExtension.canCompare} capability: when
   * `false`, the comparison toggle and the "Compare with…" actions are hidden
   * entirely, and clicking a version only ever views it. Backends that can't
   * diff documents (e.g. the Yjs v13 adapter) report this off.
   */
  comparisonEnabled: boolean;
  /**
   * Whether clicking a version shows a diff against another version. When
   * `true` (the default), clicking a version diffs it against its chronological
   * predecessor, and the baseline can be moved via "Compare with this version".
   * When `false`, clicking a version only views it. Always `false` when
   * {@link comparisonEnabled} is `false`.
   */
  comparisonMode: boolean;
  setComparisonMode: Dispatch<SetStateAction<boolean>>;
  /**
   * Which tab of the sidebar is currently active: `"named"` shows only
   * user-created named versions, `"history"` shows the full edit timeline.
   *
   * When a `filter` prop is passed to the sidebar this is *forced* to the
   * corresponding tab (`"named"` → named-only, `"all"` → full history) and can
   * no longer be changed via {@link setActiveTab} — see {@link showTabs}.
   */
  activeTab: "named" | "history";
  setActiveTab: Dispatch<SetStateAction<"named" | "history">>;
  /**
   * Whether the tab switcher should be rendered. `false` when the sidebar was
   * given a `filter` prop, which pins {@link activeTab} to a single view and
   * hides the switcher entirely.
   */
  showTabs: boolean;
};

const VersioningSidebarContext = createContext<
  VersioningSidebarContextValue | undefined
>(undefined);

export const VersioningSidebarProvider = (props: {
  /**
   * When set, pins the sidebar to a single view and hides the tab switcher:
   * `"named"` shows only user-created named versions, `"all"` shows the full
   * edit history. When omitted, both tabs are shown (default active `"named"`).
   */
  filter?: "named" | "all";
  children: ReactNode;
}) => {
  // Comparison availability is driven by the extension/adapter, not the host —
  // backends that can't diff documents report `canCompare: false`.
  const { canCompare } = useExtension(VersioningExtension);
  const [comparisonMode, setComparisonMode] = useState(true);
  const [activeTab, setActiveTab] = useState<"named" | "history">("history");
  const comparisonEnabled = canCompare;

  // A `filter` prop forces the corresponding tab and hides the switcher; the
  // "all" filter maps to the full-history view. Without a filter, the switcher
  // is shown and the user's own `activeTab` selection drives the view.
  const forcedTab: "named" | "history" | undefined =
    props.filter === undefined
      ? undefined
      : props.filter === "named"
        ? "named"
        : "history";
  const showTabs = forcedTab === undefined;
  const effectiveTab = forcedTab ?? activeTab;

  const value = useMemo(
    () => ({
      comparisonEnabled,
      // Comparison can never be active when it's disabled outright.
      comparisonMode: comparisonEnabled && comparisonMode,
      setComparisonMode,
      activeTab: effectiveTab,
      setActiveTab,
      showTabs,
    }),
    [comparisonEnabled, comparisonMode, effectiveTab, showTabs],
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
