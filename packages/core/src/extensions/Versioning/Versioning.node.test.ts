// @vitest-environment node
import { afterEach, expect, it, vi } from "vite-plus/test";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import {
  createVersioningExtension,
  type VersioningController,
} from "./Versioning.js";
import { ReadOnlyExtension } from "../ReadOnly/ReadOnly.js";

afterEach(() => {
  vi.useRealTimers();
});

it.each(["userStore", "canCreate", "open"] as const)(
  "configures once per editor on first %s access, not construction",
  async (firstUse) => {
    const configure = vi.fn((editor: BlockNoteEditor) => {
      expect(editor.getExtension(ReadOnlyExtension)).toBeDefined();
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
            return [];
          },
          async getContent(id: string) {
            return id;
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
      expect(configure).not.toHaveBeenCalled();
      for (const [index, editor] of editors.entries()) {
        const mode = editor.getExtension(Versions)!;
        mode satisfies VersioningController;
        expect(mode.store.state).toEqual({ mode: "live" });
        mode.close();
        expect(configure).toHaveBeenCalledTimes(index);
        switch (firstUse) {
          case "userStore":
            expect(mode.userStore).toBeDefined();
            break;
          case "canCreate":
            expect(mode.canCreate).toBe(false);
            break;
          case "open":
            mode.open();
            break;
          default:
            firstUse satisfies never;
        }
        const users = mode.userStore;
        expect(mode.userStore).toBe(users);
        expect(mode.canCompare).toBe(true);
        expect(mode.canCreate).toBe(false);
        expect(mode.canRestore).toBe(false);
        expect(mode.canRemove).toBe(false);
        expect(mode.rename).toBeUndefined();
        mode.open();
        expect(await mode.list()).toEqual({ status: "done" });
        mode.close();
        mode.open();
        mode.close();
        expect(configure).toHaveBeenCalledTimes(index + 1);
        expect(configure).toHaveBeenLastCalledWith(editor);
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
  },
);

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
        return [];
      },
      async getContent(id: string) {
        return id;
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

it("does not schedule an old view's scroll after show closes and reopens", async () => {
  const { editor, mode, show } = setup();
  try {
    show.mockImplementationOnce(() => {
      mode.close();
      mode.open();
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
