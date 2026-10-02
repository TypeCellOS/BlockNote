import { closeHistory, redoDepth, undoDepth } from "@tiptap/pm/history";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { DiffVersioningExtension } from "../../y/extensions/DiffVersioningExtension.js";
import { VersioningExtension } from "./Versioning.js";
import { createInMemoryVersioningAdapter } from "./inMemoryVersioning.js";

// Unmounted editors do not install ProseMirror plugins. Mount a real editor
// so these tests exercise its actual undo history.
const mounted: { editor: BlockNoteEditor; host: HTMLElement }[] = [];
afterEach(() => {
  for (const { editor, host } of mounted.splice(0)) {
    editor.unmount();
    host.remove();
  }
});

function setup(mode: "in-memory" | "diff" | "custom" = "in-memory") {
  function createAdapter(
    editor: Parameters<typeof createInMemoryVersioningAdapter>[0],
  ) {
    const adapter = createInMemoryVersioningAdapter(editor);
    if (mode !== "custom") {
      return adapter;
    }
    // A separate controller proves history isolation belongs to the shared
    // lifecycle, rather than createInMemoryPreviewController.
    let liveDocument: typeof editor.document | undefined;
    const preview: typeof adapter.preview = {
      enterPreview(content) {
        liveDocument ??= editor.document;
        editor.replaceBlocks(editor.document, content);
      },
      exitPreview() {
        if (liveDocument) {
          editor.replaceBlocks(editor.document, liveDocument);
          liveDocument = undefined;
        }
      },
    };
    return {
      ...adapter,
      preview,
      getCurrentDocument: () => liveDocument ?? editor.document,
    };
  }
  const editor = BlockNoteEditor.create({
    initialContent: [{ type: "paragraph", content: "original" }],
    extensions: [
      VersioningExtension(createAdapter),
      ...(mode === "diff" ? [DiffVersioningExtension()] : []),
    ],
  });
  const host = document.createElement("div");
  document.body.append(host);
  editor.mount(host);
  mounted.push({ editor, host });
  const versioning = editor.getExtension(VersioningExtension)!;
  function edit(text: string) {
    editor.transact((tr) => {
      closeHistory(tr);
      editor.replaceBlocks(editor.document, [
        { type: "paragraph", content: text },
      ]);
    });
  }
  function text() {
    return editor.prosemirrorState.doc.textContent;
  }
  return { editor, versioning, edit, text };
}

describe("version preview history", () => {
  it("leaves an empty history empty", async () => {
    const { editor, versioning, text } = setup();
    const snapshot = await versioning.create!();
    await versioning.previewSnapshot(snapshot.id);
    versioning.exitPreview();
    expect(editor.undo()).toBe(false);
    expect(text()).toBe("original");
  });

  it("resets only history across reopening", async () => {
    const { editor, versioning, edit, text } = setup();
    const snapshot = await versioning.create!();
    edit("live edit");
    const key = new PluginKey<number>("preview-independent-state");
    editor.registerExtension({
      key: "preview-independent-state",
      prosemirrorPlugins: [
        new Plugin({
          key,
          state: {
            init: () => 0,
            apply: (tr, value) => (tr.getMeta(key) ? value + 1 : value),
          },
        }),
      ],
    });

    await versioning.previewSnapshot(snapshot.id);
    expect(undoDepth(editor.prosemirrorState)).toBe(0);
    editor.transact((tr) => tr.setMeta(key, true));
    versioning.exitPreview();
    expect(key.getState(editor.prosemirrorState)).toBe(1);
    expect(undoDepth(editor.prosemirrorState)).toBe(0);

    edit("next live edit");
    expect(editor.undo()).toBe(true);
    expect(text()).toBe("live edit");
    expect(redoDepth(editor.prosemirrorState)).toBe(1);
    await versioning.previewSnapshot(snapshot.id);
    expect(redoDepth(editor.prosemirrorState)).toBe(0);
    editor.transact((tr) => tr.setMeta(key, true));
    versioning.exitPreview();
    expect(key.getState(editor.prosemirrorState)).toBe(2);
    expect(redoDepth(editor.prosemirrorState)).toBe(0);
    expect(editor.redo()).toBe(false);
    expect(text()).toBe("live edit");
  });

  it.each(["in-memory", "custom"] as const)(
    "does not make closing a preview undoable with %s controllers",
    async (mode) => {
      const { editor, versioning, edit, text } = setup(mode);
      const snapshot = await versioning.create!();
      edit("previous live edit");
      edit("live edit");
      await versioning.previewSnapshot(snapshot.id);
      expect(text()).toBe("original");
      versioning.exitPreview();
      expect(text()).toBe("live edit");
      expect(editor.undo()).toBe(false);
      expect(editor.redo()).toBe(false);
      expect(text()).toBe("live edit");
      edit("new edit");
      expect(editor.undo()).toBe(true);
      expect(text()).toBe("live edit");
      expect(editor.redo()).toBe(true);
      expect(text()).toBe("new edit");
    },
  );

  it("clears undo and redo across successive previews and current preview", async () => {
    const { editor, versioning, edit, text } = setup();
    const original = await versioning.create!();
    edit("second");
    const second = await versioning.create!();
    edit("third");
    expect(editor.undo()).toBe(true);
    expect(text()).toBe("second");
    await versioning.list();
    await versioning.previewSnapshot(original.id);
    await versioning.previewSnapshot(second.id);
    await versioning.previewCurrentVersion!();
    versioning.exitPreview();
    expect(text()).toBe("second");
    expect(undoDepth(editor.prosemirrorState)).toBe(0);
    expect(redoDepth(editor.prosemirrorState)).toBe(0);
    expect(editor.redo()).toBe(false);
    expect(editor.undo()).toBe(false);
    expect(text()).toBe("second");
  });

  it("keeps a restore undoable without undoing to preview content", async () => {
    const { editor, versioning, edit, text } = setup();
    const original = await versioning.create!();
    edit("preview only");
    const previewed = await versioning.create!();
    edit("live edit");
    await versioning.list();
    await versioning.previewSnapshot(previewed.id);
    await versioning.restore!(original.id);
    expect(text()).toBe("original");
    expect(editor.undo()).toBe(true);
    expect(text()).toBe("live edit");
    expect(undoDepth(editor.prosemirrorState)).toBe(0);
    expect(editor.redo()).toBe(true);
    expect(text()).toBe("original");
  });

  it("clears history through a diff followed by a static preview", async () => {
    const { editor, versioning, edit, text } = setup("diff");
    const original = await versioning.create!();
    edit("second");
    const second = await versioning.create!();
    edit("live edit");
    await versioning.list();
    await versioning.previewSnapshot(second.id, { compareTo: original.id });
    let hasAttributions = false;
    editor.prosemirrorState.doc.descendants((node) => {
      hasAttributions ||= node.marks.some((mark) =>
        mark.type.name.startsWith("y-attributed-"),
      );
    });
    expect(hasAttributions).toBe(true);
    await versioning.previewSnapshot(original.id);
    versioning.exitPreview();
    expect(text()).toBe("live edit");
    expect(undoDepth(editor.prosemirrorState)).toBe(0);
    expect(editor.undo()).toBe(false);
    expect(editor.redo()).toBe(false);
    expect(text()).toBe("live edit");
  });
});
