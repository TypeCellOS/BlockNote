import { expect } from "vite-plus/test";
import { LoadingExtension } from "./Loading.js";

it("blocks editing until every loading token is released", async ({
  setupEditor,
}) => {
  const { editor } = await setupEditor();
  const loading = editor.getExtension(LoadingExtension)!;
  const release = loading.acquire();
  const releaseOther = loading.acquire();
  try {
    expect(editor.isEditable).toBe(false);
    release();
    release();
    expect(editor.isEditable).toBe(false);
    releaseOther();
    expect(editor.isEditable).toBe(true);
  } finally {
    release();
    releaseOther();
  }
});

it("preserves application and independent feature restrictions", async ({
  setupEditor,
}) => {
  const { editor } = await setupEditor();
  const loading = editor.getExtension(LoadingExtension)!;
  const release = loading.acquire();
  editor.isEditable = false;
  const releasePreview = editor.acquireEditingLock();
  release();
  expect(editor.isEditable).toBe(false);
  editor.isEditable = true;
  expect(editor.isEditable).toBe(false);
  releasePreview();
  expect(editor.isEditable).toBe(true);
});

it("preserves an initially read-only editor when loading completes", async ({
  setupEditor,
}) => {
  const { editor } = await setupEditor({
    _tiptapOptions: { editable: false },
  });
  const loading = editor.getExtension(LoadingExtension)!;
  const release = loading.acquire();
  expect(loading.store.state.size).toBe(1);
  expect(editor.isEditable).toBe(false);
  release();
  expect(loading.store.state.size).toBe(0);
  expect(editor.isEditable).toBe(false);
  editor.isEditable = true;
  expect(editor.isEditable).toBe(true);
});
