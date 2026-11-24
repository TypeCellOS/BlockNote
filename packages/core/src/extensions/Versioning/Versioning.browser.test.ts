import "../../editor/Block.css";

import { afterEach, expect, vi } from "vite-plus/test";
import type { SetupEditor } from "../../../../../tests/src/commands/browser/setupEditor.js";
import { LoadingExtension } from "../Loading/Loading.js";
import { DiffVersioningExtension } from "../../y/extensions/DiffVersioningExtension.js";
import { createLocalVersioning } from "./inMemoryVersioning.js";
import { createVersioningExtension } from "./Versioning.js";
import { SCROLL_TO_FIRST_CHANGE_DELAY_MS } from "./scrollToFirstChange.js";

const cleanup: Array<() => void> = [];
afterEach(() => {
  for (const dispose of cleanup.splice(0)) {
    dispose();
  }
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function setup(
  fixtures: {
    setupEditor: SetupEditor;
  },
  scrollToFirstChange = true,
  loadContent?: () => Promise<void>,
) {
  const { editor: source } = await fixtures.setupEditor({
    mountType: false,
    initialContent: [
      { id: "paragraph", type: "paragraph", content: "Old text" },
    ],
  });
  const before = source.transact((tr) => tr.doc.toJSON());
  source.updateBlock("paragraph", { content: "Changed text" });
  const after = source.transact((tr) => tr.doc.toJSON());
  const Versions = createVersioningExtension((editor) => {
    const local = createLocalVersioning(editor, {
      initialVersions: [
        { content: before, createdAt: 1 },
        { content: after, createdAt: 2 },
      ],
    });
    return {
      ...local,
      storage: {
        ...local.storage,
        async getContent(id, signal) {
          await loadContent?.();
          return local.storage.getContent(id, signal);
        },
      },
      scrollToFirstChange,
    };
  });
  const { editor } = await fixtures.setupEditor({
    mountType: "dom",
    initialContent: [
      { id: "paragraph", type: "paragraph", content: "Live text" },
    ],
    extensions: [Versions(), DiffVersioningExtension()],
  });
  const mode = editor.getExtension(Versions)!;
  cleanup.push(() => mode.close());
  const scroll = vi.spyOn(Element.prototype, "scrollIntoView");
  vi.useFakeTimers();
  mode.open();
  return { editor, mode, scroll };
}

it("schedules scrolling to the first change when comparing stored snapshots", async ({
  setupEditor,
}) => {
  const { editor, mode, scroll } = await setup({
    setupEditor,
  });
  await mode.select({ type: "snapshot", id: "2" }, { compareTo: "1" });
  expect(editor.domElement!.querySelector("[data-user-ids]")).not.toBeNull();
  await vi.advanceTimersByTimeAsync(SCROLL_TO_FIRST_CHANGE_DELAY_MS);
  expect(scroll).toHaveBeenCalledWith({ block: "center", behavior: "smooth" });
});

it.for(["close", "select"] as const)(
  "cancels a pending diff scroll on %s",
  async (action, { setupEditor }) => {
    const { mode, scroll } = await setup({
      setupEditor,
    });
    await mode.select({ type: "snapshot", id: "2" }, { compareTo: "1" });
    if (action === "close") {
      mode.close();
    } else {
      await mode.select({ type: "snapshot", id: "1" });
    }
    scroll.mockClear();
    await vi.advanceTimersByTimeAsync(SCROLL_TO_FIRST_CHANGE_DELAY_MS);
    expect(scroll).not.toHaveBeenCalled();
  },
);

it("honors disabling automatic diff scrolling", async ({ setupEditor }) => {
  const { mode, scroll } = await setup({ setupEditor }, false);
  await mode.select({ type: "snapshot", id: "2" }, { compareTo: "1" });
  await vi.advanceTimersByTimeAsync(SCROLL_TO_FIRST_CHANGE_DELAY_MS);
  expect(scroll).not.toHaveBeenCalled();
});

it("shows the preview loader immediately and clears it on success", async ({
  setupEditor,
}) => {
  const { promise, resolve } = Promise.withResolvers<void>();
  const { editor, mode } = await setup({ setupEditor }, true, () => promise);
  const selection = mode.select({ type: "snapshot", id: "1" });
  expect(editor.domElement!.classList.contains("bn-loading")).toBe(true);
  resolve();
  await selection;
  expect(editor.domElement!.classList.contains("bn-loading")).toBe(false);
});

it("clears the preview loader even for a fast selection", async ({
  setupEditor,
}) => {
  const { editor, mode } = await setup({
    setupEditor,
  });
  const selection = mode.select({ type: "snapshot", id: "1" });
  expect(editor.domElement!.classList.contains("bn-loading")).toBe(true);
  await selection;
  expect(editor.domElement!.classList.contains("bn-loading")).toBe(false);
});

it("preserves other features' loading tokens when a preview finishes", async ({
  setupEditor,
}) => {
  const { editor, mode } = await setup({
    setupEditor,
  });
  const release = editor.getExtension(LoadingExtension)!.acquire();
  await mode.select({ type: "snapshot", id: "1" });
  expect(editor.domElement!.classList.contains("bn-loading")).toBe(true);
  release();
  expect(editor.domElement!.classList.contains("bn-loading")).toBe(false);
});

it("keeps the loader visible across successive selections", async ({
  setupEditor,
}) => {
  const { promise, resolve } = Promise.withResolvers<void>();
  const { editor, mode } = await setup({ setupEditor }, true, () => promise);
  const first = mode.select({ type: "snapshot", id: "1" });
  const second = mode.select({ type: "snapshot", id: "2" });
  expect(editor.domElement!.classList.contains("bn-loading")).toBe(true);
  const third = mode.select({ type: "snapshot", id: "1" });
  expect(editor.domElement!.classList.contains("bn-loading")).toBe(true);
  resolve();
  await Promise.all([first, second, third]);
  expect(editor.domElement!.classList.contains("bn-loading")).toBe(false);
});

it("clears the preview loader when closing history", async ({
  setupEditor,
}) => {
  const { promise, resolve } = Promise.withResolvers<void>();
  const { editor, mode } = await setup({ setupEditor }, true, () => promise);
  const selection = mode.select({ type: "snapshot", id: "1" });
  expect(editor.domElement!.classList.contains("bn-loading")).toBe(true);
  mode.close();
  expect(editor.domElement!.classList.contains("bn-loading")).toBe(false);
  resolve();
  await selection;
});

it("clears the preview loader when a snapshot cannot be loaded", async ({
  setupEditor,
}) => {
  const { promise, resolve } = Promise.withResolvers<void>();
  const { editor, mode } = await setup({ setupEditor }, true, () => promise);
  const selection = mode.select({ type: "snapshot", id: "missing" });
  expect(editor.domElement!.classList.contains("bn-loading")).toBe(true);
  resolve();
  expect(await selection).toMatchObject({ status: "error" });
  expect(editor.domElement!.classList.contains("bn-loading")).toBe(false);
});
