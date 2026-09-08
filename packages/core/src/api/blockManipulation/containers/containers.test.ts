// @vitest-environment node
import { TextSelection } from "prosemirror-state";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vite-plus/test";

import { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import { createBlockSpec } from "../../../schema/blocks/createSpec.js";
import { containerSchema } from "./containers.fixture.js";

type PartialBlock = (typeof containerSchema)["PartialBlock"];

// Document-model behaviour of container blocks: filling, schema enforcement,
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

describe("children insertion & filling", () => {
  it.each([
    { block: { type: "callout" }, childType: "paragraph", min: 1 },
    {
      block: { type: "callout", children: [] },
      childType: "paragraph",
      min: 1,
    },
    { block: { type: "pair" }, childType: "paragraph", min: 2 },
    { block: { type: "grid" }, childType: "gridCell", min: 2 },
  ] satisfies { block: PartialBlock; childType: string; min: number }[])(
    "fills $block to its minimum with identifiable $childType children",
    ({ block, childType, min }) => {
      editor.insertBlocks([{ ...block, id: "container" }], "p-1", "after");
      const children = editor.getBlock("container")!.children;
      expect(children.map((child) => child.type)).toEqual(
        Array(min).fill(childType),
      );
      for (const child of children) {
        expect(child.id).toBeTruthy();
        expect(editor.getBlock(child.id)).toBeDefined();
      }
    },
  );

  it("does not re-fill a container round-tripped through the document", () => {
    editor.insertBlocks([{ type: "callout", id: "c-0" }], "p-1", "after");
    const inserted = editor.getBlock("c-0")!;

    // `nodeToBlock` always emits an array, so a round-trip must not read an
    // empty one as "unspecified" and fill on top of it.
    editor.replaceBlocks([inserted], [inserted]);

    expect(editor.getBlock("c-0")!.children).toHaveLength(
      inserted.children.length,
    );
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

  // The `allow: "blocks"` wildcard compiles to the regular blocks plus the
  // containers placeable anywhere, so a namedOnly block only fits where a
  // parent names it explicitly: not at the root, and not under a wildcard
  // container.
  it("rejects a namedOnly block outside a parent that names it", () => {
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

describe("container nodes", () => {
  // No container is `isolating`. PM only honours that flag while no selection
  // spans the edge, and nothing prevents one: given a spanning slice, `Fitter`
  // refuses to open into the container and wraps the content in a spurious
  // `blockGroup`, corrupting the document.
  it("leaves every container non-isolating", () => {
    const nodes = editor.pmSchema.nodes;
    for (const type of ["callout", "pair", "grid", "gridCell"]) {
      expect(nodes[type].spec.isolating).toBeFalsy();
    }
  });

  // The corruption the line above avoids, pinned end to end: copy a selection
  // running from inside a container to after it, paste it back over itself,
  // and the document must come back unchanged. Marking the container
  // `isolating` instead re-nests the whole fragment a level too deep.
  it.each(["callout", "pair"])(
    "round-trips a paste across a %s's edge",
    (type) => {
      editor.replaceBlocks(editor.document, [
        {
          id: "c",
          type,
          children: [
            { id: "c1", type: "paragraph", content: "Inner one" },
            { id: "c2", type: "paragraph", content: "Inner two" },
          ],
        },
        { id: "a", type: "paragraph", content: "After" },
      ] as PartialBlock[]);

      const before = JSON.stringify(editor.document);

      editor.transact((tr) => {
        let from = 0;
        let to = 0;
        tr.doc.descendants((node, pos) => {
          if (node.isText && node.text === "Inner two") {
            from = pos;
          }
          if (node.isText && node.text === "After") {
            to = pos + node.nodeSize;
          }
        });

        const selection = TextSelection.create(tr.doc, from, to);
        tr.setSelection(selection).replace(from, to, selection.content());
      });

      expect(JSON.stringify(editor.document)).toBe(before);
    },
  );
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

  it("fills a container below `min` and rejects one it can never fill", () => {
    // One cell under `min: 2` is padded up to it.
    const loaded = createWith([
      { type: "grid", id: "g-0", children: [{ type: "gridCell" }] },
    ] as any);
    expect(loaded.getBlock("g-0")!.children).toHaveLength(2);
    loaded._tiptapEditor.destroy();

    // A grid given paragraphs can never be filled: no amount of padding
    // turns them into cells.
    expect(() =>
      createWith([
        {
          type: "grid",
          id: "g-0",
          children: [{ type: "paragraph" }, { type: "paragraph" }],
        },
      ] as any),
    ).toThrow();
  });
});

describe("children repair", () => {
  it("dissolves a container that can stand anywhere when it drops below `min`", () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "callout",
        id: "c-0",
        children: [{ id: "c-p-0", type: "paragraph", content: "Only child" }],
      },
      { id: "trailing", type: "paragraph", content: "" },
    ]);

    editor.removeBlocks(["c-p-0"]);

    // A callout the user emptied gets out of the way: it is replaced by what
    // its children held, which is nothing.
    expect(editor.getBlock("c-0")).toBeUndefined();
    expect(editor.document.map((block) => block.id)).toEqual(["trailing"]);
  });

  it("unwraps a container whose single survivor cannot stand alone", () => {
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
    expect(() => editor.prosemirrorState.doc.check()).not.toThrow();
  });

  // An emptied child of the container is dropped even when the container
  // stays at or above `min`: an emptied column disappears rather than
  // lingering. The multicolumn e2e snapshots pin the same behavior from the
  // keyboard side.
  it("drops emptied container children even at or above `min`", () => {
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

describe("repair edge cases", () => {
  // A container that explicitly allows being empty. `min: 0` compiles to a
  // `*` content expression, so ProseMirror never pads it and repair leaves
  // it alone.
  const Tray = createBlockSpec(
    {
      type: "tray" as const,
      propSchema: {},
      content: "none" as const,
      children: { allow: "blocks", min: 0 },
    },
    {
      render: () => {
        const dom = document.createElement("div");
        return { dom, contentDOM: dom };
      },
    },
  )();

  it("keeps a `min: 0` container with zero children", () => {
    const trayEditor = BlockNoteEditor.create({
      schema: containerSchema.extend({
        blockSpecs: { tray: Tray },
      }),
    });
    try {
      trayEditor.replaceBlocks(trayEditor.document, [
        {
          type: "tray",
          id: "t-0",
          children: [{ id: "t-p-0", type: "paragraph", content: "" }],
        },
        { id: "trailing", type: "paragraph", content: "" },
      ]);

      // Removing its only (empty) child leaves zero children, which `min: 0`
      // allows: the tray stays instead of dissolving, and nothing is padded
      // back.
      trayEditor.removeBlocks(["t-p-0"]);

      expect(trayEditor.getBlock("t-0")).toBeDefined();
      expect(trayEditor.getBlock("t-0")!.children).toHaveLength(0);
      expect(() => trayEditor.prosemirrorState.doc.check()).not.toThrow();
    } finally {
      trayEditor._tiptapEditor.destroy();
    }
  });

  it("keeps emptied regular blocks when the container survives", () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "callout",
        id: "c-0",
        children: [
          { id: "c-a", type: "paragraph", content: "A" },
          { id: "c-b", type: "paragraph", content: "B" },
          { id: "c-empty", type: "paragraph", content: "" },
        ],
      },
      { id: "trailing", type: "paragraph", content: "" },
    ]);

    editor.removeBlocks(["c-a"]);

    // Only emptied *container* children are dropped. The empty paragraph is
    // content the user typed into, not structure, so it stays.
    expect(editor.getBlock("c-0")!.children.map((child) => child.id)).toEqual([
      "c-b",
      "c-empty",
    ]);
  });

  it("dissolves a `min: 2` container left with one surviving child", () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "pair",
        id: "s-0",
        children: [
          { id: "s-a", type: "paragraph", content: "A" },
          { id: "s-b", type: "paragraph", content: "B" },
        ],
      },
      { id: "trailing", type: "paragraph", content: "" },
    ]);

    editor.removeBlocks(["s-b"]);

    // One survivor is below `min: 2`, so the pair dissolves into it. The
    // padded empty ProseMirror filled back does not count as a survivor.
    expect(editor.getBlock("s-0")).toBeUndefined();
    expect(editor.document.map((block) => block.id)).toEqual([
      "s-a",
      "trailing",
    ]);
    expect(() => editor.prosemirrorState.doc.check()).not.toThrow();
  });

  it("leaves a titled block intact when its last body block is removed", () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "alert",
        id: "w",
        content: "Title",
        children: [{ id: "b1", type: "paragraph", content: "" }],
      },
      { id: "trailing", type: "paragraph", content: "" },
    ]);

    editor.removeBlocks(["b1"]);

    // Titled blocks never enter `fixContainer`: the alert keeps its title
    // with an empty body rather than dissolving.
    const alert = editor.getBlock("w")! as any;
    expect(alert.type).toBe("alert");
    expect(alert.content[0].text).toBe("Title");
    expect(alert.children).toHaveLength(0);
    expect(() => editor.prosemirrorState.doc.check()).not.toThrow();
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

