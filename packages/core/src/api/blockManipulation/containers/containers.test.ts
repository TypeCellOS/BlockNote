// @vitest-environment node
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vite-plus/test";

import { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import { getParentBlockInfo } from "../../getBlockInfoFromPos.js";
import { getNodeById } from "../../nodeUtil.js";
import { containerSchema } from "./containers.fixture.js";

type PartialBlock = (typeof containerSchema)["PartialBlock"];

// Document-model behaviour of container blocks: seeding, schema enforcement,
// repair and selection. Everything is `Block` JSON in and out, so the editor
// runs headless with no DOM.
//
// The keymap (tiptap can only reach it through a mounted view) and
// HTML/markdown serialization (builds real DOM) are tested in
// `containers.browser.test.ts`.

const schema = containerSchema;

let editor: BlockNoteEditor<
  typeof schema.blockSchema,
  typeof schema.inlineContentSchema,
  typeof schema.styleSchema
>;

beforeAll(() => {
  editor = BlockNoteEditor.create({ schema });
});

afterAll(() => {
  editor._tiptapEditor.destroy();
  editor = undefined as any;
});

beforeEach(() => {
  editor.replaceBlocks(editor.document, [
    { id: "p-0", type: "paragraph", content: "Paragraph 0" },
    { id: "p-1", type: "paragraph", content: "Paragraph 1" },
  ]);
});

describe("children insertion & seeding", () => {
  it("seeds `default` when inserted without children", () => {
    editor.insertBlocks([{ type: "callout", id: "c-0" }], "p-1", "after");

    const callout = editor.getBlock("c-0")!;
    expect(callout.children).toHaveLength(1);
    expect(callout.children[0].type).toBe("paragraph");
  });

  // Regression: `min` defaults to 1 and nothing seeded a container without
  // `default`, so inserting one threw a raw ProseMirror
  // `RangeError: Invalid content for node ...`.
  it("fills a container that has no `default`, with real child ids", () => {
    expect(() =>
      editor.insertBlocks([{ type: "sealedBox", id: "b-0" }], "p-1", "after"),
    ).not.toThrow();

    const box = editor.getBlock("b-0")!;
    expect(box.children).toHaveLength(1);
    expect(box.children[0].type).toBe("paragraph");
    // Auto-filled nodes come from the schema with `id: null`, and the
    // UniqueID plugin never sees them because `insertBlocks` converts back
    // through `nodeToBlock` before the transaction is dispatched.
    expect(box.children[0].id).toBeTruthy();
    expect(editor.getBlock(box.children[0].id)).toBeDefined();
  });

  it("does not re-seed a container round-tripped through the document", () => {
    editor.insertBlocks([{ type: "callout", id: "c-0" }], "p-1", "after");
    const inserted = editor.getBlock("c-0")!;

    // `nodeToBlock` always emits an array, so a round-trip must not read an
    // empty one as "unspecified" and seed on top of it.
    editor.replaceBlocks([inserted], [inserted]);

    expect(editor.getBlock("c-0")!.children).toHaveLength(
      inserted.children.length,
    );
  });

  // Regression: `children: []` was taken at face value, building a node below
  // `min: 1`, and `insertBlocks` threw a raw
  // `Invalid content for node callout: <>` from its `node.check()`.
  it("fills an explicitly empty `children` array up to `min`", () => {
    expect(() =>
      editor.insertBlocks(
        [{ type: "callout", id: "c-0", children: [] }],
        "p-1",
        "after",
      ),
    ).not.toThrow();

    const callout = editor.getBlock("c-0")!;
    expect(callout.children).toHaveLength(1);
    expect(callout.children[0].type).toBe("paragraph");
    expect(callout.children[0].id).toBeTruthy();
  });

  // A container that unwraps as it empties is the one case explicit children
  // are not padded: adding a second column to a one-column columnList would
  // invent content the next repair pass deletes anyway.
  it("refuses rather than pads a container that unwraps when emptied", () => {
    expect(() =>
      editor.insertBlocks(
        [{ type: "grid", id: "g-1", children: [{ type: "gridCell" }] }],
        "p-1",
        "after",
      ),
    ).toThrow();
  });

  it("accepts arbitrary block children, including nested containers", () => {
    editor.insertBlocks(
      [
        {
          type: "callout",
          id: "c-0",
          children: [
            { type: "heading", content: "In callout" },
            {
              type: "callout",
              id: "c-1",
              children: [{ type: "paragraph", content: "Nested" }],
            },
          ],
        },
      ],
      "p-1",
      "after",
    );

    const callout = editor.getBlock("c-0")!;
    expect(callout.children.map((child) => child.type)).toEqual([
      "heading",
      "callout",
    ]);
    expect(editor.getBlock("c-1")!.children[0].type).toBe("paragraph");
  });

  it("enforces a restricted container's allow list", () => {
    editor.insertBlocks(
      [
        {
          type: "grid",
          id: "g-0",
          children: [{ type: "gridCell" }, { type: "gridCell" }],
        },
      ],
      "p-1",
      "after",
    );
    expect(editor.getBlock("g-0")!.children.map((child) => child.type)).toEqual(
      ["gridCell", "gridCell"],
    );

    expect(() =>
      editor.insertBlocks(
        [
          {
            type: "grid",
            children: [
              { type: "paragraph", content: "not a cell" },
              { type: "paragraph", content: "not a cell" },
            ],
          },
        ],
        "p-1",
        "after",
      ),
    ).toThrow();
  });

  // The `allow: "any"` wildcard compiles to the containers placeable
  // anywhere, so a containerOnly block only fits where a parent names it
  // explicitly: not at the root, and not under a wildcard container.
  it("rejects a containerOnly block outside a parent that names it", () => {
    expect(() =>
      editor.insertBlocks(
        [{ type: "gridCell", children: [{ type: "paragraph" }] }],
        "p-1",
        "after",
      ),
    ).toThrow();

    expect(() =>
      editor.insertBlocks(
        [
          {
            type: "callout",
            children: [{ type: "gridCell", children: [{ type: "paragraph" }] }],
          },
        ],
        "p-1",
        "after",
      ),
    ).toThrow();
  });
});

describe("boundary", () => {
  it("derives ProseMirror `isolating` from `boundary`", () => {
    const nodes = editor.pmSchema.nodes;
    expect(nodes["openBox"].spec.isolating).toBe(false);
    // "isolated" is the default.
    expect(nodes["callout"].spec.isolating).toBe(true);
    // "sealed" also isolates.
    expect(nodes["sealedBox"].spec.isolating).toBe(true);
  });
});

// `initialContent` is the only path that builds a document without validating
// it, since `blockToNode` is deliberately lenient and `createDocument` builds
// from JSON. Regression: blocks that `insertBlocks` rejects loaded without
// error, and a container below its `min` stayed there for the life of the
// document.
describe("initialContent enforcement", () => {
  const createWith = (initialContent: PartialBlock[]) => {
    return BlockNoteEditor.create({ schema, initialContent });
  };

  it("fills an explicitly empty `children` array up to `min`", () => {
    const loaded = createWith([{ type: "callout", id: "c-0", children: [] }]);

    const callout = loaded.getBlock("c-0")!;
    expect(callout.children).toHaveLength(1);
    expect(callout.children[0].type).toBe("paragraph");

    loaded._tiptapEditor.destroy();
  });

  it("rejects a container it cannot legally fill", () => {
    expect(() =>
      createWith([
        { type: "grid", id: "g-0", children: [{ type: "gridCell" }] },
      ]),
    ).toThrow(/initialContent/);
  });
});

describe("children repair", () => {
  it("keeps a default container when its only child is removed (refilled)", () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "callout",
        id: "c-0",
        children: [{ id: "c-p-0", type: "paragraph", content: "Only child" }],
      },
      { id: "trailing", type: "paragraph", content: "" },
    ]);

    editor.removeBlocks(["c-p-0"]);

    const callout = editor.getBlock("c-0")!;
    expect(callout).toBeDefined();
    expect(callout.children).toHaveLength(1);
    expect(callout.children[0].type).toBe("paragraph");
    expect(callout.children[0].content).toEqual([]);
  });

  it("refills below `min` from the unconsumed tail of `default`", () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "seededPair",
        id: "s-0",
        children: [
          { id: "s-p-0", type: "paragraph", content: "Kept" },
          { id: "s-p-1", type: "paragraph", content: "Removed" },
        ],
      },
      { id: "trailing", type: "paragraph", content: "" },
    ]);

    editor.removeBlocks(["s-p-1"]);

    // One child survives (k = 1), so the top-up seeds `default[1]`, not an
    // empty paragraph and not `default[0]`.
    const pair = editor.getBlock("s-0")!;
    expect(pair.children).toHaveLength(2);
    expect(pair.children[0].content).toEqual([
      { type: "text", text: "Kept", styles: {} },
    ]);
    expect(pair.children[1].content).toEqual([
      { type: "text", text: "Seed B", styles: {} },
    ]);
  });

  it("unwraps a repair-configured container when only one non-empty child remains", () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "grid",
        id: "g-0",
        children: [
          {
            type: "gridCell",
            id: "cell-a",
            children: [{ id: "cell-a-p", type: "paragraph", content: "A" }],
          },
          {
            type: "gridCell",
            id: "cell-b",
            children: [{ id: "cell-b-p", type: "paragraph", content: "B" }],
          },
        ],
      },
      { id: "trailing", type: "paragraph", content: "" },
    ]);

    editor.removeBlocks(["cell-a-p"]);

    expect(editor.getBlock("g-0")).toBeUndefined();
    expect(editor.document.map((block) => block.id)).toEqual([
      "cell-b-p",
      "trailing",
    ]);
  });

  // Unlike `refillContainer` (which leaves empty children alone at or above
  // `min` — they may be intentional), the unwrap repair drops emptied
  // children unconditionally: an emptied third column disappears rather than
  // lingering, even though the list stays valid without unwrapping. The
  // multicolumn e2e snapshots pin the same behavior from the keyboard side.
  it("drops emptied children of an unwrap container even at or above `min`", () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "grid",
        id: "g-0",
        children: [
          {
            type: "gridCell",
            id: "cell-a",
            children: [
              { id: "cell-a-p", type: "paragraph", content: "A" },
              { id: "cell-a-extra", type: "paragraph", content: "A2" },
            ],
          },
          {
            type: "gridCell",
            id: "cell-b",
            children: [{ id: "cell-b-p", type: "paragraph", content: "B" }],
          },
          {
            type: "gridCell",
            id: "cell-c",
            children: [{ id: "cell-c-p", type: "paragraph", content: "" }],
          },
        ],
      },
      { id: "trailing", type: "paragraph", content: "" },
    ]);

    // Removing a block inside cell A runs repair on the grid; the emptied
    // cell C is dropped, and with cells A and B still meeting `min: 2` the
    // grid itself survives.
    editor.removeBlocks(["cell-a-extra"]);

    const grid = editor.getBlock("g-0")!;
    expect(grid.children.map((cell) => cell.id)).toEqual(["cell-a", "cell-b"]);
  });
});

