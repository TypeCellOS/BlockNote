import { afterEach, expect, vi } from "vite-plus/test";
import type { SetupEditor } from "../../../../../tests/src/commands/node/setupEditor.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import {
  createVersioningExtension,
  type VersioningController,
} from "./Versioning.js";
import { success } from "./__test__/result.js";
import type { VersionDisplay } from "./types.js";

afterEach(() => {
  vi.useRealTimers();
});

it("does not publish binding changes while opening, switching or closing a preview", async ({
  setupEditor,
}) => {
  const Versions = createVersioningExtension((editor: BlockNoteEditor) => {
    let live = "live";
    function show(content: string) {
      editor.updateBlock("paragraph", { content });
    }
    return {
      adapter: {
        supportsComparison: true,
        open() {
          expect(editor.isEditable).toBe(false);
          show("opening");
          return {
            current: { content: "live", capturedAt: 1 },
            show(display: VersionDisplay<string, never>) {
              show(display.content);
            },
            close() {
              show(live);
            },
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
        async restore() {
          // Like local storage, restore the live view before editing it.
          editor.getExtension<VersioningController>("versioning")!.close();
          expect(editor.isEditable).toBe(false);
          live = "restored";
          show(live);
          return success(undefined);
        },
      },
    };
  });
  const { editor } = await setupEditor({
    initialContent: [{ id: "paragraph", content: "live" }],
    extensions: [Versions()],
  });
  const mode = editor.getExtension(Versions)!;
  const changes: string[] = [];
  editor.onChange(() => changes.push(editor.prosemirrorState.doc.textContent));
  try {
    mode.open();
    // Binding reconciliation or another extension can dispatch after opening,
    // outside any adapter operation. It still belongs to the isolated preview.
    editor.updateBlock("paragraph", { content: "deferred preview update" });
    await mode.select({ type: "snapshot", id: "old" });
    await mode.select({ type: "current" }, { compareTo: "old" });
    await mode.select({ type: "current" });
    mode.close();
    expect(editor.isEditable).toBe(true);
    expect(changes).toEqual([]);
    editor.updateBlock("paragraph", { content: "edited" });
    expect(changes).toEqual(["edited"]);
    mode.open();
    await mode.restore("old");
    expect(editor.isEditable).toBe(true);
    expect(changes).toEqual(["edited", "restored"]);
  } finally {
    mode.dispose();
  }
});

it("resumes change notifications if acquiring a preview throws", async ({
  setupEditor,
}) => {
  const Versions = createVersioningExtension((editor: BlockNoteEditor) => ({
    adapter: {
      supportsComparison: false,
      open(): never {
        editor.updateBlock("paragraph", { content: "opening" });
        throw new Error("Cannot open preview");
      },
    },
    storage: {
      async list() {
        return success({ snapshots: [] });
      },
      async getContent() {
        return success("old");
      },
    },
  }));
  const { editor } = await setupEditor({
    initialContent: [{ id: "paragraph", content: "live" }],
    extensions: [Versions()],
  });
  const changes: string[] = [];
  editor.onChange(() => changes.push(editor.prosemirrorState.doc.textContent));
  expect(() => editor.getExtension(Versions)!.open()).toThrow(
    "Cannot open preview",
  );
  expect(editor.isEditable).toBe(true);
  expect(changes).toEqual([]);
  editor.updateBlock("paragraph", { content: "edited" });
  expect(changes).toEqual(["edited"]);
});

it("publishes restored live content when reconnecting a detached binding", async ({
  setupEditor,
}) => {
  const Versions = createVersioningExtension((editor: BlockNoteEditor) => {
    let live = "live";
    return {
      adapter: {
        supportsComparison: false,
        open() {
          return {
            current: { content: live, capturedAt: 1 },
            show() {
              editor.updateBlock("paragraph", { content: "old" });
            },
            close() {
              editor.updateBlock("paragraph", { content: live });
            },
          };
        },
      },
      storage: {
        async list() {
          return success({ snapshots: [] });
        },
        async getContent() {
          return success("old");
        },
        async restore() {
          live = "restored";
          return success(undefined);
        },
      },
    };
  });
  const { editor } = await setupEditor({
    initialContent: [{ id: "paragraph", content: "live" }],
    extensions: [Versions()],
  });
  const mode = editor.getExtension(Versions)!;
  const changes: string[] = [];
  editor.onChange(() => changes.push(editor.prosemirrorState.doc.textContent));
  try {
    mode.open();
    await mode.select({ type: "snapshot", id: "old" });
    expect(await mode.restore("old")).toEqual({ status: "done" });
    expect(changes).toEqual(["restored"]);
  } finally {
    mode.dispose();
  }
});

it("configures once per editor during construction", async ({
  setupEditor,
}) => {
  const configure = vi.fn((editor: BlockNoteEditor) => {
    expect(editor.isEditable).toBe(true);
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
    (await setupEditor({ extensions: [extension] })).editor,
    (await setupEditor({ extensions: [extension] })).editor,
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
      mode.open();
      expect(editor.isEditable).toBe(false);
      expect(await mode.list()).toEqual({ status: "done" });
      mode.close();
      expect(editor.isEditable).toBe(true);
      const releaseOther = editor.acquireEditingLock();
      mode.open();
      mode.close();
      expect(editor.isEditable).toBe(false);
      releaseOther();
      expect(editor.isEditable).toBe(true);
      expect(configure).toHaveBeenCalledTimes(editors.length);
    }
    expect(editors[0].getExtension(Versions)!.userStore).not.toBe(
      editors[1].getExtension(Versions)!.userStore,
    );
  } finally {
    for (const editor of editors) {
      editor.getExtension(Versions)!.close();
    }
  }
});

it("does not lazily initialize a versioning extension registered after creation", async ({
  setupEditor,
}) => {
  const configure = vi.fn(() => {
    throw new Error("Late registration must not configure versioning");
  });
  const Versions = createVersioningExtension(configure);
  const { editor } = await setupEditor();
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
});

async function setup(setupEditor: SetupEditor) {
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
  const { editor } = await setupEditor({ extensions: [Versions()] });
  const mode = editor.getExtension(Versions)!;
  vi.useFakeTimers();
  mode.open();
  return { mode, show };
}

it.for(["close", "select"] as const)(
  "clears the owned scroll timer on %s",
  async (action, { setupEditor }) => {
    const { mode } = await setup(setupEditor);
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
    }
  },
);

it("clears an old view's scroll when a callback defers closing and reopening", async ({
  setupEditor,
}) => {
  const { mode, show } = await setup(setupEditor);
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
  }
});
