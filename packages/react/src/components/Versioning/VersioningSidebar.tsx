import { useLayoutEffect, useRef, type ReactNode } from "react";

import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { PortalElementAnchor } from "../../editor/PortalElementOverride.js";
import { useVersioning, useVersioningState } from "./useVersioning.js";
import { useDictionary } from "../../i18n/dictionary.js";
import { usePreviewRow } from "./usePreviewRow.js";
import { getPreviousVisibleVersion, getVersionList } from "./visibleHistory.js";
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
  /** Handle failures from automatic history loading. Explicit actions still reject. */
  onError?: (error: unknown) => void;
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

function VersioningSidebarContent(props: {
  onClose?: () => void;
  onError?: (error: unknown) => void;
}) {
  const Components = useComponentsContext()!;
  const dict = useDictionary();
  const versioning = useVersioning();
  const { run, action, comparisonMode, namedOnly } = useVersioningSidebar();
  const state = useVersioningState();
  const listError =
    state.mode === "versions" && state.history.status === "error";
  const previewRow = usePreviewRow();
  const latestRef = useRef({
    previewRow,
    comparisonMode,
    namedOnly,
    onError: props.onError,
  });
  // Intentionally keep pending actions synchronized during render.
  // oxlint-disable-next-line react/refs
  latestRef.current = {
    previewRow,
    comparisonMode,
    namedOnly,
    onError: props.onError,
  };

  useLayoutEffect(() => {
    versioning.open();
    // History can load while an older session is still restoring. Only user
    // actions go through the runner's restore guard.
    const loading = versioning.list().then(async (result) => {
      const list = getVersionList(versioning.store.state);
      const preview = latestRef.current;
      // Opening already displays frozen current. Only render again for a diff.
      if (
        result.status === "done" &&
        list.loaded &&
        preview.comparisonMode &&
        getPreviousVisibleVersion(list, list.current, preview.namedOnly)
      ) {
        await run(() => preview.previewRow(list.current));
      }
    });
    const onError = latestRef.current.onError;
    if (onError) {
      void loading.catch(onError);
    }
    return () => versioning.close();
  }, [run, versioning]);

  return (
    <Components.Versioning.Sidebar
      className="bn-versioning-sidebar"
      aria-label={dict.versioning.title}
    >
      <VersioningSidebarHeader onClose={props.onClose} />
      {listError && (
        <div className="bn-versioning-sidebar-error" role="alert">
          {dict.versioning.history_load_failed}
        </div>
      )}
      {!listError && action.status === "error" && (
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
 * starting on the current version. Filtering rows does not change the preview.
 */
export function VersioningSidebar(props: VersioningSidebarProps) {
  return (
    <PortalElementAnchor>
      <VersioningSidebarProvider
        onClose={props.onClose}
        onError={props.onError}
        defaultNamedOnly={props.defaultNamedOnly}
        defaultComparisonMode={props.defaultComparisonMode}
        snapshotMenu={
          props.snapshotMenu === undefined ? (
            <VersionMenu />
          ) : (
            props.snapshotMenu
          )
        }
        loadingIndicator={props.loadingIndicator}
      >
        <VersioningSidebarContent
          onClose={props.onClose}
          onError={props.onError}
        />
      </VersioningSidebarProvider>
    </PortalElementAnchor>
  );
}
