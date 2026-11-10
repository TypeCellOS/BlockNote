import { type Block, BlockNoteEditor } from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import {
  type ChangeOperations,
  computeOperations,
  type DocumentChange,
  getDocumentText,
  htmlFormat,
  type JSONChange,
  updateDocument,
} from "./index.js";
import {
  columnSchema,
  createColumnsEditor,
  createEditor,
} from "./testUtil/fixtures.js";
import { valid } from "./testUtil/valid.js";

const initial = [
  { id: "a", type: "paragraph" as const, content: "Alpha" },
  { id: "b", type: "paragraph" as const, content: "Beta" },
  { id: "c", type: "paragraph" as const, content: "Gamma" },
];

/** The document of a client: a copy that the client can change. */
function copy(blocks: Block<any, any, any>[]): Block<any, any, any>[] {
  return JSON.parse(JSON.stringify(blocks));
}

/** Applies the JSON, and fails the test if the result is an error. */
function update(
  editor: Parameters<typeof updateDocument>[0],
  options: DocumentChange,
): ChangeOperations {
  return valid(updateDocument(editor, options));
}

describe("JSON", () => {
  it("gives no operations for the same document", () => {
    const editor = createEditor(initial);
    expect(
      computeOperations(editor, {
        base: "current",
        document: copy(editor.document),
      }),
    ).toEqual({ operations: [], warnings: [] });
  });

  it("updates only the changed field of a block, by its ID", () => {
    const editor = createEditor(initial);
    const document = copy(editor.document);
    document[1].props.textColor = "red";

    const result = update(editor, { base: "current", document });

    expect(result.operations).toEqual([
      { type: "update", id: "b", update: { props: { textColor: "red" } } },
    ]);
    expect(editor.getBlock("b")?.props).toMatchObject({ textColor: "red" });
  });

  it("inserts a block without an ID, removes a missing block, and moves a block", () => {
    const editor = createEditor(initial);
    const [a, b, c] = copy(editor.document);

    update(editor, {
      base: "current",
      document: [c, a, { type: "paragraph", content: "New" }],
    });

    expect(editor.document.map((block) => block.id).slice(0, 2)).toEqual([
      "c",
      "a",
    ]);
    expect(editor.getBlock(b.id)).toBeUndefined();
    expect(editor.document[2].content).toMatchObject([{ text: "New" }]);
  });

  it("keeps the change of another writer with a base", () => {
    const editor = createEditor(initial);
    const base = copy(editor.document);
    const document = copy(base);
    document[0].props.textColor = "red";
    // Another writer changes block c after the client read the document.
    editor.updateBlock("c", { content: "Gamma, edited" });

    update(editor, { document, base });

    expect(editor.getBlock("a")?.props).toMatchObject({ textColor: "red" });
    expect(editor.getBlock("c")?.content).toMatchObject([
      { text: "Gamma, edited" },
    ]);
  });

  it("rejects a write with a conflict, with onConflict reject", () => {
    const editor = createEditor(initial);
    const base = copy(editor.document);
    const document = copy(base);
    document[0].props.textColor = "red";
    document[2].props.textColor = "green";
    // Another writer changes the same prop of block c.
    editor.updateBlock("c", { props: { textColor: "blue" } });
    const before = editor.document;

    expect(
      updateDocument(editor, { document, base, onConflict: "reject" }),
    ).toEqual({
      error: "conflict",
      conflicts: [{ type: "conflicting-change", id: "c" }],
    });
    expect(editor.document).toEqual(before);
  });

  it.each([
    { name: "an unknown block type", document: [{ type: "unknown" }] },
    {
      name: "an unknown inline content type",
      document: [{ type: "paragraph", content: [{ type: "unknown" }] }],
    },
    {
      name: "content in a block without content",
      document: [{ type: "image", content: "Text in a block without content" }],
    },
    {
      name: "an unknown style",
      document: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "x", styles: { unknown: true } }],
        },
      ],
    },
    // A heading level "1 x" would give the element name "h1 x", and each
    // later read would throw.
    {
      name: "a heading level that does not fit the prop schema",
      document: [
        { type: "heading", props: { level: "1 x" }, content: "Hello" },
      ],
    },
    {
      name: "a checkbox value that does not fit the prop schema",
      document: [
        { type: "checkListItem", props: { checked: "yes" }, content: "Task" },
      ],
    },
    {
      name: "an alignment that does not fit the prop schema",
      document: [{ type: "paragraph", props: { textAlignment: "diagonal" } }],
    },
  ])(
    "gives an error for $name, and does not change the document",
    ({ document }) => {
      const editor = createEditor(initial);
      const before = copy(editor.document);

      expect(
        updateDocument(editor, {
          base: "current",
          document: document as JSONChange["document"],
        }),
      ).toEqual({ error: "invalid-document" });
      expect(editor.document).toEqual(before);
      expect(() => getDocumentText(editor, htmlFormat)).not.toThrow();
    },
  );

  // REVISIT: a JSON with two blocks with one ID is not valid input: the
  // client must give each block its own ID. An earlier version gave the later
  // block the ID with a number (`x-2`) and applied the change. We can return
  // to that if clients need it (see `assertBlockIds`).
  it("gives an error for a later block with the ID of an earlier block", () => {
    const editor = createEditor(initial);
    const before = editor.document;
    const [a, b] = copy(editor.document);
    const duplicate = { ...a, content: "Alpha, copy" };

    expect(
      updateDocument(editor, {
        base: "current",
        document: [a, duplicate, b],
      }),
    ).toEqual({ error: "invalid-document" });
    expect(editor.document).toEqual(before);
  });

  it("gives an error for a nested block with the ID of a block at a different level", () => {
    const editor = createEditor(initial);
    const [a, b, c] = copy(editor.document);
    const nested = { ...b, content: "Nested" };

    expect(
      updateDocument(editor, {
        base: "current",
        document: [a, { ...b, children: [nested] }, c],
      }),
    ).toEqual({ error: "invalid-document" });
  });

  it("with a base, gives a new ID to a block with the ID of a block that another writer added", () => {
    const editor = createEditor(initial);
    const base = copy(editor.document);
    // Another writer adds block d after the client read the document.
    editor.insertBlocks(
      [{ id: "d", type: "paragraph", content: "Delta" }],
      "c",
      "after",
    );
    // The client adds a block with the same ID, which it did not read.
    const document = [
      ...copy(base),
      { id: "d", type: "paragraph" as const, content: "Client block" },
    ];

    update(editor, { document, base });

    expect(editor.getBlock("d")?.content).toMatchObject([{ text: "Delta" }]);
    const texts = editor.document.map(
      (block) => (block.content as { text: string }[])[0]?.text,
    );
    expect(texts).toEqual(["Alpha", "Beta", "Gamma", "Client block", "Delta"]);
  });

  it("keeps a new ID that is not in the document", () => {
    const editor = createEditor(initial);
    const document = [
      ...copy(editor.document),
      { id: "new", type: "paragraph" as const, content: "New" },
    ];

    update(editor, { base: "current", document });

    expect(editor.getBlock("new")?.content).toMatchObject([{ text: "New" }]);
  });

  it("reads children: null as no children, without an exception", () => {
    const editor = createEditor(initial);

    update(editor, {
      base: "current",
      document: [
        { id: "a", type: "paragraph", content: "Alpha", children: null },
      ] as unknown as JSONChange["document"],
    });

    expect(editor.document.map((block) => block.id)).toEqual(["a"]);
  });

  it("gives an error for a column outside a column list", () => {
    const editor = BlockNoteEditor.create({
      schema: columnSchema,
      initialContent: initial,
    });

    expect(
      updateDocument(editor, {
        base: "current",
        document: [
          {
            type: "column",
            children: [{ type: "paragraph", content: "In a column" }],
          },
        ],
      }),
    ).toEqual({ error: "invalid-document" });
  });

  it("does not add IDs to the document on an error", () => {
    const editor = createEditor(initial);
    editor.removeBlocks(["a", "b", "c"]);
    const before = editor.prosemirrorState.doc;

    expect(
      updateDocument(editor, {
        base: "current",
        document: [{ type: "unknown" }] as JSONChange["document"],
      }),
    ).toEqual({ error: "invalid-document" });
    expect(editor.prosemirrorState.doc).toBe(before);
  });

  it("puts two blocks into a new column list, without extra columns", () => {
    const editor = BlockNoteEditor.create({
      schema: columnSchema,
      initialContent: initial.slice(0, 2),
    });
    const [a, b] = copy(editor.document);

    update(editor, {
      base: "current",
      document: [
        {
          type: "columnList",
          children: [
            { type: "column", children: [a] },
            { type: "column", children: [b] },
          ],
        },
      ],
    });

    expect(editor.document).toHaveLength(1);
    expect(
      editor.document[0].children.map((column) =>
        column.children.map((block) => block.id),
      ),
    ).toEqual([["a"], ["b"]]);
  });

  // A block that changes between a layout block (a column or a column list)
  // and a block with content gets a new ID: the write removes the old block
  // and inserts a new one (see `newIdsForLayoutChanges`). REVISIT: the
  // alternative keeps the ID (the apply builds the new node in its structure
  // step); return to it if a client needs the ID, for example for comments.
  describe("type changes", () => {
    function columnsEditor(content: JSONChange["document"]) {
      return BlockNoteEditor.create({
        schema: columnSchema,
        initialContent: content as any,
      });
    }
    const twoColumns = [
      {
        id: "list",
        type: "columnList",
        children: [
          {
            id: "cA",
            type: "column",
            children: [{ id: "a", type: "paragraph", content: "A" }],
          },
          {
            id: "cB",
            type: "column",
            children: [{ id: "b", type: "paragraph", content: "B" }],
          },
        ],
      },
    ] as JSONChange["document"];

    it("changes a paragraph into a table", () => {
      const editor = createEditor([
        { id: "p", type: "paragraph", content: "Hello" },
      ]);

      update(editor, {
        base: "current",
        document: [
          {
            id: "p",
            type: "table",
            content: {
              type: "tableContent",
              rows: [{ cells: ["x", "y"] }],
            },
          },
        ],
      });

      expect(editor.getBlock("p")?.type).toBe("table");
    });

    it("changes a column into a top-level paragraph, with a new ID", () => {
      const editor = columnsEditor(twoColumns);

      update(editor, {
        base: "current",
        document: [{ id: "cA", type: "paragraph", content: "Was a column" }],
      });

      expect(editor.document.map((block) => block.type)).toEqual(["paragraph"]);
      expect(editor.document[0].id).not.toBe("cA");
      expect(editor.document[0].content).toMatchObject([
        { text: "Was a column" },
      ]);
    });

    it("changes a paragraph into a column list, with a new ID", () => {
      const editor = columnsEditor([
        { id: "p", type: "paragraph", content: "P" },
      ]);

      update(editor, {
        base: "current",
        document: [
          {
            id: "p",
            type: "columnList",
            children: [
              {
                type: "column",
                children: [{ type: "paragraph", content: "x" }],
              },
              {
                type: "column",
                children: [{ type: "paragraph", content: "y" }],
              },
            ],
          },
        ] as JSONChange["document"],
      });

      expect(editor.document.map((block) => block.type)).toEqual([
        "columnList",
      ]);
      expect(editor.document[0].id).not.toBe("p");
      expect(editor.document[0].children).toHaveLength(2);
    });

    it("changes a column list into a paragraph, with a new ID", () => {
      const editor = columnsEditor(twoColumns);

      update(editor, {
        base: "current",
        document: [{ id: "list", type: "paragraph", content: "Was columns" }],
      });

      expect(editor.document.map((block) => block.type)).toEqual(["paragraph"]);
      expect(editor.document[0].id).not.toBe("list");
    });

    it("keeps the IDs of the blocks in a column list that becomes a paragraph with these blocks as children", () => {
      const editor = columnsEditor(twoColumns);

      update(editor, {
        base: "current",
        document: [
          {
            id: "list",
            type: "paragraph",
            content: "Was columns",
            children: [
              { id: "a", type: "paragraph", content: "A" },
              { id: "b", type: "paragraph", content: "B" },
            ],
          },
        ] as JSONChange["document"],
      });

      expect(editor.document[0].id).not.toBe("list");
      expect(editor.document[0].children.map((block) => block.id)).toEqual([
        "a",
        "b",
      ]);
    });
  });
});

