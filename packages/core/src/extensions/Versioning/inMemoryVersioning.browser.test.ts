import { expect } from "vite-plus/test";
import { resultValue } from "./__test__/result.js";
import {
  createLocalVersioning,
  InMemoryVersioningExtension,
} from "./inMemoryVersioning.js";

it("converts partial-block seeds without changing the live document, selection, or undo", async ({
  setupEditor,
  onTestFinished,
  selectText,
}) => {
  const { editor } = await setupEditor({
    mountType: "dom",
    initialContent: [{ id: "live", content: "Original" }],
  });
  const original = editor.document;
  editor.updateBlock("live", { content: "Live text" });
  const live = editor.document;
  expect(editor.undo()).toBe(true);
  expect(editor.document).toEqual(original);
  expect(editor.redo()).toBe(true);
  expect(editor.document).toEqual(live);
  selectText(editor, "Live");

  const { adapter, storage } = createLocalVersioning(editor, {
    initialVersions: [
      {
        content: [
          {
            id: "saved",
            content: "Saved text",
            children: [{ type: "paragraph", content: "Nested text" }],
          },
        ],
        name: "Draft",
        createdAt: 123,
      },
    ],
  });
  expect(editor.document).toEqual(live);
  expect(editor.getSelectedText()).toBe("Live");
  const signal = new AbortController().signal;
  expect(resultValue(await storage.list(signal)).snapshots).toEqual([
    { id: "1", name: "Draft", createdAt: 123 },
  ]);
  const content = resultValue(await storage.getContent("1", signal));
  expect(content.type.schema).toBe(editor.pmSchema);
  const preview = adapter.open();
  onTestFinished(() => preview.close());
  preview.show({ content, target: { type: "snapshot", id: "1" } });
  expect(editor.getBlock("saved")).toMatchObject({
    type: "paragraph",
    content: [{ type: "text", text: "Saved text" }],
    children: [
      {
        id: expect.any(String),
        content: [{ type: "text", text: "Nested text" }],
      },
    ],
  });
  const saved = editor.document;
  preview.close();
  expect(editor.document).toEqual(live);
  expect(editor.getSelectedText()).toBe("Live");
  expect(editor.undo()).toBe(true);
  expect(editor.document).toEqual(original);
  expect(editor.redo()).toBe(true);
  expect(editor.document).toEqual(live);

  await storage.restore!("1");
  expect(editor.document).toEqual(saved);
  expect(editor.undo()).toBe(true);
  expect(editor.document).toEqual(live);
});

it("clears local undo and redo through previews and restores without preview history", async ({
  setupEditor,
  onTestFinished,
}) => {
  const { editor } = await setupEditor({
    mountType: "dom",
    initialContent: [{ id: "paragraph", content: "original" }],
    extensions: [
      InMemoryVersioningExtension({
        initialVersions: ["snapshot one", "snapshot two"].map(
          (content, index) => ({
            createdAt: index + 1,
            content: [{ id: "paragraph", content }],
          }),
        ),
      }),
    ],
  });
  const mode = editor.getExtension(InMemoryVersioningExtension)!;
  onTestFinished(() => mode.dispose());
  function expectText(text: string) {
    expect(editor.getBlock("paragraph")?.content).toEqual([
      { type: "text", text, styles: {} },
    ]);
  }
  function edit(content: string) {
    editor.updateBlock("paragraph", { content });
  }

  edit("live");
  expect(editor.undo()).toBe(true);
  expectText("original");
  expect(editor.redo()).toBe(true);
  expectText("live");
  expect(editor.getExtension("history")).toBeDefined();
  mode.open();
  expect(editor.isEditable).toBe(false);
  for (const [id, text] of [
    ["1", "snapshot one"],
    ["2", "snapshot two"],
  ]) {
    await mode.select({ type: "snapshot", id });
    expectText(text);
    // Preview detaches history entirely; undo/redo require a registered extension.
    expect(editor.getExtension("history")).toBeUndefined();
  }
  await mode.select({ type: "current" });
  expectText("live");
  mode.close();
  expect(editor.undo()).toBe(false);
  expect(editor.redo()).toBe(false);
  edit("new live");
  expect(editor.undo()).toBe(true);
  expectText("live");
  expect(editor.redo()).toBe(true);
  expectText("new live");

  mode.open();
  await mode.select({ type: "snapshot", id: "2" });
  await mode.restore("1");
  expectText("snapshot one");
  expect(editor.isEditable).toBe(true);
  expect(editor.undo()).toBe(false);
  expect(editor.redo()).toBe(false);
  edit("after restore");
  expect(editor.undo()).toBe(true);
  expectText("snapshot one");
  expect(editor.redo()).toBe(true);
  expectText("after restore");
});
