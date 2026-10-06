import { afterEach, expect, it, vi } from "vite-plus/test";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
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

function setup(scrollToFirstChange = true) {
  const source = BlockNoteEditor.create({
    initialContent: [
      { id: "paragraph", type: "paragraph", content: "Old text" },
    ],
  });
  const before = source.prosemirrorState.doc.toJSON();
  source.updateBlock("paragraph", { content: "Changed text" });
  const after = source.prosemirrorState.doc.toJSON();
  source._tiptapEditor.destroy();
  const Versions = createVersioningExtension((editor) => ({
    ...createLocalVersioning(editor, {
      initialVersions: [
        { content: before, createdAt: 1 },
        { content: after, createdAt: 2 },
      ],
    }),
    scrollToFirstChange,
  }));
  const editor = BlockNoteEditor.create({
    initialContent: [
      { id: "paragraph", type: "paragraph", content: "Live text" },
    ],
    extensions: [Versions(), DiffVersioningExtension()],
  });
  const host = document.createElement("div");
  document.body.append(host);
  editor.mount(host);
  const mode = editor.getExtension(Versions)!;
  cleanup.push(() => {
    mode.close();
    editor.unmount();
    editor._tiptapEditor.destroy();
    host.remove();
  });
  const scroll = vi
    .spyOn(Element.prototype, "scrollIntoView")
    .mockImplementation(() => {});
  vi.useFakeTimers();
  mode.open();
  return { editor, mode, scroll };
}

it("scrolls to the first rendered change when comparing stored snapshots", async () => {
  const { editor, mode, scroll } = setup();
  await mode.select({ type: "snapshot", id: "2" }, { compareTo: "1" });
  expect(editor.domElement!.querySelector("[data-user-ids]")).not.toBeNull();
  await vi.advanceTimersByTimeAsync(SCROLL_TO_FIRST_CHANGE_DELAY_MS);
  expect(scroll).toHaveBeenCalledWith({ block: "center", behavior: "smooth" });
});

it.each(["close", "select"] as const)(
  "cancels a pending diff scroll on %s",
  async (action) => {
    const { mode, scroll } = setup();
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

it("honors disabling automatic diff scrolling", async () => {
  const { mode, scroll } = setup(false);
  await mode.select({ type: "snapshot", id: "2" }, { compareTo: "1" });
  await vi.advanceTimersByTimeAsync(SCROLL_TO_FIRST_CHANGE_DELAY_MS);
  expect(scroll).not.toHaveBeenCalled();
});
