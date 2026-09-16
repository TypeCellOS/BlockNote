import { VersioningExtension } from "@blocknote/core/extensions";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useExtension } from "../../hooks/useExtension.js";

/**
 * The versioning sidebar's own state, shared between its header and its rows.
 *
 * Owns UI state and the lifetime of pending actions. The preview and its diff
 * baseline live in the editor's `VersioningExtension` store as `view`.
 */
export type VersioningSidebarContextValue = {
  /**
   * Whether showing a version diffs it against another one. Always `false` when
   * the backend can't diff documents at all (`canCompare`).
   */
  comparisonMode: boolean;
  setComparisonMode: (value: boolean) => void;
  /** Whether the list is filtered down to named versions. */
  namedOnly: boolean;
  setNamedOnly: (value: boolean) => void;
  /** The menu rendered in each row's "..." trigger. */
  snapshotMenu: ReactNode;
  /** The spinner rendered while versions load. */
  loadingIndicator: ReactNode;
  /**
   * Run an action and, if it is still the latest action, apply its UI follow-up.
   * A newer action or closing the sidebar skips stale follow-ups and notices;
   * the mutation itself still completes. Both steps must succeed to clear errors.
   */
  run: <T>(
    action: () => Promise<T>,
    onSuccess?: (result: T) => void | Promise<unknown>,
  ) => Promise<void>;
  /** Cancel pending UI follow-ups and return the editor to the live document. */
  close: () => void;
  /** Whether the last action failed. */
  failed: boolean;
  /**
   * The version whose name field should take focus as soon as its row renders.
   * Set by the row's rename action so naming is one keystroke away;
   * cleared by the row that takes it.
   */
  focusNameFor: string | undefined;
  setFocusNameFor: (id: string | undefined) => void;
};

const VersioningSidebarContext = createContext<
  VersioningSidebarContextValue | undefined
>(undefined);

export function VersioningSidebarProvider(props: {
  defaultNamedOnly?: boolean;
  defaultComparisonMode?: boolean;
  snapshotMenu: ReactNode;
  loadingIndicator: ReactNode;
  children: ReactNode;
}) {
  // Comparison availability is driven by the extension/adapter, not the host —
  // backends that can't diff documents report `canCompare: false`.
  const versioning = useExtension(VersioningExtension);
  const { canCompare } = versioning;

  const [namedOnly, setNamedOnly] = useState(props.defaultNamedOnly ?? false);
  const [comparisonMode, setComparisonMode] = useState(
    props.defaultComparisonMode ?? false,
  );
  const [failed, setFailed] = useState(false);
  const [focusNameFor, setFocusNameFor] = useState<string>();

  const pendingAction = useRef<AbortController | undefined>(undefined);
  const close = useCallback(() => {
    pendingAction.current?.abort();
    setFocusNameFor(undefined);
    versioning.exitPreview();
  }, [versioning]);
  useEffect(() => close, [close]);

  const run = useCallback(async function run<T>(
    action: () => Promise<T>,
    onSuccess?: (result: T) => void | Promise<unknown>,
  ) {
    pendingAction.current?.abort();
    const controller = new AbortController();
    pendingAction.current = controller;
    try {
      const result = await action();
      if (!controller.signal.aborted) {
        await onSuccess?.(result);
      }
      if (!controller.signal.aborted) {
        setFailed(false);
      }
    } catch (error) {
      // Unexpected failures remain visible to developers; never display their
      // messages in the sidebar or let an older action overwrite its notice.
      // eslint-disable-next-line no-console
      console.error(error);
      if (!controller.signal.aborted) {
        setFailed(true);
      }
    } finally {
      if (pendingAction.current === controller) {
        pendingAction.current = undefined;
      }
    }
  }, []);

  const value = useMemo(
    () => ({
      // Comparison can never be active when it's disabled outright.
      comparisonMode: canCompare && comparisonMode,
      setComparisonMode,
      namedOnly,
      setNamedOnly,
      snapshotMenu: props.snapshotMenu,
      loadingIndicator: props.loadingIndicator,
      run,
      close,
      failed,
      focusNameFor,
      setFocusNameFor,
    }),
    [
      canCompare,
      comparisonMode,
      namedOnly,
      props.snapshotMenu,
      props.loadingIndicator,
      run,
      close,
      failed,
      focusNameFor,
    ],
  );

  return (
    <VersioningSidebarContext.Provider value={value}>
      {props.children}
    </VersioningSidebarContext.Provider>
  );
}

export function useVersioningSidebar(): VersioningSidebarContextValue {
  const context = useContext(VersioningSidebarContext);
  if (!context) {
    throw new Error(
      "useVersioningSidebar must be used within a VersioningSidebarProvider",
    );
  }
  return context;
}
