// @vitest-environment node
import { afterEach, expect, it, vi } from "vite-plus/test";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import {
  createVersioningExtension,
  type VersioningController,
} from "./Versioning.js";
import { ReadOnlyExtension } from "../ReadOnly/ReadOnly.js";
import { success } from "./__test__/result.js";

afterEach(() => {
  vi.useRealTimers();
});

it("configures once per editor during construction", async () => {
  const configure = vi.fn((editor: BlockNoteEditor) => {
    expect(editor.getExtension(ReadOnlyExtension)).toBeDefined();
    expect(editor.document).toHaveLength(1);
    expect(
      editor.getExtension<VersioningController>("versioning")?.store.state,
    ).toEqual({ mode: "live" });
    return {
      adapter: {
        supportsComparison: true,
        open() {
          return {
            current: { content: "frozen", capturedAt: 1 },
            show() {},
            close() {},
          };
        },
      },
      storage: {
        async list() {
          return success({ snapshots: [] });
        },
        async getContent(id: string) {
          return success(id);
        },
      },
      resolveUsers: async () => [],
    };
  });
  const Versions = createVersioningExtension(configure);
  const extension = Versions();
  const editors = [
    BlockNoteEditor.create({ extensions: [extension] }),
    BlockNoteEditor.create({ extensions: [extension] }),
  ];
  try {
    expect(configure).toHaveBeenCalledTimes(editors.length);
    for (const [index, editor] of editors.entries()) {
      expect(configure).toHaveBeenNthCalledWith(index + 1, editor);
      const mode = editor.getExtension(Versions)!;
      mode satisfies VersioningController;
      expect(mode.store.state).toEqual({ mode: "live" });
      mode.close();
      const users = mode.userStore;
      expect(users).toBeDefined();
      expect(mode.userStore).toBe(users);
      expect(mode.canCompare).toBe(true);
      expect(mode.canCreate).toBe(false);
      expect(mode.canRestore).toBe(false);
      expect(mode.canRemove).toBe(false);
      expect(mode.canRename).toBe(false);
      expect(await mode.rename("missing")).toEqual({ status: "unavailable" });
      mode.open();
      expect(await mode.list()).toEqual({ status: "done" });
      mode.close();
      mode.open();
      mode.close();
      expect(configure).toHaveBeenCalledTimes(editors.length);
    }
    expect(editors[0].getExtension(Versions)!.userStore).not.toBe(
      editors[1].getExtension(Versions)!.userStore,
    );
  } finally {
    for (const editor of editors) {
      editor.getExtension(Versions)!.close();
      editor._tiptapEditor.destroy();
    }
  }
});

it("does not lazily initialize a versioning extension registered after creation", () => {
  const configure = vi.fn(() => {
    throw new Error("Late registration must not configure versioning");
  });
  const Versions = createVersioningExtension(configure);
  const editor = BlockNoteEditor.create();
  try {
    editor.registerExtension(Versions());
    const mode = editor.getExtension(Versions)!;
    expect(mode.store.state).toEqual({ mode: "live" });
    mode.close();
    expect(() => mode.userStore).toThrow(
      "Versioning must be installed during editor construction",
    );
    expect(() => mode.canCreate).toThrow(
      "Versioning must be installed during editor construction",
    );
    expect(configure).not.toHaveBeenCalled();
  } finally {
    editor._tiptapEditor.destroy();
  }
});

function setup() {
  const show = vi.fn();
  const Versions = createVersioningExtension(() => ({
    adapter: {
      supportsComparison: true,
      open() {
        return {
          current: { content: "frozen", capturedAt: 1 },
          show,
          close() {},
        };
      },
    },
    storage: {
      async list() {
        return success({ snapshots: [] });
      },
      async getContent(id: string) {
        return success(id);
      },
    },
  }));
  const editor = BlockNoteEditor.create({ extensions: [Versions()] });
  const mode = editor.getExtension(Versions)!;
  vi.useFakeTimers();
  mode.open();
  return { editor, mode, show };
}

it.each(["close", "select"] as const)(
  "clears the owned scroll timer on %s",
  async (action) => {
    const { editor, mode } = setup();
    try {
      await mode.select({ type: "current" }, { compareTo: "old" });
      expect(vi.getTimerCount()).toBe(1);
      if (action === "close") {
        mode.close();
      } else {
        await mode.select({ type: "current" });
      }
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      mode.dispose();
      editor._tiptapEditor.destroy();
    }
  },
);

it("clears an old view's scroll when a callback defers closing and reopening", async () => {
  const { editor, mode, show } = setup();
  try {
    show.mockImplementationOnce(() => {
      queueMicrotask(() => {
        mode.close();
        mode.open();
      });
    });
    await mode.select({ type: "current" }, { compareTo: "old" });
    expect(mode.store.state).toMatchObject({
      mode: "versions",
      displayed: { type: "current" },
    });
    expect(mode.store.state).not.toHaveProperty("compareTo");
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    mode.dispose();
    editor._tiptapEditor.destroy();
  }
});