// Every mutation that can empty a container records its ancestors with
// `getAncestorContainers` and hands them to `fixContainersById`, which repairs
// them deepest-first. Removing a block therefore repairs the whole chain it
// sat in, not just the container directly holding it.
describe("ancestor container repair", () => {
  it("repairs every container a single removal emptied", () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "callout",
        id: "c-0",
        children: [{ id: "c-p-0", type: "paragraph", content: "Only child" }],
      },
      {
        type: "pair",
        id: "s-0",
        children: [
          { id: "s-p-0", type: "paragraph", content: "Kept" },
          { id: "s-p-1", type: "paragraph", content: "Removed" },
        ],
      },
      { id: "trailing", type: "paragraph", content: "" },
    ]);

    // Blocks from two different containers in one call: each container is
    // recorded once and repaired on its own terms.
    editor.removeBlocks(["c-p-0", "s-p-1"]);

    // Both containers dissolve: the callout held nothing else, and the pair
    // is replaced by the one child that still carried content.
    expect(editor.getBlock("c-0")).toBeUndefined();
    expect(editor.getBlock("s-0")).toBeUndefined();
    expect(editor.document.map((block) => block.id)).toEqual([
      "s-p-0",
      "trailing",
    ]);
  });

  it("cascades a repair outwards from the deepest container", () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "grid",
        id: "g-outer",
        children: [
          {
            type: "gridCell",
            id: "outer-cell-a",
            children: [
              {
                type: "grid",
                id: "g-inner",
                children: [
                  {
                    type: "gridCell",
                    id: "inner-cell-a",
                    children: [
                      { id: "inner-p", type: "paragraph", content: "X" },
                    ],
                  },
                  {
                    type: "gridCell",
                    id: "inner-cell-b",
                    children: [{ type: "paragraph", content: "" }],
                  },
                ],
              },
            ],
          },
          {
            type: "gridCell",
            id: "outer-cell-b",
            children: [{ type: "paragraph", content: "" }],
          },
        ],
      },
      { id: "trailing", type: "paragraph", content: "" },
    ]);

    // The only real content, three containers deep. Removing it empties the
    // inner cell, and the emptiness has to travel all the way out: the inner
    // grid loses both its cells, the outer cell loses the inner grid, and the
    // outer grid loses both of its cells. Recording only the innermost
    // container would leave a stack of empty grids behind.
    editor.removeBlocks(["inner-p"]);

    expect(editor.getBlock("g-inner")).toBeUndefined();
    expect(editor.getBlock("g-outer")).toBeUndefined();
    expect(editor.document.map((block) => block.id)).toEqual(["trailing"]);
    expect(() => editor.prosemirrorState.doc.check()).not.toThrow();
  });
});
