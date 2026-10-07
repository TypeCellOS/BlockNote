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

import { useVersioning } from "./useVersioning.js";
import type {
  VersionError,
  VersionOperationResult,
} from "@blocknote/core/extensions";

type ActionState =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "success" }
  | { status: "error"; error: VersionError };

/**
 * The versioning sidebar's own state, shared between its header and its rows.
 *
 * Owns UI state and the lifetime of pending actions. The preview and its diff
 * baseline live in the editor's versioning extension store.
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
   * A newer action or closing the sidebar skips stale follow-ups;
   * the mutation itself still completes. Thrown errors propagate to the caller.
   */
  action: ActionState;
  run: (
    action: () => Promise<VersionOperationResult>,
    onSuccess?: () =>
      | void
      | VersionOperationResult
      | Promise<void | VersionOperationResult>,
  ) => Promise<VersionOperationResult>;
  /** Cancel pending UI follow-ups and return the editor to the live document. */
  close: () => void;
  dismiss: () => void;
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
  onClose?: () => void;
  onError?: (error: unknown) => void;
}) {
  // Comparison availability is driven by the extension/adapter, not the host —
  // backends that can't diff documents report `canCompare: false`.
  const versioning = useVersioning();
  const { canCompare } = versioning;

  const [namedOnly, setNamedOnly] = useState(props.defaultNamedOnly ?? false);
  const [comparisonMode, setComparisonMode] = useState(
    props.defaultComparisonMode ?? false,
  );
  const [focusNameFor, setFocusNameFor] = useState<string>();
  const [action, setAction] = useState<ActionState>({ status: "idle" });

  const actionGeneration = useRef(0);
  const onClose = props.onClose;
  const onError = props.onError;
  const close = useCallback(() => {
    actionGeneration.current++;
    setFocusNameFor(undefined);
    setAction({ status: "idle" });
    versioning.close();
  }, [versioning]);
  useEffect(() => close, [close]);

  const run = useCallback<VersioningSidebarContextValue["run"]>(
    async function run(action, onSuccess) {
      const view = versioning.store.state;
      // Do not let an unavailable preview supersede restore's completion callback.
      if (view.mode === "versions" && view.restoring) {
        return { status: "unavailable" };
      }
      const generation = ++actionGeneration.current;
      setAction({ status: "pending" });
      try {
        let outcome = await action();
        if (
          generation === actionGeneration.current &&
          outcome.status === "done"
        ) {
          const followUp = await onSuccess?.();
          if (followUp) {
            outcome = followUp;
          }
        }
        if (generation === actionGeneration.current) {
          setAction(
            outcome.status === "error"
              ? outcome
              : { status: outcome.status === "done" ? "success" : "idle" },
          );
        }
        return outcome;
      } catch (error) {
        if (generation === actionGeneration.current) {
          setAction({ status: "idle" });
        }
        throw error;
      }
    },
    [versioning],
  );

  const value = useMemo(
    () => ({
      // Comparison can never be active when it's disabled outright.
      comparisonMode: canCompare && comparisonMode,
      setComparisonMode,
      namedOnly,
      setNamedOnly,
      snapshotMenu: props.snapshotMenu,
      loadingIndicator: props.loadingIndicator,
      action,
      run,
      close,
      dismiss: () => {
        close();
        if (onClose) {
          onClose();
        } else {
          versioning.open();
          const loading = run(() => versioning.list());
          if (onError) {
            void loading.catch(onError);
          }
        }
      },
      focusNameFor,
      setFocusNameFor,
    }),
    [
      canCompare,
      comparisonMode,
      namedOnly,
      props.snapshotMenu,
      props.loadingIndicator,
      action,
      run,
      close,
      onClose,
      onError,
      versioning,
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