describe("parent lookups for container children", () => {
  // Regression: `getParentBlockInfo` used to skip the container level for
  // container children (returning the grid for a block inside a gridCell),
  // which made the Delete-at-end climb run its sealed-container check on the
  // wrong node. The parent of a block is the block whose `children` contains
  // it: the cell.
  it("returns the container as the parent of its direct children", () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "grid",
        id: "g-0",
        children: [
          {
            type: "gridCell",
            id: "cell-a",
            children: [{ id: "cell-a-p", type: "paragraph", content: "A" }],
          },
          {
            type: "gridCell",
            id: "cell-b",
            children: [{ id: "cell-b-p", type: "paragraph", content: "B" }],
          },
        ],
      },
      { id: "trailing", type: "paragraph", content: "" },
    ]);

    editor.transact((tr) => {
      // The block directly containing a cell's paragraph is the cell.
      const cellChild = getNodeById("cell-a-p", tr.doc)!;
      expect(
        getParentBlockInfo(tr.doc, cellChild.posBeforeNode)?.blockNoteType,
      ).toBe("gridCell");

      // The parent of a cell is the grid; the parent of the grid (a
      // top-level block) is undefined.
      const cell = getNodeById("cell-a", tr.doc)!;
      expect(
        getParentBlockInfo(tr.doc, cell.posBeforeNode)?.blockNoteType,
      ).toBe("grid");

      const grid = getNodeById("g-0", tr.doc)!;
      expect(getParentBlockInfo(tr.doc, grid.posBeforeNode)).toBeUndefined();
    });
  });
});

