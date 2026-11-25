import { describe, expect } from "vite-plus/test";

describe("StateManager editability", () => {
  it("keeps editing disabled until every independent lock is released", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor();
    const releasePreview = editor.acquireEditingLock();
    const releaseUpload = editor.acquireEditingLock();
    expect(editor.isEditable).toBe(false);

    releasePreview();
    releasePreview();
    expect(editor.isEditable).toBe(false);

    releaseUpload();
    expect(editor.isEditable).toBe(true);

    const releaseOther = editor.acquireEditingLock();
    releaseUpload();
    expect(editor.isEditable).toBe(false);
    releaseOther();
    expect(editor.isEditable).toBe(true);
  });

  it("preserves the application's latest editable setting", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor();
    const release = editor.acquireEditingLock();
    editor.isEditable = true;
    expect(editor.isEditable).toBe(false);

    editor.isEditable = false;
    release();
    expect(editor.isEditable).toBe(false);

    editor.isEditable = true;
    expect(editor.isEditable).toBe(true);
  });

  it("composes with pending document and metadata-only transactions", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor();
    const release = editor.transact((tr) => {
      tr.insertText("hello", 1);
      return editor.acquireEditingLock();
    });
    expect(editor.transact(({ doc }) => doc.textContent)).toContain("hello");
    expect(editor.isEditable).toBe(false);

    editor.transact(release);
    expect(editor.isEditable).toBe(true);
  });
});
