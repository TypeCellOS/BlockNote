import { Store } from "../../util/Store.js";
import {
  reduceVersioningState,
  type VersioningEvent,
} from "./versioningState.js";
import type {
  VersioningState,
  VersionDisplay,
  VersionResult,
  VersionOperationResult,
  VersionSelection,
  VersionStorage,
  VersionView,
  VersionViewAdapter,
} from "./types.js";

/** One replaceable read per slot. The session lifetime cancels both slots. */
function createRequestSlot(lifetime: AbortSignal) {
  let current: AbortController | undefined;
  function cancel() {
    current?.abort();
  }
  function start() {
    const previous = current;
    const controller = new AbortController();
    current = controller;
    const signal = AbortSignal.any([lifetime, controller.signal]);
    // Install the replacement before notifying the cancelled request.
    previous?.abort();
    return {
      signal,
      cancel() {
        controller.abort();
      },
    };
  }
  return { start, cancel };
}

/**
 * One isolated view per opening. Every read belongs to that opening.
 * Adapter/provider callbacks and store subscribers must defer controller commands;
 * synchronous reentry and recovery after unexpected callback failures are unsupported.
 */
export function createVersioning<Content, Attributions>(options: {
  adapter: VersionViewAdapter<Content, Attributions>;
  storage: VersionStorage<Content, Attributions>;
  setReadOnly: (enabled: boolean) => void;
}) {
  const { adapter, setReadOnly } = options;
  const store = new Store<VersioningState>({ mode: "live" });
  type Session = {
    view: VersionView<Content, Attributions>;
    lifetime: AbortController;
    selection: ReturnType<typeof createRequestSlot>;
    selectionBaseline?: string;
    history: ReturnType<typeof createRequestSlot>;
    loadingMore?: Promise<VersionOperationResult>;
  };
  let session: Session | undefined;
  let disposed = false;
  let restoring = false;

  function dispatch(event: VersioningEvent) {
    const previous = store.state;
    const next = reduceVersioningState(previous, event);
    if (next !== previous) {
      store.setState(next);
    }
    return next;
  }

  function publish(signal: AbortSignal, event: VersioningEvent) {
    if (!signal.aborted) {
      return dispatch(event);
    }
    return undefined;
  }

  function open() {
    if (disposed) {
      throw new Error("Versioning has been disposed");
    }
    if (restoring) {
      return false;
    }
    if (session) {
      return true;
    }
    try {
      setReadOnly(true);
      const view = adapter.open();
      const lifetime = new AbortController();
      session = {
        view,
        lifetime,
        selection: createRequestSlot(lifetime.signal),
        history: createRequestSlot(lifetime.signal),
      };
      dispatch({
        type: "opened",
        capturedAt: session.view.current.capturedAt,
        showCurrentVersion: options.storage.showCurrentVersion ?? true,
        restoring,
      });
    } catch (error) {
      if (!session) {
        setReadOnly(restoring);
      }
      throw error;
    }
    return true;
  }

  function close() {
    if (!session) {
      return;
    }
    const closing = session;
    session = undefined;
    closing.lifetime.abort();
    closing.view.close();
    dispatch({ type: "closed", restoring });
    setReadOnly(restoring);
  }

  /** Reset history to the first page without changing the displayed preview. */
  function list(): Promise<VersionOperationResult> {
    const active = session;
    if (!active || restoring) {
      return Promise.resolve({ status: "unavailable" });
    }
    active.loadingMore = undefined;
    return readHistory(active, { operation: "refresh" });
  }

  /** Append one page. Concurrent callers share the same request. */
  function loadMore(): Promise<VersionOperationResult> {
    const active = session;
    const state = store.state;
    if (!active || restoring || state.mode !== "versions") {
      return Promise.resolve({ status: "unavailable" });
    }
    if (active.loadingMore) {
      return active.loadingMore;
    }
    if (
      state.history.status === "error" &&
      state.history.operation === "refresh"
    ) {
      return list();
    }
    if (state.nextCursor === undefined || state.history.status === "pending") {
      return Promise.resolve({ status: "unavailable" });
    }
    return readHistory(active, {
      operation: "loadMore",
      cursor: state.nextCursor,
    });
  }

  function readHistory(
    active: Session,
    read: { operation: "refresh" } | { operation: "loadMore"; cursor: string },
  ): Promise<VersionOperationResult> {
    const { signal } = active.history.start();
    publish(signal, { type: "historyStarted", operation: read.operation });
    const pending = (async (): Promise<VersionOperationResult> => {
      try {
        const result = await options.storage.list(
          signal,
          read.operation === "refresh" ? undefined : read.cursor,
        );
        if (signal.aborted) {
          return { status: "cancelled" };
        }
        if (!result.ok) {
          publish(signal, {
            type: "historyFailed",
            operation: read.operation,
            error: result.error,
          });
          return { status: "error", error: result.error };
        }
        if (
          read.operation === "loadMore" &&
          result.value.nextCursor === read.cursor
        ) {
          throw new Error("Version history cursor did not advance");
        }
        const loaded = publish(signal, {
          type: "historyLoaded",
          operation: read.operation,
          ...result.value,
        });
        if (signal.aborted) {
          return { status: "cancelled" };
        }
        if (
          loaded?.mode === "versions" &&
          loaded.showCurrentVersion === false &&
          loaded.displayed.type === "current" &&
          !loaded.pending &&
          loaded.history.data?.[0]
        ) {
          return select({ type: "snapshot", id: loaded.history.data[0].id });
        }
        return { status: "done" };
      } catch (error) {
        if (signal.aborted) {
          return { status: "cancelled" };
        }
        throw error;
      } finally {
        if (!signal.aborted) {
          active.loadingMore = undefined;
        }
      }
    })();
    if (read.operation === "loadMore" && !signal.aborted) {
      active.loadingMore = pending;
    }
    return pending;
  }

  async function loadDisplay(
    active: Session,
    target: VersionSelection,
    baselineId: string | undefined,
    signal: AbortSignal,
  ): Promise<VersionResult<VersionDisplay<Content, Attributions>>> {
    const storage = options.storage;
    const [content, comparison] = await Promise.all([
      target.type === "current"
        ? { ok: true as const, value: active.view.current.content }
        : storage.getContent(target.id, signal),
      baselineId === undefined
        ? undefined
        : Promise.all([
            storage.getContent(baselineId, signal, { baseline: true }),
            storage.getAttributions?.(
              target,
              baselineId,
              active.view.current.capturedAt,
              signal,
            ),
          ]),
    ]);
    if (!content.ok) {
      return content;
    }
    if (!comparison) {
      return { ok: true, value: { content: content.value, target } };
    }
    const [baseline, attributions] = comparison;
    if (!baseline.ok) {
      return baseline;
    }
    if (attributions && !attributions.ok) {
      return attributions;
    }
    return {
      ok: true,
      value: {
        content: content.value,
        target,
        comparison: {
          content: baseline.value,
          attributions: attributions?.value,
        },
      },
    };
  }

  async function select(
    target: VersionSelection,
    selectionOptions?: { compareTo?: string },
  ): Promise<VersionOperationResult> {
    const active = session;
    if (!active || restoring) {
      return { status: "unavailable" };
    }
    if (
      target.type === "current" &&
      options.storage.showCurrentVersion === false
    ) {
      const state = store.state;
      const latest =
        state.mode === "versions" ? state.history.data?.[0] : undefined;
      if (!latest) {
        return { status: "unavailable" };
      }
      target = { type: "snapshot", id: latest.id };
    }
    if (
      selectionOptions?.compareTo !== undefined &&
      !adapter.supportsComparison
    ) {
      return { status: "unavailable" };
    }
    const request = active.selection.start();
    const { signal } = request;
    active.selectionBaseline = selectionOptions?.compareTo;
    publish(signal, { type: "selectionStarted", target });
    const baselineId = selectionOptions?.compareTo;
    try {
      const result = await loadDisplay(active, target, baselineId, signal);
      if (signal.aborted) {
        return { status: "cancelled" };
      }
      if (!result.ok) {
        publish(signal, { type: "selectionFailed" });
        return { status: "error", error: result.error };
      }
      active.view.show(result.value);
      publish(signal, {
        type: "selectionShown",
        target,
        compareTo: baselineId,
      });
      return { status: "done" };
    } catch (error) {
      if (signal.aborted) {
        return { status: "cancelled" };
      }
      publish(signal, { type: "selectionFailed" });
      request.cancel();
      throw error;
    }
  }

  async function restore(id: string): Promise<VersionOperationResult> {
    const active = session;
    if (!active || restoring) {
      return { status: "unavailable" };
    }
    const storage = options.storage;
    if (!storage.restore) {
      return { status: "unavailable" };
    }
    restoring = true;
    try {
      active.selection.cancel();
      publish(active.lifetime.signal, {
        type: "restoreChanged",
        restoring: true,
      });
      const result = await storage.restore(id);
      if (!result.ok) {
        return { status: "error", error: result.error };
      }
      close();
      return { status: "done" };
    } finally {
      restoring = false;
      dispatch({ type: "restoreChanged", restoring: false });
      if (!session) {
        setReadOnly(false);
      }
    }
  }

  async function refreshAfterNaming(
    active: Session,
    event: Extract<
      VersioningEvent,
      { type: "snapshotRenamed" | "snapshotCreated" }
    >,
  ) {
    publish(active.lifetime.signal, event);
    if (!active.lifetime.signal.aborted) {
      await list();
    }
  }

  async function rename(
    id: string,
    name?: string,
  ): Promise<VersionOperationResult> {
    const active = session;
    const storage = options.storage;
    if (restoring || !storage.rename) {
      return { status: "unavailable" };
    }
    const result = await storage.rename(id, name);
    if (!result.ok) {
      return { status: "error", error: result.error };
    }
    if (active) {
      await refreshAfterNaming(active, { type: "snapshotRenamed", id, name });
    }
    return { status: "done" };
  }

  function references(
    active: Session,
    state: Extract<VersioningState, { mode: "versions" }>,
    id: string,
  ) {
    return (
      (state.displayed.type === "snapshot" && state.displayed.id === id) ||
      (state.pending?.type === "snapshot" && state.pending.id === id) ||
      (state.pending !== undefined && active.selectionBaseline === id) ||
      state.compareTo === id
    );
  }

  return {
    store,
    open,
    close,
    list,
    loadMore,
    select,
    restore,
    rename,
    get canCompare() {
      return adapter.supportsComparison;
    },
    get historyIncludesBeginning() {
      return options.storage.historyIncludesBeginning === true;
    },
    get canCreate() {
      return options.storage.create !== undefined;
    },
    get canRename() {
      return options.storage.rename !== undefined;
    },
    get canRestore() {
      return options.storage.restore !== undefined;
    },
    get canRemove() {
      return options.storage.remove !== undefined;
    },
    async create(this: void, name?: string): Promise<VersionOperationResult> {
      const active = session;
      const storage = options.storage;
      if (!active || restoring || !storage.create) {
        return { status: "unavailable" };
      }
      const current = active.view.current;
      const result = await storage.create(
        current.content,
        name,
        current.capturedAt,
      );
      if (!result.ok) {
        return { status: "error", error: result.error };
      }
      await refreshAfterNaming(active, {
        type: "snapshotCreated",
        snapshot: result.value,
      });
      return { status: "done" };
    },
    async remove(this: void, id: string): Promise<VersionOperationResult> {
      const active = session;
      const storage = options.storage;
      if (!active || restoring || !storage.remove) {
        return { status: "unavailable" };
      }
      const removed = await storage.remove(id);
      if (!removed.ok) {
        return { status: "error", error: removed.error };
      }
      if (!active.lifetime.signal.aborted) {
        await list();
        // Missing page metadata does not prove deletion. Continuous-history
        // providers may only clear a name, leaving its content available.
        const state = store.state;
        if (state.mode === "versions" && references(active, state, id)) {
          const content = await storage.getContent(id, active.lifetime.signal);
          const current = store.state;
          if (
            !active.lifetime.signal.aborted &&
            !content.ok &&
            content.error.type === "not-found" &&
            current.mode === "versions" &&
            references(active, current, id)
          ) {
            await select(
              (current.displayed.type === "snapshot" &&
                current.displayed.id === id) ||
                (current.pending?.type === "snapshot" &&
                  current.pending.id === id)
                ? { type: "current" }
                : current.displayed,
            );
          }
        }
      }
      return { status: "done" };
    },
    dispose() {
      disposed = true;
      close();
    },
  };
}
