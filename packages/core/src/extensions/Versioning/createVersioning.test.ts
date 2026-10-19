// @vitest-environment node
import { describe, expect, it, vi } from "vite-plus/test";
import { createVersioning } from "./createVersioning.js";
import { reduceVersioningState } from "./versioningState.js";
import type {
  VersionResult,
  VersionSnapshotPage,
  VersionStorage,
  VersionViewAdapter,
} from "./types.js";
import { success } from "./__test__/result.js";

describe("published state transitions", () => {
  const opened = reduceVersioningState(
    { mode: "live" },
    {
      type: "opened",
      capturedAt: 10,
      showCurrentVersion: true,
      restoring: false,
    },
  );
  const loaded = reduceVersioningState(opened, {
    type: "historyLoaded",
    operation: "refresh",
    snapshots: [{ id: "a", createdAt: 9 }],
    nextCursor: "older",
  });

  it("retains rows and cursor while loading or failing, then clears the error on append", () => {
    const pending = reduceVersioningState(loaded, {
      type: "historyStarted",
      operation: "loadMore",
    });
    expect(pending).toMatchObject({
      nextCursor: "older",
      history: { status: "pending", data: [{ id: "a" }] },
    });
    const failed = reduceVersioningState(pending, {
      type: "historyFailed",
      operation: "loadMore",
      error: { type: "network" },
    });
    expect(failed).toMatchObject({
      nextCursor: "older",
      history: { status: "error", data: [{ id: "a" }] },
    });
    const appended = reduceVersioningState(failed, {
      type: "historyLoaded",
      operation: "loadMore",
      snapshots: [
        { id: "b", createdAt: 1 },
        { id: "a", createdAt: 9, name: "Updated" },
      ],
    });
    expect(appended).toMatchObject({
      nextCursor: undefined,
      history: {
        status: "success",
        data: [{ id: "a", name: "Updated" }, { id: "b" }],
      },
    });
    if (appended.mode === "versions") {
      expect(appended.history).not.toHaveProperty("error");
      expect(appended.history).not.toHaveProperty("operation");
    }
  });

  it("replaces history on refresh instead of keeping removed rows", () => {
    expect(
      reduceVersioningState(loaded, {
        type: "historyLoaded",
        operation: "refresh",
        snapshots: [],
      }),
    ).toMatchObject({
      nextCursor: undefined,
      history: { status: "success", data: [] },
    });
  });

  it("keeps the displayed comparison when a new selection fails", () => {
    const shown = reduceVersioningState(loaded, {
      type: "selectionShown",
      target: { type: "snapshot", id: "a" },
      compareTo: "b",
    });
    const pending = reduceVersioningState(shown, {
      type: "selectionStarted",
      target: { type: "current" },
    });
    expect(
      reduceVersioningState(pending, { type: "selectionFailed" }),
    ).toMatchObject({
      displayed: { type: "snapshot", id: "a" },
      compareTo: "b",
      pending: undefined,
    });
    expect(shown).toMatchObject({ pending: undefined });
  });

  it("publishes naming changes without mutating previous rows or dropping the cursor", () => {
    const renamed = reduceVersioningState(loaded, {
      type: "snapshotRenamed",
      id: "a",
      name: "Named",
    });
    const created = reduceVersioningState(renamed, {
      type: "snapshotCreated",
      snapshot: { id: "new", createdAt: 10 },
    });
    expect(created).toMatchObject({
      nextCursor: "older",
      history: { data: [{ id: "new" }, { id: "a", name: "Named" }] },
    });
    if (loaded.mode === "versions") {
      expect(loaded.history.data).toEqual([{ id: "a", createdAt: 9 }]);
    }
  });

  it("clears a pending selection when restore starts and ignores preview events after closing", () => {
    const pending = reduceVersioningState(loaded, {
      type: "selectionStarted",
      target: { type: "current" },
    });
    expect(
      reduceVersioningState(pending, {
        type: "restoreChanged",
        restoring: true,
      }),
    ).toMatchObject({ restoring: true, pending: undefined });
    const closed = reduceVersioningState(pending, { type: "closed" });
    expect(
      reduceVersioningState(closed, {
        type: "historyStarted",
        operation: "refresh",
      }),
    ).toBe(closed);
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function setup(overrides: Partial<VersionStorage<string>> = {}) {
  const show = vi.fn();
  const close = vi.fn();
  const open = vi.fn(() => ({
    current: { content: "frozen", capturedAt: 10 },
    show,
    close,
  }));
  const adapter: VersionViewAdapter<string> = {
    supportsComparison: false,
    open,
  };
  const storage: VersionStorage<string> = {
    list: async () => success({ snapshots: [] }),
    getContent: async (id) => success(id),
    ...overrides,
  };
  const setReadOnly = vi.fn();
  return {
    mode: createVersioning({ adapter, storage, setReadOnly }),
    show,
    close,
    open,
    setReadOnly,
  };
}

it.each([undefined, true, false])(
  "opens history with showCurrentVersion=%s",
  async (showCurrentVersion) => {
    const latest = { id: "latest", createdAt: 9 };
    const getContent = vi.fn(async (id: string) => success(id));
    const { mode, show } = setup({
      showCurrentVersion,
      list: async () =>
        success({ snapshots: [{ id: "old", createdAt: 1 }, latest] }),
      getContent,
    });
    mode.open();
    expect(await mode.list()).toEqual({ status: "done" });
    expect(mode.store.state).toMatchObject({
      displayed:
        showCurrentVersion === false
          ? { type: "snapshot", id: "latest" }
          : { type: "current" },
    });
    if (showCurrentVersion === false) {
      expect(getContent).toHaveBeenCalledWith(
        "latest",
        expect.any(AbortSignal),
      );
      expect(show).toHaveBeenLastCalledWith({
        content: "latest",
        target: { type: "snapshot", id: "latest" },
      });
    } else {
      expect(getContent).not.toHaveBeenCalled();
    }
    mode.close();
  },
);

it.each([undefined, false, true])(
  "exposes beginning comparisons only when storage guarantees its first version, policy=%s",
  (historyIncludesBeginning) => {
    const { mode } = setup({ historyIncludesBeginning });
    expect(mode.historyIncludesBeginning).toBe(
      historyIncludesBeginning === true,
    );
  },
);

it("defers storage access and binds detached rename to the original storage", async () => {
  const storage: VersionStorage<string> = {
    async list() {
      return success({ snapshots: [] });
    },
    async getContent(id) {
      return success(id);
    },
    async rename() {
      expect(this).toBe(storage);
      return success(undefined);
    },
  };
  const getStorage = vi.fn(() => storage);
  const mode = createVersioning({
    adapter: {
      supportsComparison: false,
      open() {
        return {
          current: { content: "frozen", capturedAt: 1 },
          show() {},
          close() {},
        };
      },
    },
    get storage() {
      return getStorage();
    },
    setReadOnly() {},
  });
  expect(getStorage).not.toHaveBeenCalled();
  expect(mode.canCreate).toBe(false);
  expect(getStorage).toHaveBeenCalledTimes(1);
  const rename = mode.rename;
  await rename("old", "Named");
});

it.each(["create", "rename"] as const)(
  "publishes a successful %s locally before refresh and keeps success if refresh fails",
  async (operation) => {
    const original = { id: "old", createdAt: 5, name: "Original" };
    const refresh = deferred<VersionResult<VersionSnapshotPage>>();
    const list = vi
      .fn()
      .mockResolvedValueOnce(success({ snapshots: [original] }))
      .mockReturnValueOnce(refresh.promise);
    const { mode } = setup({
      list,
      create: async () => success({ ...original, name: "Submitted" }),
      rename: async () => success(undefined),
    });
    mode.open();
    await mode.list();
    const saving =
      operation === "create"
        ? mode.create("Submitted")
        : mode.rename("old", "Submitted");
    await vi.waitFor(() =>
      expect(mode.store.state).toMatchObject({
        history: {
          status: "pending",
          data: [{ ...original, name: "Submitted" }],
        },
      }),
    );
    refresh.resolve({ ok: false, error: { type: "network" } });
    expect(await saving).toEqual({ status: "done" });
    expect(mode.store.state).toMatchObject({
      history: {
        status: "error",
        error: { type: "network" },
        data: [{ ...original, name: "Submitted" }],
      },
    });
    mode.close();
  },
);

it.each(["create", "rename"] as const)(
  "keeps the stored name and skips refresh after a failed %s",
  async (operation) => {
    const original = { id: "old", createdAt: 5, name: "Original" };
    const list = vi.fn(async () => success({ snapshots: [original] }));
    const { mode } = setup({
      list,
      create: async () => ({ ok: false, error: { type: "conflict" } }),
      rename: async () => ({ ok: false, error: { type: "conflict" } }),
    });
    mode.open();
    await mode.list();
    const result = await (operation === "create"
      ? mode.create("Submitted")
      : mode.rename("old", "Submitted"));
    expect(result).toEqual({ status: "error", error: { type: "conflict" } });
    expect(list).toHaveBeenCalledOnce();
    expect(mode.store.state).toMatchObject({
      history: { status: "success", data: [original] },
    });
    mode.close();
  },
);

it("opens immediately without history, reuses its capture, and closes once", async () => {
  const { mode, open, close, show, setReadOnly } = setup();
  mode.open();
  mode.open();
  expect(open).toHaveBeenCalledTimes(1);
  expect(setReadOnly).toHaveBeenCalledWith(true);
  expect(mode.store.state.mode).toBe("versions");
  await mode.select({ type: "snapshot", id: "old" });
  await mode.select({ type: "current" });
  expect(show.mock.lastCall?.[0].content).toBe("frozen");
  mode.close();
  mode.close();
  expect(close).toHaveBeenCalledTimes(1);
  expect(setReadOnly).toHaveBeenLastCalledWith(false);
});

it("ignores endpoints that finish after abort, including across reopen", async () => {
  const slow = deferred<string>();
  const { mode, show } = setup({
    getContent: async () => success(await slow.promise),
  });
  mode.open();
  const old = mode.select({ type: "snapshot", id: "slow" });
  await mode.select({ type: "current" });
  mode.close();
  mode.open();
  slow.resolve("stale");
  expect(await old).toEqual({ status: "cancelled" });
  expect(show).toHaveBeenCalledTimes(1);
  expect(mode.store.state).toMatchObject({
    mode: "versions",
    displayed: { type: "current" },
  });
});

it("a failed fetch retains the displayed selection and version mode", async () => {
  const { mode, close } = setup({
    getContent: async () => {
      throw new Error("network");
    },
  });
  mode.open();
  await expect(
    mode.select({ type: "snapshot", id: "missing" }),
  ).rejects.toThrow("network");
  expect(mode.store.state).toMatchObject({
    mode: "versions",
    displayed: { type: "current" },
    pending: undefined,
  });
  expect(close).not.toHaveBeenCalled();
});

it("stale history cannot publish into a later opening", async () => {
  const pending = deferred<[]>();
  const { mode } = setup({
    list: async () => success({ snapshots: await pending.promise }),
  });
  mode.open();
  const list = mode.list();
  mode.close();
  mode.open();
  pending.resolve([]);
  expect(await list).toEqual({ status: "cancelled" });
  expect(mode.store.state).toMatchObject({ history: { status: "pending" } });
});

it("restores live content once, blocks selection, then closes version mode", async () => {
  const pending = deferred<void>();
  const restore = vi.fn(async () => success(await pending.promise));
  const { mode, close, setReadOnly } = setup({ restore });
  mode.open();
  const result = mode.restore("old");
  expect(await mode.restore("another")).toEqual({ status: "unavailable" });
  expect(await mode.select({ type: "current" })).toEqual({
    status: "unavailable",
  });
  pending.resolve();
  expect(await result).toEqual({ status: "done" });
  expect(restore).toHaveBeenCalledTimes(1);
  expect(close).toHaveBeenCalledTimes(1);
  expect(mode.store.state.mode).toBe("live");
  expect(setReadOnly).toHaveBeenLastCalledWith(false);
});

it("blocks opening during restore and keeps editing restricted until it completes", async () => {
  const pending = deferred<VersionResult<void>>();
  const { mode, open, setReadOnly } = setup({
    restore: () => pending.promise,
  });
  mode.open();
  const restoring = mode.restore("old");
  mode.close();
  expect(mode.open()).toBe(false);
  expect(open).toHaveBeenCalledOnce();
  expect(mode.store.state).toEqual({ mode: "live", restoring: true });
  expect(setReadOnly).toHaveBeenLastCalledWith(true);
  pending.resolve(success(undefined));
  expect(await restoring).toEqual({ status: "done" });
  expect(setReadOnly).toHaveBeenLastCalledWith(false);
  expect(mode.open()).toBe(true);
  expect(open).toHaveBeenCalledTimes(2);
});

it("releases the restore lock if publishing busy state throws", async () => {
  const restore = vi.fn(async () => success(undefined));
  const { mode } = setup({ restore });
  const cause = new Error("subscriber failed");
  mode.open();
  const unsubscribe = mode.store.subscribe(({ currentVal }) => {
    if (currentVal.mode === "versions" && currentVal.restoring) {
      unsubscribe();
      throw cause;
    }
  });
  await expect(mode.restore("old")).rejects.toBe(cause);
  expect(mode.store.state).toMatchObject({ restoring: false });
  expect(restore).not.toHaveBeenCalled();
  expect(await mode.restore("old")).toEqual({ status: "done" });
  expect(restore).toHaveBeenCalledTimes(1);
  expect(mode.store.state).toEqual({ mode: "live" });
});

it("creates from frozen current even while displaying history", async () => {
  const create = vi.fn(async () => success({ id: "new", createdAt: 11 }));
  const { mode } = setup({ create });
  mode.open();
  await mode.select({ type: "snapshot", id: "old" });
  await mode.create("Named");
  expect(create).toHaveBeenCalledWith("frozen", "Named", 10);
});

it("keeps a selected checkpoint when removal only clears its name", async () => {
  const { mode, show } = setup({
    remove: async () => success(undefined),
    list: async () => success({ snapshots: [{ id: "old", createdAt: 1 }] }),
  });
  mode.open();
  await mode.select({ type: "snapshot", id: "old" });
  show.mockClear();
  expect(await mode.remove("old")).toEqual({ status: "done" });
  expect(show).not.toHaveBeenCalled();
  expect(mode.store.state).toMatchObject({
    displayed: { type: "snapshot", id: "old" },
  });
});

it("returns to frozen current if removal deletes the selected content", async () => {
  let deleted = false;
  const { mode, show, close } = setup({
    remove: async () => {
      deleted = true;
      return success(undefined);
    },
    getContent: async (id) =>
      deleted ? { ok: false, error: { type: "not-found" } } : success(id),
  });
  mode.open();
  await mode.select({ type: "snapshot", id: "old" });
  expect(await mode.remove("old")).toEqual({ status: "done" });
  expect(show.mock.lastCall?.[0].content).toBe("frozen");
  expect(close).not.toHaveBeenCalled();
});

it("retains loaded history on an expected refresh failure and clears it on retry", async () => {
  const data = [{ id: "old", createdAt: 1 }];
  const list = vi
    .fn<VersionStorage<string>["list"]>()
    .mockResolvedValueOnce(success({ snapshots: data }))
    .mockResolvedValueOnce({ ok: false, error: { type: "network" } })
    .mockResolvedValueOnce(success({ snapshots: data }));
  const { mode } = setup({ list });
  mode.open();
  await mode.list();
  expect(await mode.list()).toEqual({
    status: "error",
    error: { type: "network" },
  });
  expect(mode.store.state).toMatchObject({
    history: { status: "error", data, error: { type: "network" } },
  });
  await mode.list();
  expect(mode.store.state).toMatchObject({
    history: { status: "success", data },
  });
});

it("keeps the previous preview on an expected selection failure and permits retry", async () => {
  const getContent = vi
    .fn<VersionStorage<string>["getContent"]>()
    .mockResolvedValueOnce({ ok: false, error: { type: "not-found" } })
    .mockResolvedValueOnce(success("old"));
  const { mode, show } = setup({ getContent });
  mode.open();
  expect(await mode.select({ type: "snapshot", id: "old" })).toEqual({
    status: "error",
    error: { type: "not-found" },
  });
  expect(show).not.toHaveBeenCalled();
  expect(mode.store.state).toMatchObject({
    displayed: { type: "current" },
    pending: undefined,
  });
  expect(await mode.select({ type: "snapshot", id: "old" })).toEqual({
    status: "done",
  });
});

it.each([true, false])(
  "reconciles a pending comparison only when removal deletes its baseline (%s)",
  async (deletesContent) => {
    const baseline = deferred<VersionResult<string>>();
    let removed = false;
    const show = vi.fn();
    const mode = createVersioning({
      adapter: {
        supportsComparison: true,
        open: () => ({
          current: { content: "frozen", capturedAt: 10 },
          show,
          close: vi.fn(),
        }),
      },
      storage: {
        list: async () => success({ snapshots: [] }),
        getContent: async (id) => {
          if (id !== "baseline") {
            return success(id);
          }
          if (!removed) {
            return baseline.promise;
          }
          return deletesContent
            ? { ok: false, error: { type: "not-found" } }
            : success("baseline");
        },
        remove: async () => {
          removed = true;
          return success(undefined);
        },
      },
      setReadOnly: vi.fn(),
    });
    mode.open();
    const selection = mode.select(
      { type: "snapshot", id: "target" },
      { compareTo: "baseline" },
    );
    expect(await mode.remove("baseline")).toEqual({ status: "done" });
    baseline.resolve(success("baseline"));
    expect(await selection).toEqual({
      status: deletesContent ? "cancelled" : "done",
    });
    expect(show).toHaveBeenLastCalledWith(
      deletesContent
        ? { content: "frozen", target: { type: "current" } }
        : {
            content: "target",
            target: { type: "snapshot", id: "target" },
            comparison: { content: "baseline", attributions: undefined },
          },
    );
    mode.dispose();
  },
);

it("does not refresh history or change the preview after failed removal", async () => {
  const list = vi.fn(async () => success({ snapshots: [] }));
  const { mode, show } = setup({
    list,
    remove: async () => ({ ok: false, error: { type: "forbidden" } }),
  });
  mode.open();
  await mode.select({ type: "snapshot", id: "old" });
  show.mockClear();
  expect(await mode.remove("old")).toEqual({
    status: "error",
    error: { type: "forbidden" },
  });
  expect(list).not.toHaveBeenCalled();
  expect(show).not.toHaveBeenCalled();
});

it.each(["success", "error"] as const)(
  "can reopen after a closed restore finishes with %s",
  async (outcome) => {
    const pending = deferred<VersionResult<void>>();
    const { mode, open, setReadOnly } = setup({
      restore: () => pending.promise,
    });
    mode.open();
    const restore = mode.restore("old");
    mode.close();
    expect(setReadOnly).toHaveBeenLastCalledWith(true);
    expect(mode.open()).toBe(false);
    expect(open).toHaveBeenCalledOnce();
    expect(mode.store.state).toEqual({ mode: "live", restoring: true });
    expect(await mode.list()).toEqual({ status: "unavailable" });
    pending.resolve(
      outcome === "success"
        ? success(undefined)
        : { ok: false, error: { type: "timeout", outcome: "unknown" } },
    );
    await restore;
    expect(setReadOnly).toHaveBeenLastCalledWith(false);
    expect(mode.open()).toBe(true);
    await mode.list();
    expect(mode.store.state).toMatchObject({
      mode: "versions",
      displayed: { type: "current" },
      restoring: false,
      history: { status: "success" },
    });
    expect(open).toHaveBeenCalledTimes(2);
    mode.close();
    expect(setReadOnly).toHaveBeenLastCalledWith(false);
  },
);

describe("pagination", () => {
  const newest = { id: "newest", createdAt: 100 };
  const middle = { id: "middle", createdAt: 80 };
  const oldest = { id: "oldest", createdAt: 60 };

  it("appends deduplicated metadata without changing the displayed version and stops at exhaustion", async () => {
    const list = vi
      .fn<VersionStorage<string>["list"]>()
      .mockResolvedValueOnce(
        success({ snapshots: [newest, middle], nextCursor: "older" }),
      )
      .mockResolvedValueOnce(
        success({ snapshots: [{ ...middle, name: "Updated" }, oldest] }),
      );
    const { mode, show } = setup({ list });
    mode.open();
    await mode.list();
    await mode.select({ type: "snapshot", id: middle.id });
    await mode.loadMore();
    expect(mode.store.state).toMatchObject({
      displayed: { type: "snapshot", id: middle.id },
      history: {
        status: "success",
        data: [newest, { ...middle, name: "Updated" }, oldest],
      },
      nextCursor: undefined,
    });
    expect(show.mock.lastCall?.[0].content).toBe(middle.id);
    expect(await mode.loadMore()).toEqual({ status: "unavailable" });
    expect(list).toHaveBeenCalledTimes(2);
  });

  it("shares concurrent loads, retains history on failure, and loads again only on request", async () => {
    const page = deferred<VersionResult<VersionSnapshotPage>>();
    const list = vi
      .fn<VersionStorage<string>["list"]>()
      .mockResolvedValueOnce(
        success({ snapshots: [newest], nextCursor: "older" }),
      )
      .mockReturnValueOnce(page.promise)
      .mockResolvedValueOnce(success({ snapshots: [middle] }));
    const { mode } = setup({ list });
    mode.open();
    await mode.list();
    const first = mode.loadMore();
    expect(mode.loadMore()).toBe(first);
    expect(mode.store.state).toMatchObject({
      history: { status: "pending", data: [newest] },
    });
    page.resolve({ ok: false, error: { type: "network" } });
    expect(await first).toEqual({
      status: "error",
      error: { type: "network" },
    });
    expect(mode.store.state).toMatchObject({
      history: { status: "error", data: [newest] },
      nextCursor: "older",
    });
    expect(list).toHaveBeenCalledTimes(2);
    await mode.loadMore();
    expect(mode.store.state).toMatchObject({
      history: { status: "success", data: [newest, middle] },
    });
  });

  it.each(["refresh", "reopen"] as const)(
    "ignores an older page after %s",
    async (operation) => {
      const page = deferred<VersionResult<VersionSnapshotPage>>();
      const fresh = { ...newest, name: "Fresh" };
      const list = vi
        .fn<VersionStorage<string>["list"]>()
        .mockResolvedValueOnce(
          success({ snapshots: [newest], nextCursor: "older" }),
        )
        .mockReturnValueOnce(page.promise)
        .mockResolvedValueOnce(success({ snapshots: [fresh] }));
      const { mode } = setup({ list });
      mode.open();
      await mode.list();
      const pending = mode.loadMore();
      if (operation === "reopen") {
        mode.close();
        mode.open();
      }
      await mode.list();
      page.resolve(success({ snapshots: [middle] }));
      expect(await pending).toEqual({ status: "cancelled" });
      expect(mode.store.state).toMatchObject({
        history: { status: "success", data: [fresh] },
        nextCursor: undefined,
      });
    },
  );

  it("resets pagination on refresh without losing an older selected version", async () => {
    const tied = { ...middle, id: "tied" };
    const list = vi
      .fn<VersionStorage<string>["list"]>()
      .mockResolvedValueOnce(
        success({ snapshots: [newest, middle, tied], nextCursor: "older" }),
      )
      .mockResolvedValueOnce(
        success({ snapshots: [newest], nextCursor: "older" }),
      )
      .mockResolvedValue(success({ snapshots: [middle, tied, oldest] }));
    const { mode, show } = setup({ list });
    mode.open();
    await mode.list();
    await mode.select({ type: "snapshot", id: tied.id });
    await mode.list();
    expect(mode.store.state).toMatchObject({
      history: { data: [newest] },
      nextCursor: "older",
      displayed: { type: "snapshot", id: tied.id },
    });
    expect(show.mock.lastCall?.[0].content).toBe(tied.id);
    expect(list).toHaveBeenCalledTimes(2);
  });

  it("keeps loaded rows on refresh failure, then resets to page one on manual retry", async () => {
    const fresh = { ...newest, name: "Fresh" };
    const list = vi
      .fn<VersionStorage<string>["list"]>()
      .mockResolvedValueOnce(
        success({ snapshots: [newest], nextCursor: "middle" }),
      )
      .mockResolvedValueOnce(
        success({ snapshots: [middle], nextCursor: "oldest" }),
      )
      .mockResolvedValueOnce({ ok: false, error: { type: "network" } })
      .mockResolvedValueOnce(
        success({ snapshots: [fresh], nextCursor: "middle" }),
      )
      .mockResolvedValueOnce(success({ snapshots: [middle, oldest] }));
    const { mode } = setup({ list });
    mode.open();
    await mode.list();
    await mode.loadMore();
    await mode.list();
    expect(mode.store.state).toMatchObject({
      history: { status: "error", data: [newest, middle] },
      nextCursor: "oldest",
    });
    await mode.loadMore();
    expect(mode.store.state).toMatchObject({
      history: { status: "success", data: [fresh] },
      nextCursor: "middle",
    });
  });

  it("resets pagination after naming and creation and verifies deleted selected content", async () => {
    let snapshots = [newest, middle, oldest];
    const created = { id: "created", createdAt: 110 };
    const { mode, show } = setup({
      list: async (_signal, cursor) => {
        const offset = Number(cursor ?? 0);
        return success({
          snapshots: snapshots.slice(offset, offset + 2),
          nextCursor:
            offset + 2 < snapshots.length ? String(offset + 2) : undefined,
        });
      },
      rename: async (id, name) => {
        snapshots = snapshots.map((snapshot) =>
          snapshot.id === id ? { ...snapshot, name } : snapshot,
        );
        return success(undefined);
      },
      create: async () => {
        snapshots = [created, ...snapshots];
        return success(created);
      },
      remove: async (id) => {
        snapshots = snapshots.filter((snapshot) => snapshot.id !== id);
        return success(undefined);
      },
      getContent: async (id) =>
        snapshots.some((snapshot) => snapshot.id === id)
          ? success(id)
          : { ok: false, error: { type: "not-found" } },
    });
    mode.open();
    await mode.list();
    await mode.loadMore();
    await mode.rename(oldest.id, "Old draft");
    await mode.create();
    expect(mode.store.state).toMatchObject({
      history: {
        data: [created, newest],
      },
    });
    await mode.select({ type: "snapshot", id: middle.id });
    await mode.remove(middle.id);
    expect(mode.store.state).toMatchObject({
      displayed: { type: "current" },
      history: { data: [created, newest] },
    });
    expect(show.mock.lastCall?.[0].content).toBe("frozen");
  });

  it("allows a manual load after the initial page fails", async () => {
    const list = vi
      .fn<VersionStorage<string>["list"]>()
      .mockResolvedValueOnce({ ok: false, error: { type: "network" } })
      .mockResolvedValueOnce(success({ snapshots: [newest] }));
    const { mode } = setup({ list });
    mode.open();
    await mode.list();
    await mode.loadMore();
    expect(mode.store.state).toMatchObject({
      history: { status: "success", data: [newest] },
    });
  });

  it("rejects a non-advancing continuation instead of appending forever", async () => {
    const { mode } = setup({
      list: async () => success({ snapshots: [newest], nextCursor: "same" }),
    });
    mode.open();
    await mode.list();
    await expect(mode.loadMore()).rejects.toThrow("cursor did not advance");
    expect(await mode.list()).toEqual({ status: "done" });
  });
});