describe("JSON, a change of the content kind", () => {
  it("gives a hard break, not a line end in the text, for a code block that becomes a paragraph", () => {
    const editor = createEditor([
      { id: "c", type: "codeBlock", content: "line one\nline two" },
    ]);

    valid(
      updateDocument(editor, {
        base: "current",
        document: [
          { id: "c", type: "paragraph", content: "line one\nline two" },
        ],
      }),
    );

    const nodes: string[] = [];
    editor.prosemirrorState.doc.firstChild?.firstChild?.firstChild?.forEach(
      (node) => {
        nodes.push(`${node.type.name}:${node.text ?? ""}`);
      },
    );
    expect(nodes).toEqual(["text:line one", "hardBreak:", "text:line two"]);
  });
});

describe("JSON, the layout rules", () => {
  it("gives an error for a column that the JSON empties: the client gives a valid layout", () => {
    const editor = createColumnsEditor();
    const before = editor.document;
    const [list] = editor.document;
    const [first, second] = list.children;

    // An empty column does not fit the schema: the conversion would fill it.
    expect(
      updateDocument(editor, {
        base: "current",
        document: [
          {
            ...list,
            children: [
              {
                ...first,
                children: [...first.children, ...second.children],
              },
              { ...second, children: [] },
            ],
          },
        ],
      }),
    ).toEqual({ error: "invalid-document" });
    expect(editor.document).toEqual(before);
  });
});
