import { VersioningExtension } from "@blocknote/core/extensions";
import { useEffect, useRef, type ReactNode } from "react";

import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { useExtension } from "../../hooks/useExtension.js";
import { useDictionary } from "../../i18n/dictionary.js";
import { usePreviewRow } from "./usePreviewRow.js";
import { VersionMenu } from "./VersionMenu/VersionMenu.js";
import {
  useVersioningSidebar,
  VersioningSidebarProvider,
} from "./VersioningSidebarContext.js";
import { VersioningSidebarHeader } from "./VersioningSidebarHeader.js";
import { VersioningSidebarList } from "./VersioningSidebarList.js";

export { VersioningSidebarHeader } from "./VersioningSidebarHeader.js";
export { VersioningSidebarList } from "./VersioningSidebarList.js";

export type VersioningSidebarProps = {
  /**
   * Called when the user closes the history panel via the header's close
   * button. The host is responsible for hiding the panel; the sidebar exits
   * preview mode (restoring editing) before invoking this. When omitted, the
   * close button is not rendered.
   */
  onClose?: () => void;
  /**
   * Initial state of the toggles. Both are the user's from then on — pass a
   * changing `key` to reset them.
   * @default false
   */
  defaultNamedOnly?: boolean;
  /**
   * Off by default: the first thing a reader wants is the document as it was,
   * not a marked-up diff.
   * @default false
   */
  defaultComparisonMode?: boolean;
  /**
   * The menu rendered in each row's "..." trigger. Compose it from
   * `VersionMenu`, the default items and your own `VersionMenuItem`s; every
   * item can read the row it's in via `useVersionSnapshot()`.
   * Pass `null` or `false` to hide the menu and its trigger.
   * @default <VersionMenu />
   */
  snapshotMenu?: ReactNode;
  /**
   * The spinner shown while the version list loads.
   * @default <Components.Versioning.Loader />
   */
  loadingIndicator?: ReactNode;
};

function VersioningSidebarContent(props: { onClose?: () => void }) {
  const Components = useComponentsContext()!;
  const dict = useDictionary();
  const versioning = useExtension(VersioningExtension);
  const { run, failed } = useVersioningSidebar();
  const previewRow = usePreviewRow();

  // `previewRow` changes with comparison/filter state, but those changes must
  // not relist history. Keep the async completion fresh without making it an
  // effect dependency (the header re-previews already-loaded history itself).
  const previewRowRef = useRef(previewRow);
  previewRowRef.current = previewRow;

  // Open the panel on the current version, read-only. One `list()` per mount:
  // the history is a snapshot of the moment the panel was opened, and closing
  // and reopening is what refreshes it.
  useEffect(() => {
    void run(
      () => versioning.list(),
      async (loaded) => {
        if (versioning.store.state.view.mode === "live") {
          await previewRowRef.current(loaded.current);
        }
      },
    );
  }, [run, versioning]);

  return (
    <Components.Versioning.Sidebar
      className="bn-versioning-sidebar"
      aria-label={dict.versioning.title}
    >
      <VersioningSidebarHeader onClose={props.onClose} />
      {failed && (
        <div className="bn-versioning-sidebar-error" role="alert">
          {dict.versioning.action_failed}
        </div>
      )}
      <VersioningSidebarList />
    </Components.Versioning.Sidebar>
  );
}

/**
 * The version-history panel: a list of the document's versions, newest first,
 * with the current version at the top.
 *
 * While it is open the editor is read-only and shows the selected version —
 * the panel always has a selection, starting on the current version.
 */
export function VersioningSidebar(props: VersioningSidebarProps) {
  return (
    <VersioningSidebarProvider
      defaultNamedOnly={props.defaultNamedOnly}
      defaultComparisonMode={props.defaultComparisonMode}
      snapshotMenu={
        props.snapshotMenu === undefined ? <VersionMenu /> : props.snapshotMenu
      }
      loadingIndicator={props.loadingIndicator}
    >
      <VersioningSidebarContent onClose={props.onClose} />
    </VersioningSidebarProvider>
  );
}
