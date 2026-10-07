// @vitest-environment node
import { resultValue } from "./__test__/result.js";
import { expect, expectTypeOf, it } from "vite-plus/test";
import {
  closeHistory,
  history,
  undo,
  undoDepth,
  redo,
} from "@tiptap/pm/history";
import { BlockNoteSchema } from "../../blocks/BlockNoteSchema.js";
import type { PartialBlock } from "../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { createBlockSpec } from "../../schema/blocks/createSpec.js";
import { createInlineContentSpec } from "../../schema/inlineContent/createSpec.js";
import { createStyleSpec } from "../../schema/styles/createSpec.js";
import {
  createVersioningExtension,
  type VersioningController,
} from "./Versioning.js";
import {
  createLocalVersioning,
  type LocalVersioningOptions,
  type ProseMirrorDocumentJSON,
  InMemoryVersioningExtension,
} from "./inMemoryVersioning.js";

it("previews and restores JSON exported from another editor's schema", async () => {
  const source = BlockNoteEditor.create({
    initialContent: [
      { id: "paragraph", type: "paragraph", content: "Old text" },
    ],
  });
  const sourceSchema = source.pmSchema;
  const before = source.prosemirrorState.doc.toJSON();
  source.updateBlock("paragraph", { content: "Changed text" });
  const after = source.prosemirrorState.doc.toJSON();
  source._tiptapEditor.destroy();
  const editor = BlockNoteEditor.create({
    extensions: [
      InMemoryVersioningExtension({
        initialVersions: [
          { content: before, createdAt: 1 },
          { content: after, createdAt: 2 },
        ],
      }),
    ],
  });
  const mode = editor.getExtension(InMemoryVersioningExtension)!;
  try {
    expect(mode).toBeDefined();
    expect(editor.pmSchema).not.toBe(sourceSchema);
    mode.open();
    await mode.list();
    expect(mode.store.state).toMatchObject({
      showCurrentVersion: true,
      displayed: { type: "current" },
    });
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

it("converts partial-block seeds without changing live content, selection, or undo", async () => {
  const blocks: PartialBlock[] = [
    {
      id: "saved",
      content: "Saved text",
      children: [{ type: "paragraph", content: "Nested text" }],
    },
  ];
  const editor = BlockNoteEditor.create();
  try {
    // Headless editors do not mount their plugins. Install history explicitly
    // so this test exercises real undo state rather than comparing zero depths.
    editor.prosemirrorView.updateState(
      editor.prosemirrorState.reconfigure({
        plugins: [...editor.prosemirrorState.plugins, history()],
      }),
    );
    editor.replaceBlocks(editor.document, [{ content: "Live text" }]);
    editor.transact((tr) => closeHistory(tr));
    const before = editor.prosemirrorState;
    expect(undoDepth(before)).toBeGreaterThan(0);
    const { adapter, storage } = createLocalVersioning(editor, {
      initialVersions: [{ content: blocks, name: "Draft", createdAt: 123 }],
    });
    expect(editor.prosemirrorState).toBe(before);
    const signal = new AbortController().signal;
    expect(resultValue(await storage.list(signal))).toEqual([
      { id: "1", name: "Draft", createdAt: 123 },
    ]);
    const content = resultValue(await storage.getContent("1", signal));
    expect(content.type.schema).toBe(editor.pmSchema);
    expect(content.textContent).toBe("Saved textNested text");
    const preview = adapter.open();
    preview.show({ content, target: { type: "snapshot", id: "1" } });
    expect(editor.document[0].id).toBe("saved");
    expect(editor.document[0].type).toBe("paragraph");
    expect(editor.document[0].children[0].id).toBeTruthy();
    preview.close();
    expect(editor.prosemirrorState.doc).toBe(before.doc);
    expect(editor.prosemirrorState.selection.eq(before.selection)).toBe(true);
    expect(undoDepth(editor.prosemirrorState)).toBe(undoDepth(before));
    await storage.restore!("1");
    expect(editor.prosemirrorState.doc.textContent).toBe(
      "Saved textNested text",
    );
    expect(undo(editor.prosemirrorState, editor.prosemirrorView.dispatch)).toBe(
      true,
    );
    expect(editor.prosemirrorState.doc).toEqual(before.doc);
  } finally {
    editor._tiptapEditor.destroy();
  }
});

it("loads table content and attributes from ProseMirror JSON seeds", async () => {
  const widths = [120];
  const text = { type: "text", text: "Cell text" };
  const content: ProseMirrorDocumentJSON = {
    type: "doc",
    content: [
      {
        type: "blockGroup",
        content: [
          {
            type: "blockContainer",
            attrs: { id: "table" },
            content: [
              {
                type: "table",
                content: [
                  {
                    type: "tableRow",
                    content: [
                      {
                        type: "tableCell",
                        attrs: { colwidth: widths },
                        content: [{ type: "tableParagraph", content: [text] }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
  const editor = BlockNoteEditor.create();
  try {
    const { storage } = createLocalVersioning(editor, {
      initialVersions: [{ content, createdAt: 1 }],
    });
    const document = resultValue(
      await storage.getContent("1", new AbortController().signal),
    );
    expect(document.type.schema).toBe(editor.pmSchema);
    expect(document.textContent).toBe("Cell text");
    document.descendants((node) => {
      if (node.type.name === "tableCell") {
        expect(node.attrs.colwidth).toEqual([120]);
      }
    });
  } finally {
    editor._tiptapEditor.destroy();
  }
});

it("uses custom block, inline-content, and style schemas for partial-block seeds", async () => {
  const schema = BlockNoteSchema.create().extend({
    blockSpecs: {
      callout: createBlockSpec(
        {
          type: "callout",
          content: "inline",
          propSchema: { tone: { default: "info" } },
        },
        { render: () => ({ dom: document.createElement("div") }) },
      )(),
    },
    inlineContentSpecs: {
      mention: createInlineContentSpec(
        {
          type: "mention",
          content: "none",
          propSchema: { label: { default: "Ada" } },
        },
        { render: () => ({ dom: document.createElement("span") }) },
      ),
    },
    styleSpecs: {
      highlight: createStyleSpec(
        { type: "highlight", propSchema: "boolean" },
        { render: () => ({ dom: document.createElement("span") }) },
      ),
    },
  });
  type B = typeof schema.blockSchema;
  type I = typeof schema.inlineContentSchema;
  type S = typeof schema.styleSchema;
  expectTypeOf(InMemoryVersioningExtension<B, I, S>)
    .parameter(0)
    .toEqualTypeOf<LocalVersioningOptions<B, I, S> | undefined>();
  type SeedContent = NonNullable<
    LocalVersioningOptions<B, I, S>["initialVersions"]
  >[number]["content"];
  expectTypeOf<
    { type: "callout"; props: { tone: number } }[]
  >().not.toExtend<SeedContent>();
  expectTypeOf<{
    type: "paragraph";
    content: string;
  }>().not.toExtend<SeedContent>();
  const blocks: PartialBlock<B, I, S>[] = [
    {
      id: "custom",
      type: "callout",
      content: [
        { type: "text", text: "Custom text", styles: { highlight: true } },
        { type: "mention", props: { label: "Ada" } },
      ],
    },
  ];
  const editor = BlockNoteEditor.create({
    schema,
    extensions: [
      InMemoryVersioningExtension<B, I, S>({
        initialVersions: [{ content: blocks, createdAt: 1 }],
      }),
    ],
  });
  const mode = editor.getExtension(InMemoryVersioningExtension)!;
  try {
    const local = createLocalVersioning(editor, {
      initialVersions: [{ content: blocks, createdAt: 1 }],
    });
    expect(
      resultValue(
        await local.storage.getContent("1", new AbortController().signal),
      ).type.schema,
    ).toBe(editor.pmSchema);
    mode.open();
    await mode.select({ type: "snapshot", id: "1" });
    expect(editor.document[0]).toMatchObject({
      id: "custom",
      type: "callout",
      props: { tone: "info" },
      content: blocks[0].content,
    });
    mode.close();
  } finally {
    mode.dispose();
    editor._tiptapEditor.destroy();
  }
});

it.each(
  (
    [
      [],
      { type: "doc", content: [] },
      { type: "doc", content: [{ type: "paragraph" }] },
      { type: "doc", content: [{ type: "unknownNode" }] },
    ] satisfies Array<ProseMirrorDocumentJSON | PartialBlock[]>
  ).map((content) => ({ content })),
)(
  "rejects seeds that do not form a document in the receiving schema: $content",
  ({ content }) => {
    const editor = BlockNoteEditor.create();
    try {
      expect(() =>
        createLocalVersioning(editor, {
          initialVersions: [{ content, createdAt: 1 }],
        }),
      ).toThrow();
    } finally {
      editor._tiptapEditor.destroy();
    }
  },
);

it("reads seeds at editor construction and gives each editor its own history", async () => {
  const blocks: PartialBlock[] = [{ id: "saved", content: "First history" }];
  const extension = InMemoryVersioningExtension({
    initialVersions: [{ content: blocks, name: "Draft", createdAt: 123 }],
  });
  const first = BlockNoteEditor.create({ extensions: [extension] });
  blocks[0].content = "Second history";
  const second = BlockNoteEditor.create({ extensions: [extension] });
  blocks[0].content = "Later edit";
  const firstMode = first.getExtension(InMemoryVersioningExtension)!;
  const secondMode = second.getExtension(InMemoryVersioningExtension)!;
  try {
    firstMode.open();
    await firstMode.select({ type: "snapshot", id: "1" });
    expect(first.prosemirrorState.doc.textContent).toBe("First history");
    await firstMode.rename("1", "Renamed");
    secondMode.open();
    await secondMode.list();
    await secondMode.select({ type: "snapshot", id: "1" });
    expect(second.prosemirrorState.doc.textContent).toBe("Second history");
    expect(first.prosemirrorState.doc.textContent).toBe("First history");
    const state = secondMode.store.state;
    expect(state.mode).toBe("versions");
    if (state.mode === "versions") {
      expect(state.history).toEqual({
        status: "success",
        data: [{ id: "1", name: "Draft", createdAt: 123 }],
      });
    }
  } finally {
    firstMode.dispose();
    secondMode.dispose();
    first._tiptapEditor.destroy();
    second._tiptapEditor.destroy();
  }
});

it("finds the built-in extension by its factory with default options", () => {
  const editor = BlockNoteEditor.create({
    extensions: [InMemoryVersioningExtension()],
  });
  try {
    const mode = editor.getExtension(InMemoryVersioningExtension);
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
    expect(await mode.create("Captured")).toEqual({ status: "done" });
    const state = mode.store.state;
    if (state.mode !== "versions" || !state.history.data?.[0]) {
      throw new Error("Expected a created version");
    }
    const saved = state.history.data[0];
    await mode.select({ type: "snapshot", id: saved.id });
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
    expect(await mode.create()).toEqual({ status: "done" });
    const state = mode.store.state;
    if (state.mode !== "versions" || !state.history.data?.[0]) {
      throw new Error("Expected a created version");
    }
    const saved = state.history.data[0];
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

it("clears local undo and redo through previews and restores without preview history", async () => {
  const editor = BlockNoteEditor.create({
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
  editor.prosemirrorView.updateState(
    editor.prosemirrorState.reconfigure({ plugins: [history()] }),
  );
  const mode = editor.getExtension(InMemoryVersioningExtension)!;
  const dispatch = editor.prosemirrorView.dispatch;
  function text() {
    return editor.prosemirrorState.doc.textContent;
  }
  function edit(content: string) {
    editor.transact((tr) => closeHistory(tr));
    editor.updateBlock("paragraph", { content });
  }
  try {
    edit("live");
    expect(undoDepth(editor.prosemirrorState)).toBeGreaterThan(0);
    mode.open();
    expect(editor.isEditable).toBe(false);
    expect(history().spec.key!.get(editor.prosemirrorState)).toBeUndefined();
    for (const id of ["1", "2"]) {
      await mode.select({ type: "snapshot", id });
      expect(text()).toBe(id === "1" ? "snapshot one" : "snapshot two");
    }
    await mode.select({ type: "current" });
    expect(text()).toBe("live");
    mode.close();
    expect(undo(editor.prosemirrorState, dispatch)).toBe(false);
    expect(redo(editor.prosemirrorState, dispatch)).toBe(false);
    edit("new live");
    expect(undo(editor.prosemirrorState, dispatch)).toBe(true);
    expect(text()).toBe("live");
    expect(redo(editor.prosemirrorState, dispatch)).toBe(true);
    expect(text()).toBe("new live");
    mode.open();
    await mode.select({ type: "snapshot", id: "2" });
    await mode.restore("1");
    expect(text()).toBe("snapshot one");
    expect(editor.isEditable).toBe(true);
    expect(undo(editor.prosemirrorState, dispatch)).toBe(false);
    expect(redo(editor.prosemirrorState, dispatch)).toBe(false);
    edit("after restore");
    expect(undo(editor.prosemirrorState, dispatch)).toBe(true);
    expect(text()).toBe("snapshot one");
    expect(redo(editor.prosemirrorState, dispatch)).toBe(true);
    expect(text()).toBe("after restore");
  } finally {
    mode.dispose();
    editor._tiptapEditor.destroy();
  }
});
