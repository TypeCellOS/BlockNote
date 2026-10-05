import { Store } from "../../util/Store.js";
import type {
  VersioningState,
  VersionOperationResult,
  VersionSelection,
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
    if (transitioning || session || restoring) {
      return;
    }
    transitioning = true;
    try {
      setReadOnly(true);
      session = { view: adapter.open(), lifetime: new AbortController() };
      store.setState({
        mode: "versions",
        capturedAt: session.view.current.capturedAt,
        displayed: { type: "current" },
        history: { status: "loading" },
        restoring: false,
      });
    } catch (error) {
      if (!session) {
        setReadOnly(false);
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
      history: { status: "loading", versions: state.history.versions },
    }));
    try {
      const versions = await options.storage.list(signal);
      if (signal.aborted) {
        return { status: "cancelled" };
      }
      publish(active, signal, (state) => ({
        ...state,
        history: {
          status: "ready",
          versions: versions.toSorted((a, b) => b.createdAt - a.createdAt),
        },
      }));
      return { status: "done" };
    } catch (error) {
      if (signal.aborted) {
        return { status: "cancelled" };
      }
      publish(active, signal, (state) => ({
        ...state,
        history: { status: "failed", versions: state.history.versions },
      }));
      throw error;
    }
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
    if (selectionOptions?.compareTo && !adapter.supportsComparison) {
      return { status: "unavailable" };
    }
    active.selection?.abort();
    const request = new AbortController();
    active.selection = request;
    const signal = AbortSignal.any([active.lifetime.signal, request.signal]);
    publish(active, signal, (state) => ({ ...state, pending: target }));
    try {
      const storage = options.storage;
      const baselineId = selectionOptions?.compareTo;
      const [content, comparison] = await Promise.all([
        target.type === "current"
          ? active.view.current.content
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
            ]).then(([content, attributions]) => ({ content, attributions })),
      ]);
      if (signal.aborted) {
        return { status: "cancelled" };
      }
      active.view.show({
        content,
        comparison,
        target,
      });
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
      await storage.restore(id);
      if (!active.lifetime.signal.aborted) {
        close();
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

  return {
    store,
    open,
    close,
    list,
    select,
    restore,
    get canCompare() {
      return adapter.supportsComparison;
    },
    get canCreate() {
      return options.storage.create !== undefined;
    },
    get canRestore() {
      return options.storage.restore !== undefined;
    },
    get canRemove() {
      return options.storage.remove !== undefined;
    },
    async create(this: void, name?: string) {
      if (!session) {
        return undefined;
      }
      const storage = options.storage;
      if (!storage.create) {
        return undefined;
      }
      return storage.create(session.view.current.content, name);
    },
    get rename() {
      const storage = options.storage;
      return storage.rename?.bind(storage);
    },
    async remove(this: void, id: string): Promise<VersionOperationResult> {
      const active = session;
      if (!active) {
        return { status: "unavailable" };
      }
      const storage = options.storage;
      if (!storage.remove) {
        return { status: "unavailable" };
      }
      await storage.remove(id);
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
      const versions = state.history.versions ?? [];
      const displayed = state.displayed;
      if (
        displayed.type === "snapshot" &&
        !versions.some((version) => version.id === displayed.id)
      ) {
        return select({ type: "current" });
      }
      if (
        state.compareTo &&
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
