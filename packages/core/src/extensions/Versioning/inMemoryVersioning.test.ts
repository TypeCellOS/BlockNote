import { resultValue } from "./__test__/result.js";
import { expect, expectTypeOf } from "vite-plus/test";
import { BlockNoteSchema } from "../../blocks/BlockNoteSchema.js";
import type { PartialBlock } from "../../blocks/defaultBlocks.js";
import { createBlockSpec } from "../../schema/blocks/createSpec.js";
import { createInlineContentSpec } from "../../schema/inlineContent/createSpec.js";
import { createStyleSpec } from "../../schema/styles/createSpec.js";
import { DiffVersioningExtension } from "../../y/extensions/DiffVersioningExtension.js";
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

it.for(["current", "snapshot"] as const)(
  "compares %s against the earliest saved content since beginning",
  async (target, { setupEditor }) => {
    const { editor } = await setupEditor({
      initialContent: [{ id: "paragraph", type: "paragraph" }],
      extensions: [
        DiffVersioningExtension(),
        InMemoryVersioningExtension({
          initialVersions: ["a", "abc"].map((content, index) => ({
            content: [{ id: "paragraph", type: "paragraph", content }],
            createdAt: index + 1,
          })),
        }),
      ],
    });
    const mode = editor.getExtension(InMemoryVersioningExtension)!;
    try {
      for (const content of ["a", "ab", "abc"]) {
        editor.updateBlock("paragraph", { content });
      }
      mode.open();
      expect(await mode.list()).toEqual({ status: "done" });
      const state = mode.store.state;
      if (state.mode !== "versions" || state.history.status !== "success") {
        throw new Error("Expected loaded version history");
      }
      // The menu uses the oldest recorded snapshot as its baseline. Its
      // content already contains "a", so only later edits are insertions.
      const beginning = state.history.data.at(-1)!;
      expect(
        await mode.select(
          target === "current"
            ? { type: "current" }
            : { type: "snapshot", id: state.history.data[0].id },
          { compareTo: beginning.id },
        ),
      ).toEqual({ status: "done" });

      const characters: Array<{ character: string; inserted: boolean }> = [];
      editor.prosemirrorState.doc.descendants((node) => {
        if (node.isText) {
          for (const character of node.text ?? "") {
            characters.push({
              character,
              inserted: node.marks.some(
                (mark) => mark.type.name === "y-attributed-insert",
              ),
            });
          }
        }
      });
      expect(characters).toEqual([
        { character: "a", inserted: false },
        { character: "b", inserted: true },
        { character: "c", inserted: true },
      ]);
    } finally {
      mode.dispose();
    }
  },
);

it("uses saved content for both previews and comparison baselines", async ({
  setupEditor,
}) => {
  const { editor } = await setupEditor();
  const { storage } = createLocalVersioning(editor, {
    initialVersions: [
      { content: [{ content: "abc" }], createdAt: 2 },
      { content: [{ content: "a" }], createdAt: 1 },
    ],
  });
  const signal = new AbortController().signal;
  const earliest = resultValue(await storage.getContent("2", signal));
  expect(earliest.textContent).toBe("a");
  earliest.check();
  expect(resultValue(await storage.getContent("1", signal)).textContent).toBe(
    "abc",
  );
  expect(await storage.getContent("missing", signal)).toEqual({
    ok: false,
    error: { type: "not-found" },
  });
});

it("returns seeded versions newest first regardless of insertion order", async ({
  setupEditor,
}) => {
  const { editor } = await setupEditor();
  const { storage } = createLocalVersioning(editor, {
    initialVersions: [10, 30, 20].map((createdAt) => ({
      content: [{ type: "paragraph" }],
      createdAt,
    })),
  });
  const page = resultValue(await storage.list(new AbortController().signal));
  expect(page.snapshots.map(({ createdAt }) => createdAt)).toEqual([
    30, 20, 10,
  ]);
});