describe("children selection", () => {
  it("getSelectionCutBlocks handles selections reaching into a container", () => {
    editor.replaceBlocks(editor.document, [
      { id: "before", type: "paragraph", content: "Before" },
      {
        type: "callout",
        id: "c-0",
        children: [
          { id: "c-p-0", type: "paragraph", content: "First" },
          { id: "c-p-1", type: "paragraph", content: "Second" },
        ],
      },
    ]);
    editor.setSelection("before", "c-p-0");

    // Previously threw "unexpected" for any partial selection touching a
    // container (breaking comments/AI selection handling).
    const result = editor.getSelectionCutBlocks();
    expect(result.blocks.length).toBeGreaterThanOrEqual(1);
    expect(result.blocks.map((block) => block.id)).toContain("before");
  });
});

describe("empty unwrap container", () => {
  // A `min >= 1`, `whenEmptied: "unwrap"` container with no `default` used to
  // build a schema-invalid node, so `node.check()` (run before the repair
  // pass) threw a raw RangeError instead of inserting.
  it("inserting an empty unwrap container does not throw", () => {
    editor.replaceBlocks(editor.document, [
      { id: "p-0", type: "paragraph", content: "Paragraph 0" },
    ]);

    expect(() =>
      editor.insertBlocks([{ type: "grid" }] as any, "p-0", "after"),
    ).not.toThrow();
  });
});

describe("moveBlocks placement validation", () => {
  // `checkPlacementIsValid` used to probe with `blockContainer`, so it accepted
  // a placement inside a blocks-only container for a container block (e.g. a
  // `callout`) that `insertBlocks` then rejected, throwing. It must validate
  // against the moved block's real node type and skip the invalid placement.
  it("moving a container block past a blocks-only container does not throw", () => {
    editor.replaceBlocks(editor.document, [
      { id: "p-0", type: "paragraph", content: "Paragraph 0" },
      {
        id: "box",
        type: "blocksOnlyBox",
        children: [{ id: "box-p", type: "paragraph", content: "Inside" }],
      },
      {
        id: "c-0",
        type: "callout",
        children: [{ id: "c-p", type: "paragraph", content: "Callout" }],
      },
    ]);

    expect(() => editor.moveBlocksUp("c-0")).not.toThrow();
    // The callout can't nest in the blocks-only box, so it lands directly
    // above it as a top-level sibling rather than being forced inside.
    expect(editor.getParentBlock("c-0")).toBeUndefined();
    expect(editor.document.map((block) => block.id)).toEqual([
      "p-0",
      "c-0",
      "box",
    ]);
  });
});
