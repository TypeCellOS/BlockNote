import { Store } from "../../util/Store.js";
import type {
  VersioningState,
  VersionDisplay,
  VersionResult,
  VersionOperationResult,
  VersionSelection,
  VersionSnapshot,
  VersionStorage,
  VersionView,
  VersionViewAdapter,
} from "./types.js";

/** One isolated view per opening. Every read belongs to that opening. */
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
    selection?: AbortController;
    listing?: AbortController;
  };
  type PreviewState = Extract<VersioningState, { mode: "versions" }>;
  let session: Session | undefined;
  let transitioning = false;
  let closeRequested = false;
  let disposed = false;
  let restoring = false;

  function publish(
    active: Session,
    signal: AbortSignal,
    update: (state: PreviewState) => PreviewState,
  ) {
    if (
      session === active &&
      !signal.aborted &&
      store.state.mode === "versions"
    ) {
      store.setState(update(store.state));
    }
  }

  function open() {
    if (disposed) {
      throw new Error("Versioning has been disposed");
    }
    if (transitioning || session) {
      return;
    }
    transitioning = true;
    try {
      setReadOnly(true);
      session = { view: adapter.open(), lifetime: new AbortController() };
      store.setState({
        mode: "versions",
        capturedAt: session.view.current.capturedAt,
        showCurrentVersion: options.storage.showCurrentVersion ?? true,
        displayed: { type: "current" },
        history: { status: "pending" },
        restoring,
      });
    } catch (error) {
      if (!session) {
        setReadOnly(restoring);
      }
      throw error;
    } finally {
      transitioning = false;
      const shouldClose = closeRequested || disposed;
      closeRequested = false;
      if (shouldClose) {
        close();
      }
    }
  }

  function close() {
    if (transitioning) {
      // Opening must return its owned view before a reentrant close can discard it.
      closeRequested = true;
      return;
    }
    if (!session) {
      return;
    }
    transitioning = true;
    const closing = session;
    try {
      closing.lifetime.abort();
      closing.view.close();
      session = undefined;
      store.setState({ mode: "live" });
      setReadOnly(restoring);
    } finally {
      transitioning = false;
      closeRequested = false;
    }
  }

  async function list(): Promise<VersionOperationResult> {
    const active = session;
    if (transitioning || !active || active.lifetime.signal.aborted) {
      return { status: "unavailable" };
    }
    active.listing?.abort();
    const request = new AbortController();
    active.listing = request;
    const signal = AbortSignal.any([active.lifetime.signal, request.signal]);
    publish(active, signal, (state) => ({
      ...state,
      history: { status: "pending", data: state.history.data },
    }));
    try {
      const result = await options.storage.list(signal);
      if (signal.aborted) {
        return { status: "cancelled" };
      }
      if (!result.ok) {
        publish(active, signal, (state) => ({
          ...state,
          history: {
            status: "error",
            error: result.error,
            data: state.history.data,
          },
        }));
        return { status: "error", error: result.error };
      }
      const versions = result.value.toSorted(
        (a, b) => b.createdAt - a.createdAt,
      );
      publish(active, signal, (state) => ({
        ...state,
        history: {
          status: "success",
          data: versions,
        },
      }));
      const state = store.state;
      if (
        state.mode === "versions" &&
        state.showCurrentVersion === false &&
        state.displayed.type === "current" &&
        state.pending === undefined &&
        versions[0] &&
        session === active &&
        !signal.aborted &&
        !restoring
      ) {
        return select({ type: "snapshot", id: versions[0].id });
      }
      return { status: "done" };
    } catch (error) {
      if (signal.aborted) {
        return { status: "cancelled" };
      }
      throw error;
    }
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
            storage.getContent(baselineId, signal),
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
    if (
      transitioning ||
      !active ||
      active.lifetime.signal.aborted ||
      restoring
    ) {
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
    active.selection?.abort();
    const request = new AbortController();
    active.selection = request;
    const signal = AbortSignal.any([active.lifetime.signal, request.signal]);
    publish(active, signal, (state) => ({ ...state, pending: target }));
    const baselineId = selectionOptions?.compareTo;
    try {
      const result = await loadDisplay(active, target, baselineId, signal);
      if (signal.aborted) {
        return { status: "cancelled" };
      }
      if (!result.ok) {
        publish(active, signal, (state) => ({ ...state, pending: undefined }));
        return { status: "error", error: result.error };
      }
      active.view.show(result.value);
      publish(active, signal, (state) => ({
        ...state,
        displayed: target,
        compareTo: baselineId,
        pending: undefined,
      }));
      return { status: "done" };
    } catch (error) {
      if (signal.aborted) {
        return { status: "cancelled" };
      }
      publish(active, signal, (state) => ({ ...state, pending: undefined }));
      request.abort();
      throw error;
    }
  }

  async function restore(id: string): Promise<VersionOperationResult> {
    const active = session;
    if (
      transitioning ||
      !active ||
      active.lifetime.signal.aborted ||
      restoring
    ) {
      return { status: "unavailable" };
    }
    const storage = options.storage;
    if (!storage.restore) {
      return { status: "unavailable" };
    }
    restoring = true;
    try {
      active.selection?.abort();
      publish(active, active.lifetime.signal, (state) => ({
        ...state,
        restoring: true,
        pending: undefined,
      }));
      const result = await storage.restore(id);
      if (!result.ok) {
        return { status: "error", error: result.error };
      }
      restoring = false;
      const reopened = session !== undefined && session !== active;
      if (session) {
        close();
      }
      // A newer opening still owns a preview. Replace its pre-restore capture
      // with the restored Current instead of leaving that caller in live mode.
      if (reopened) {
        open();
        await list();
      }
      return { status: "done" };
    } finally {
      restoring = false;
      if (store.state.mode === "versions") {
        store.setState({ ...store.state, restoring: false });
      } else {
        setReadOnly(false);
      }
    }
  }

  async function refreshAfterNaming(
    active: Session,
    update: (versions: VersionSnapshot[]) => VersionSnapshot[],
  ) {
    publish(active, active.lifetime.signal, (state) => ({
      ...state,
      history: { status: "success", data: update(state.history.data ?? []) },
    }));
    if (session === active && !active.lifetime.signal.aborted) {
      await list();
    }
  }

  async function rename(
    id: string,
    name?: string,
  ): Promise<VersionOperationResult> {
    const active = session;
    const storage = options.storage;
    if (!storage.rename) {
      return { status: "unavailable" };
    }
    const result = await storage.rename(id, name);
    if (!result.ok) {
      return { status: "error", error: result.error };
    }
    if (active) {
      await refreshAfterNaming(active, (versions) =>
        versions.map((version) =>
          version.id === id ? { ...version, name } : version,
        ),
      );
    }
    return { status: "done" };
  }

  return {
    store,
    open,
    close,
    list,
    select,
    restore,
    rename,
    get canCompare() {
      return adapter.supportsComparison;
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
      if (!active || !storage.create) {
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
      const created = result.value;
      await refreshAfterNaming(active, (versions) => [
        created,
        ...versions.filter((version) => version.id !== created.id),
      ]);
      return { status: "done" };
    },
    async remove(this: void, id: string): Promise<VersionOperationResult> {
      const active = session;
      const storage = options.storage;
      if (!active || !storage.remove) {
        return { status: "unavailable" };
      }
      const removed = await storage.remove(id);
      if (!removed.ok) {
        return { status: "error", error: removed.error };
      }
      if (active.lifetime.signal.aborted) {
        return { status: "cancelled" };
      }
      const result = await list();
      const state = store.state;
      if (
        result.status !== "done" ||
        active.lifetime.signal.aborted ||
        state.mode !== "versions"
      ) {
        return result;
      }
      const versions = state.history.data ?? [];
      const displayed = state.displayed;
      if (
        displayed.type === "snapshot" &&
        !versions.some((version) => version.id === displayed.id)
      ) {
        return select({ type: "current" });
      }
      if (
        state.compareTo !== undefined &&
        !versions.some((version) => version.id === state.compareTo)
      ) {
        return select(state.displayed);
      }
      return result;
    },
    dispose() {
      disposed = true;
      close();
    },
  };
}