it("previews and restores JSON exported from another editor's schema", async ({
  setupEditor,
}) => {
  const { editor: source } = await setupEditor({
    initialContent: [
      { id: "paragraph", type: "paragraph", content: "Old text" },
    ],
  });
  const sourceSchema = source.pmSchema;
  const before = source.prosemirrorState.doc.toJSON();
  source.updateBlock("paragraph", { content: "Changed text" });
  const after = source.prosemirrorState.doc.toJSON();
  const { editor } = await setupEditor({
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
  }
});

it("loads table content and attributes from ProseMirror JSON seeds", async ({
  setupEditor,
}) => {
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
  const { editor } = await setupEditor();
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
});

it("uses custom block, inline-content, and style schemas for partial-block seeds", async ({
  setupEditor,
}) => {
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
  const { editor } = await setupEditor({
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
  }
});

it.for(
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
  async ({ content }, { setupEditor }) => {
    const { editor } = await setupEditor();
    expect(() =>
      createLocalVersioning(editor, {
        initialVersions: [{ content, createdAt: 1 }],
      }),
    ).toThrow();
  },
);

it("reads seeds at editor construction and gives each editor its own history", async ({
  setupEditor,
}) => {
  const blocks: PartialBlock[] = [{ id: "saved", content: "First history" }];
  const extension = InMemoryVersioningExtension({
    initialVersions: [{ content: blocks, name: "Draft", createdAt: 123 }],
  });
  const { editor: first } = await setupEditor({ extensions: [extension] });
  blocks[0].content = "Second history";
  const { editor: second } = await setupEditor({ extensions: [extension] });
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
  }
});

it("finds the built-in extension by its factory with default options", async ({
  setupEditor,
}) => {
  const { editor } = await setupEditor({
    extensions: [InMemoryVersioningExtension()],
  });
  const mode = editor.getExtension(InMemoryVersioningExtension);
  expect(mode).toBeDefined();
  expect(mode).toBe(editor.getExtension<VersioningController>("versioning"));
});

it("restores the live document across open/show/close", async ({
  setupEditor,
}) => {
  const extension = createVersioningExtension(createLocalVersioning);
  const { editor } = await setupEditor({ extensions: [extension()] });
  const mode = editor.getExtension(extension)!;
  try {
    editor.replaceBlocks(editor.document, [
      { type: "paragraph", content: "Live" },
    ]);
    const before = editor.document;
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
    expect(editor.document).toEqual(before);
    expect(editor.isEditable).toBe(true);
  } finally {
    mode.dispose();
  }
});

it.for([false, true])(
  "does not publish previews as changes, with comparison %s",
  async (compare, { setupEditor }) => {
    const { editor } = await setupEditor({
      initialContent: [{ id: "paragraph", content: "live" }],
      extensions: [
        DiffVersioningExtension(),
        InMemoryVersioningExtension({
          initialVersions: [
            { content: [{ id: "paragraph", content: "saved" }], createdAt: 1 },
          ],
        }),
      ],
    });
    const mode = editor.getExtension(InMemoryVersioningExtension)!;
    const changes: string[] = [];
    editor.onChange(() =>
      changes.push(editor.prosemirrorState.doc.textContent),
    );
    try {
      mode.open();
      expect(
        await mode.select(
          compare ? { type: "current" } : { type: "snapshot", id: "1" },
          compare ? { compareTo: "1" } : undefined,
        ),
      ).toEqual({ status: "done" });
      await mode.select({ type: "current" });
      mode.close();
      expect(changes).toEqual([]);
      editor.updateBlock("paragraph", { content: "edited" });
      expect(changes).toEqual(["edited"]);
    } finally {
      mode.dispose();
    }
  },
);

it("publishes a restore as a live document change after closing the isolated view", async ({
  setupEditor,
}) => {
  const extension = createVersioningExtension(createLocalVersioning);
  const { editor } = await setupEditor({ extensions: [extension()] });
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
    const changes: string[] = [];
    editor.onChange(() =>
      changes.push(editor.prosemirrorState.doc.textContent),
    );
    await mode.select({ type: "snapshot", id: saved.id });
    await mode.select({ type: "current" });
    expect(editor.prosemirrorState.doc.textContent).toBe("Latest");
    changes.length = 0;
    await mode.restore(saved.id);
    expect(changes).toEqual(["Original"]);
    expect(editor.prosemirrorState.doc.textContent).toBe("Original");
    expect(editor.isEditable).toBe(true);
    editor.replaceBlocks(editor.document, [
      { type: "paragraph", content: "After restore" },
    ]);
    expect(changes).toEqual(["Original", "After restore"]);
  } finally {
    mode.dispose();
  }
});
