// @vitest-environment node
import { expect, it, vi } from "vite-plus/test";
import { createVersioning } from "./createVersioning.js";
import type {
  VersionResult,
  VersionSnapshot,
  VersionStorage,
  VersionViewAdapter,
} from "./types.js";
import { success } from "./__test__/result.js";

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
    list: async () => success([]),
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
      list: async () => success([{ id: "old", createdAt: 1 }, latest]),
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

it("defers storage access and binds detached rename to the original storage", async () => {
  const storage: VersionStorage<string> = {
    async list() {
      return success([]);
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
    const refresh = deferred<VersionResult<VersionSnapshot[]>>();
    const list = vi
      .fn()
      .mockResolvedValueOnce(success([original]))
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
    const list = vi.fn(async () => success([original]));
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

it.each(["readOnly", "view", "store"] as const)(
  "defers a synchronous close requested during opening from %s",
  (source) => {
    const { mode, open, close, show, setReadOnly } = setup();
    switch (source) {
      case "readOnly":
        setReadOnly.mockImplementationOnce(() => mode.close());
        break;
      case "view":
        open.mockImplementationOnce(() => {
          mode.close();
          return {
            current: { content: "frozen", capturedAt: 10 },
            show,
            close,
          };
        });
        break;
      case "store":
        mode.store.subscribe(({ currentVal }) => {
          if (currentVal.mode === "versions") {
            mode.close();
          }
        });
        break;
      default:
        source satisfies never;
    }
    mode.open();
    expect(close).toHaveBeenCalledTimes(1);
    expect(mode.store.state).toEqual({ mode: "live" });
    expect(setReadOnly).toHaveBeenLastCalledWith(false);
  },
);

it("does not start reads from synchronous opening or closing callbacks", async () => {
  const list = vi.fn(async () => success([]));
  const getContent = vi.fn(async (id: string) => success(id));
  const { mode, close } = setup({ list, getContent });
  const reads: Array<ReturnType<typeof mode.list>> = [];
  function read() {
    reads.push(mode.list(), mode.select({ type: "snapshot", id: "old" }));
  }
  const unsubscribe = mode.store.subscribe(({ currentVal }) => {
    if (currentVal.mode === "versions") {
      unsubscribe();
      read();
    }
  });
  close.mockImplementationOnce(read);
  mode.open();
  mode.close();
  expect(await Promise.all(reads)).toEqual([
    { status: "unavailable" },
    { status: "unavailable" },
    { status: "unavailable" },
    { status: "unavailable" },
  ]);
  expect(list).not.toHaveBeenCalled();
  expect(getContent).not.toHaveBeenCalled();
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
  const { mode } = setup({ list: async () => success(await pending.promise) });
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
    list: async () => success([{ id: "old", createdAt: 1 }]),
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
  const { mode, show, close } = setup({
    remove: async () => success(undefined),
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
    .mockResolvedValueOnce(success(data))
    .mockResolvedValueOnce({ ok: false, error: { type: "network" } })
    .mockResolvedValueOnce(success(data));
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

it("does not refresh history or change the preview after failed removal", async () => {
  const list = vi.fn(async () => success([]));
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
  "reopens while restoring and releases the lock after %s",
  async (outcome) => {
    const pending = deferred<VersionResult<void>>();
    const { mode, open, setReadOnly } = setup({
      restore: () => pending.promise,
    });
    mode.open();
    const restore = mode.restore("old");
    mode.close();
    expect(setReadOnly).toHaveBeenLastCalledWith(true);
    mode.open();
    expect(open).toHaveBeenCalledTimes(2);
    expect(mode.store.state).toMatchObject({
      mode: "versions",
      restoring: true,
    });
    expect(await mode.list()).toEqual({ status: "done" });
    pending.resolve(
      outcome === "success"
        ? success(undefined)
        : { ok: false, error: { type: "timeout", outcome: "unknown" } },
    );
    await restore;
    if (outcome === "success") {
      expect(mode.store.state).toMatchObject({
        mode: "versions",
        displayed: { type: "current" },
        restoring: false,
        history: { status: "success" },
      });
      expect(open).toHaveBeenCalledTimes(3);
      expect(setReadOnly).toHaveBeenLastCalledWith(true);
    } else {
      expect(mode.store.state).toMatchObject({
        mode: "versions",
        restoring: false,
        history: { status: "success" },
      });
      expect(setReadOnly).toHaveBeenLastCalledWith(true);
    }
    mode.close();
    expect(setReadOnly).toHaveBeenLastCalledWith(false);
  },
);
