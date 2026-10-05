// @vitest-environment node
import { expect, it } from "vite-plus/test";
import { undoDepth } from "@tiptap/pm/history";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import {
  createVersioningExtension,
  type VersioningController,
} from "./Versioning.js";
import {
  createLocalVersioning,
  VersioningExtension,
} from "./inMemoryVersioning.js";

it("previews and restores documents created with another editor's schema", async () => {
  const source = BlockNoteEditor.create({
    initialContent: [
      { id: "paragraph", type: "paragraph", content: "Old text" },
    ],
  });
  const before = source.prosemirrorState.doc;
  source.updateBlock("paragraph", { content: "Changed text" });
  const after = source.prosemirrorState.doc;
  source._tiptapEditor.destroy();
  const editor = BlockNoteEditor.create({
    extensions: [
      VersioningExtension({
        initialVersions: [
          { content: before, createdAt: 1 },
          { content: after, createdAt: 2 },
        ],
      }),
    ],
  });
  const mode = editor.getExtension(VersioningExtension)!;
  try {
    expect(mode).toBeDefined();
    expect(editor.pmSchema).not.toBe(before.type.schema);
    mode.open();
    await mode.select({ type: "snapshot", id: "2" });
    expect(editor.prosemirrorState.doc.textContent).toBe("Changed text");
    await mode.select({ type: "snapshot", id: "1" });
    expect(editor.prosemirrorState.doc.textContent).toBe("Old text");
    await mode.restore("2");
    expect(editor.prosemirrorState.doc.textContent).toBe("Changed text");
    expect(editor.isEditable).toBe(true);
  } finally {
    mode?.dispose();
    editor._tiptapEditor.destroy();
  }
});

it("finds the built-in extension by its factory with default options", () => {
  const editor = BlockNoteEditor.create({
    extensions: [VersioningExtension()],
  });
  try {
    const mode = editor.getExtension(VersioningExtension);
    expect(mode).toBeDefined();
    expect(mode).toBe(editor.getExtension<VersioningController>("versioning"));
  } finally {
    editor._tiptapEditor.destroy();
  }
});

it("isolates displayed content and preserves live undo across open/show/close", async () => {
  const extension = createVersioningExtension(createLocalVersioning);
  const editor = BlockNoteEditor.create({ extensions: [extension()] });
  const mode = editor.getExtension(extension)!;
  try {
    editor.replaceBlocks(editor.document, [
      { type: "paragraph", content: "Live" },
    ]);
    const before = editor.prosemirrorState;
    mode.open();
    expect(editor.isEditable).toBe(false);
    const saved = await mode.create("Captured");
    expect(saved).toBeDefined();
    await mode.select({ type: "snapshot", id: saved!.id });
    mode.close();
    expect(editor.prosemirrorState.doc).toBe(before.doc);
    expect(undoDepth(editor.prosemirrorState)).toBe(undoDepth(before));
    expect(editor.isEditable).toBe(true);
  } finally {
    mode.dispose();
    editor._tiptapEditor.destroy();
  }
});

it("restores into the saved live state, then closes the isolated view", async () => {
  const extension = createVersioningExtension(createLocalVersioning);
  const editor = BlockNoteEditor.create({ extensions: [extension()] });
  const mode = editor.getExtension(extension)!;
  try {
    editor.replaceBlocks(editor.document, [
      { type: "paragraph", content: "Original" },
    ]);
    mode.open();
    const saved = await mode.create();
    if (!saved) {
      throw new Error("Expected a created version");
    }
    mode.close();
    editor.replaceBlocks(editor.document, [
      { type: "paragraph", content: "Latest" },
    ]);
    mode.open();
    await mode.select({ type: "snapshot", id: saved.id });
    await mode.select({ type: "current" });
    expect(editor.prosemirrorState.doc.textContent).toBe("Latest");
    await mode.restore(saved.id);
    expect(editor.prosemirrorState.doc.textContent).toBe("Original");
    expect(editor.isEditable).toBe(true);
  } finally {
    mode.dispose();
    editor._tiptapEditor.destroy();
  }
});
