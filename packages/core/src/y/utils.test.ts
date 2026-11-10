import { Block, docToBlocks } from "../index.js";
import { BlockNoteEditor } from "../editor/BlockNoteEditor.js";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { docToDelta } from "@y/prosemirror";
import type { Node } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import * as Y from "@y/y";
import { AttributionExtension } from "./extensions/AttributionExtension.js";
import {
  _blocksToProsemirrorNode,
  blocksToYDoc,
  blocksToYType,
  collectFragmentIds,
  docDiffToDelta,
  yNodeToTransaction,
  yDocToBlocks,
  yfragmentToBlocks,
} from "./utils.js";

describe("collectFragmentIds", () => {
  it.each(["document", "update"] as const)(
    "collects deleted descendants from a %s without including other roots",
    (input) => {
      const doc = new Y.Doc({ gc: false });
      const client = new Y.Doc();
      try {
        const fragment = doc.get("test");
        const nested = new Y.Node();
        fragment.push([nested]);
        nested.push(["Deleted content"]);
        const expected = Y.createContentIdsFromUpdate(
          Y.encodeStateAsUpdate(doc),
        ).inserts;
        fragment.delete(0, 1);
        doc.get("other").push(["Unrelated content"]);
        const update = Y.encodeStateAsUpdate(doc);
        Y.applyUpdate(client, update);

        let destroyed = false;
        doc.on("destroy", () => {
          destroyed = true;
        });
        const ids = collectFragmentIds(
          client.get("test"),
          input === "document" ? doc : update,
        );

        expect(ids).toEqual(expected);
        expect(destroyed).toBe(false);
      } finally {
        client.destroy();
        doc.destroy();
      }
    },
  );
});

describe("Test y (v14) utils", () => {
  const editor = BlockNoteEditor.create();

  const testConversion = (testName: string, blocks: Block[]) => {
    it(`${testName} - converts to and from prosemirror (doc)`, () => {
      const node = _blocksToProsemirrorNode(editor, blocks);
      const blockOutput = docToBlocks(node);
      expect(blockOutput).toEqual(blocks);
    });

    it(`${testName} - converts to and from yjs (doc)`, () => {
      const ydoc = blocksToYDoc(editor, blocks);
      const blockOutput = yDocToBlocks(editor, ydoc);
      expect(blockOutput).toEqual(blocks);
    });

    it(`${testName} - converts to and from yjs (fragment)`, () => {
      const doc = new Y.Doc();
      const fragment = doc.get("test");
      blocksToYType(editor, blocks, fragment);

      const blockOutput = yfragmentToBlocks(editor, fragment);
      expect(blockOutput).toEqual(blocks);
    });
  };

  describe("Original test case", () => {
    const blocks: Block[] = [
      {
        id: "1",
        type: "heading",
        props: {
          backgroundColor: "blue",
          textColor: "yellow",
          textAlignment: "right",
          level: 2,
          isToggleable: false,
        },
        content: [
          {
            type: "text",
            text: "Heading ",
            styles: {
              bold: true,
              underline: true,
            },
          },
          {
            type: "text",
            text: "2",
            styles: {
              italic: true,
              strike: true,
            },
          },
        ],
        children: [
          {
            id: "2",
            type: "paragraph",
            props: {
              backgroundColor: "red",
              textAlignment: "left",
              textColor: "default",
            },
            content: [
              {
                type: "text",
                text: "Paragraph",
                styles: {},
              },
            ],
            children: [],
          },
          {
            id: "3",
            type: "bulletListItem",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
            },
            content: [
              {
                type: "text",
                text: "list item",
                styles: {},
              },
            ],
            children: [],
          },
        ],
      },
      {
        id: "4",
        type: "image",
        props: {
          backgroundColor: "default",
          textAlignment: "left",
          name: "Example",
          url: "exampleURL",
          caption: "Caption",
          showPreview: true,
          previewWidth: 256,
        },
        content: undefined,
        children: [],
      },
      {
        id: "5",
        type: "image",
        props: {
          backgroundColor: "default",
          textAlignment: "left",
          name: "Example",
          url: "exampleURL",
          caption: "Caption",
          showPreview: false,
          previewWidth: 256,
        },
        content: undefined,
        children: [],
      },
    ];

    testConversion("original test case", blocks);
  });

  describe("Empty document", () => {
    it("empty document - handles empty array", () => {
      const blocks: Block[] = [];
      const node = _blocksToProsemirrorNode(editor, blocks);
      const blockOutput = docToBlocks(node);
      expect(blockOutput).toEqual([]);
    });

    // An empty block array round-trips stably through yjs to an empty block
    // array. (No phantom paragraph is materialized: the single empty
    // paragraph that a mounted editor shows for an empty Y fragment comes
    // from the schema's createAndFill initialBlockId stamp at mount time,
    // which is deterministic across clients.)
    it("empty document - converts to and from yjs (doc)", () => {
      const blocks: Block[] = [];
      const ydoc = blocksToYDoc(editor, blocks);
      const blockOutput = yDocToBlocks(editor, ydoc);
      expect(blockOutput).toEqual([]);
    });

    it("empty document - converts to and from yjs (fragment)", () => {
      const blocks: Block[] = [];
      const doc = new Y.Doc();
      const fragment = doc.get("test");
      blocksToYType(editor, blocks, fragment);

      const blockOutput = yfragmentToBlocks(editor, fragment);
      expect(blockOutput).toEqual([]);
    });
  });

  describe("Simple paragraphs", () => {
    const blocks: Block[] = [
      {
        id: "1",
        type: "paragraph",
        props: {
          backgroundColor: "default",
          textColor: "default",
          textAlignment: "left",
        },
        content: [
          {
            type: "text",
            text: "First paragraph",
            styles: {},
          },
        ],
        children: [],
      },
      {
        id: "2",
        type: "paragraph",
        props: {
          backgroundColor: "default",
          textColor: "default",
          textAlignment: "center",
        },
        content: [
          {
            type: "text",
            text: "Second paragraph",
            styles: {},
          },
        ],
        children: [],
      },
    ];
    testConversion("simple paragraphs", blocks);
  });

  describe("Deeply nested lists", () => {
    const blocks: Block[] = [
      {
        id: "1",
        type: "bulletListItem",
        props: {
          backgroundColor: "default",
          textColor: "default",
          textAlignment: "left",
        },
        content: [
          {
            type: "text",
            text: "Level 1",
            styles: {},
          },
        ],
        children: [
          {
            id: "2",
            type: "bulletListItem",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
            },
            content: [
              {
                type: "text",
                text: "Level 2",
                styles: {},
              },
            ],
            children: [
              {
                id: "3",
                type: "bulletListItem",
                props: {
                  backgroundColor: "default",
                  textColor: "default",
                  textAlignment: "left",
                },
                content: [
                  {
                    type: "text",
                    text: "Level 3",
                    styles: {},
                  },
                ],
                children: [
                  {
                    id: "4",
                    type: "bulletListItem",
                    props: {
                      backgroundColor: "default",
                      textColor: "default",
                      textAlignment: "left",
                    },
                    content: [
                      {
                        type: "text",
                        text: "Level 4",
                        styles: {},
                      },
                    ],
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ];
    testConversion("deeply nested lists", blocks);
  });

  describe("Numbered lists", () => {
    const blocks = [
      {
        id: "1",
        type: "numberedListItem",
        props: {
          backgroundColor: "default",
          textColor: "default",
          textAlignment: "left",
        },
        content: [
          {
            type: "text",
            text: "First item",
            styles: {},
          },
        ],
        children: [],
      },
      {
        id: "2",
        type: "numberedListItem",
        props: {
          backgroundColor: "default",
          textColor: "default",
          textAlignment: "left",
        },
        content: [
          {
            type: "text",
            text: "Second item",
            styles: {},
          },
        ],
        children: [
          {
            id: "3",
            type: "numberedListItem",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
            },
            content: [
              {
                type: "text",
                text: "Nested item",
                styles: {},
              },
            ],
            children: [],
          },
        ],
      },
    ] as unknown as Block[];
    testConversion("numbered lists", blocks);
  });

  describe("Checklists", () => {
    const blocks: Block[] = [
      {
        id: "1",
        type: "checkListItem",
        props: {
          backgroundColor: "default",
          textColor: "default",
          textAlignment: "left",
          checked: true,
        },
        content: [
          {
            type: "text",
            text: "Completed task",
            styles: {},
          },
        ],
        children: [],
      },
      {
        id: "2",
        type: "checkListItem",
        props: {
          backgroundColor: "default",
          textColor: "default",
          textAlignment: "left",
          checked: false,
        },
        content: [
          {
            type: "text",
            text: "Pending task",
            styles: {},
          },
        ],
        children: [
          {
            id: "3",
            type: "checkListItem",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
              checked: false,
            },
            content: [
              {
                type: "text",
                text: "Subtask",
                styles: {},
              },
            ],
            children: [],
          },
        ],
      },
    ];
    testConversion("checklists", blocks);
  });

  describe("Toggle lists", () => {
    const blocks: Block[] = [
      {
        id: "1",
        type: "toggleListItem",
        props: {
          backgroundColor: "default",
          textColor: "default",
          textAlignment: "left",
        },
        content: [
          {
            type: "text",
            text: "Toggle item",
            styles: {},
          },
        ],
        children: [
          {
            id: "2",
            type: "paragraph",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
            },
            content: [
              {
                type: "text",
                text: "Hidden content",
                styles: {},
              },
            ],
            children: [],
          },
        ],
      },
    ];
    testConversion("toggle lists", blocks);
  });

  describe("Code blocks", () => {
    const blocks: Block[] = [
      {
        id: "1",
        type: "codeBlock",
        props: {
          language: "javascript",
        },
        content: [
          {
            type: "text",
            text: 'console.log("Hello, world!");',
            styles: {},
          },
        ],
        children: [],
      },
      {
        id: "2",
        type: "codeBlock",
        props: {
          language: "typescript",
        },
        content: [
          {
            type: "text",
            text: "const x: number = 42;",
            styles: {},
          },
        ],
        children: [],
      },
    ];
    testConversion("code blocks", blocks);
  });

  describe("Quotes", () => {
    const blocks: Block[] = [
      {
        id: "1",
        type: "quote",
        props: {
          backgroundColor: "default",
          textColor: "default",
        },
        content: [
          {
            type: "text",
            text: "This is a quote",
            styles: {
              italic: true,
            },
          },
        ],
        children: [
          {
            id: "2",
            type: "paragraph",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
            },
            content: [
              {
                type: "text",
                text: "Nested in quote",
                styles: {},
              },
            ],
            children: [],
          },
        ],
      },
    ];
    testConversion("quotes", blocks);
  });

  describe("Headings with different levels", () => {
    const blocks: Block[] = [
      {
        id: "1",
        type: "heading",
        props: {
          backgroundColor: "default",
          textColor: "default",
          textAlignment: "left",
          level: 1,
          isToggleable: false,
        },
        content: [
          {
            type: "text",
            text: "Heading 1",
            styles: {},
          },
        ],
        children: [],
      },
      {
        id: "2",
        type: "heading",
        props: {
          backgroundColor: "default",
          textColor: "default",
          textAlignment: "left",
          level: 2,
          isToggleable: false,
        },
        content: [
          {
            type: "text",
            text: "Heading 2",
            styles: {},
          },
        ],
        children: [],
      },
      {
        id: "3",
        type: "heading",
        props: {
          backgroundColor: "default",
          textColor: "default",
          textAlignment: "left",
          level: 3,
          isToggleable: true,
        },
        content: [
          {
            type: "text",
            text: "Toggle Heading 3",
            styles: {},
          },
        ],
        children: [
          {
            id: "4",
            type: "paragraph",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
            },
            content: [
              {
                type: "text",
                text: "Content under toggle heading",
                styles: {},
              },
            ],
            children: [],
          },
        ],
      },
    ];
    testConversion("headings with different levels", blocks);
  });

  describe("Inline styles and links", () => {
    const blocks: Block[] = [
      {
        id: "1",
        type: "paragraph",
        props: {
          backgroundColor: "default",
          textColor: "default",
          textAlignment: "left",
        },
        content: [
          {
            type: "text",
            text: "Bold ",
            styles: {
              bold: true,
            },
          },
          {
            type: "text",
            text: "italic ",
            styles: {
              italic: true,
            },
          },
          {
            type: "text",
            text: "underline ",
            styles: {
              underline: true,
            },
          },
          {
            type: "text",
            text: "strikethrough ",
            styles: {
              strike: true,
            },
          },
          {
            type: "text",
            text: "code",
            styles: {
              code: true,
            },
          },
        ],
        children: [],
      },
      {
        id: "2",
        type: "paragraph",
        props: {
          backgroundColor: "default",
          textColor: "default",
          textAlignment: "left",
        },
        content: [
          {
            type: "link",
            href: "https://example.com",
            content: [
              {
                type: "text",
                text: "Link text",
                styles: {},
              },
            ],
          },
        ],
        children: [],
      },
    ];
    testConversion("inline styles and links", blocks);
  });

  describe("Tables", () => {
    const blocks = [
      {
        id: "1",
        type: "table",
        props: {
          textColor: "default",
        },
        content: {
          type: "tableContent",
          columnWidths: [100, 100, 100],
          headerRows: 1,
          headerCols: undefined,
          rows: [
            {
              cells: [
                {
                  type: "tableCell",
                  props: {
                    backgroundColor: "default",
                    textColor: "default",
                    textAlignment: "left",
                    colspan: 1,
                    rowspan: 1,
                  },
                  content: [
                    {
                      type: "text",
                      text: "Header 1",
                      styles: {
                        bold: true,
                      },
                    },
                  ],
                },
                {
                  type: "tableCell",
                  props: {
                    backgroundColor: "default",
                    textColor: "default",
                    textAlignment: "left",
                    colspan: 1,
                    rowspan: 1,
                  },
                  content: [
                    {
                      type: "text",
                      text: "Header 2",
                      styles: {
                        bold: true,
                      },
                    },
                  ],
                },
                {
                  type: "tableCell",
                  props: {
                    backgroundColor: "default",
                    textColor: "default",
                    textAlignment: "left",
                    colspan: 1,
                    rowspan: 1,
                  },
                  content: [
                    {
                      type: "text",
                      text: "Header 3",
                      styles: {
                        bold: true,
                      },
                    },
                  ],
                },
              ],
            },
            {
              cells: [
                {
                  type: "tableCell",
                  props: {
                    backgroundColor: "default",
                    textColor: "default",
                    textAlignment: "left",
                    colspan: 1,
                    rowspan: 1,
                  },
                  content: [
                    {
                      type: "text",
                      text: "Cell 1",
                      styles: {},
                    },
                  ],
                },
                {
                  type: "tableCell",
                  props: {
                    backgroundColor: "default",
                    textColor: "default",
                    textAlignment: "left",
                    colspan: 1,
                    rowspan: 1,
                  },
                  content: [
                    {
                      type: "text",
                      text: "Cell 2",
                      styles: {},
                    },
                  ],
                },
                {
                  type: "tableCell",
                  props: {
                    backgroundColor: "default",
                    textColor: "default",
                    textAlignment: "left",
                    colspan: 1,
                    rowspan: 1,
                  },
                  content: [
                    {
                      type: "text",
                      text: "Cell 3",
                      styles: {},
                    },
                  ],
                },
              ],
            },
          ],
        },
        children: [],
      },
    ] as unknown as Block[];
    testConversion("tables", blocks);
  });

  describe("Divider", () => {
    const blocks = [
      {
        id: "1",
        type: "paragraph",
        props: {
          backgroundColor: "default",
          textColor: "default",
          textAlignment: "left",
        },
        content: [
          {
            type: "text",
            text: "Before divider",
            styles: {},
          },
        ],
        children: [],
      },
      {
        id: "2",
        type: "divider",
        props: {},
        content: undefined,
        children: [],
      },
      {
        id: "3",
        type: "paragraph",
        props: {
          backgroundColor: "default",
          textColor: "default",
          textAlignment: "left",
        },
        content: [
          {
            type: "text",
            text: "After divider",
            styles: {},
          },
        ],
        children: [],
      },
    ] as unknown as Block[];
    testConversion("divider", blocks);
  });

  describe("Complex mixed document", () => {
    const blocks: Block[] = [
      {
        id: "1",
        type: "heading",
        props: {
          backgroundColor: "blue",
          textColor: "yellow",
          textAlignment: "center",
          level: 1,
          isToggleable: false,
        },
        content: [
          {
            type: "text",
            text: "Main Title",
            styles: {
              bold: true,
            },
          },
        ],
        children: [],
      },
      {
        id: "2",
        type: "paragraph",
        props: {
          backgroundColor: "red",
          textColor: "default",
          textAlignment: "right",
        },
        content: [
          {
            type: "text",
            text: "This is a paragraph with ",
            styles: {},
          },
          {
            type: "text",
            text: "mixed",
            styles: {
              bold: true,
              italic: true,
            },
          },
          {
            type: "text",
            text: " styles and a ",
            styles: {},
          },
          {
            type: "link",
            href: "https://example.com",
            content: [
              {
                type: "text",
                text: "link",
                styles: {},
              },
            ],
          },
          {
            type: "text",
            text: ".",
            styles: {},
          },
        ],
        children: [
          {
            id: "3",
            type: "bulletListItem",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
            },
            content: [
              {
                type: "text",
                text: "Nested list item",
                styles: {},
              },
            ],
            children: [],
          },
        ],
      },
      {
        id: "4",
        type: "quote",
        props: {
          backgroundColor: "default",
          textColor: "default",
        },
        content: [
          {
            type: "text",
            text: "Important quote",
            styles: {
              italic: true,
            },
          },
        ],
        children: [],
      },
      {
        id: "5",
        type: "codeBlock",
        props: {
          language: "typescript",
        },
        content: [
          {
            type: "text",
            text: "const example = () => {\n  return 'code';\n};",
            styles: {},
          },
        ],
        children: [],
      },
      {
        id: "6",
        type: "checkListItem",
        props: {
          backgroundColor: "default",
          textColor: "default",
          textAlignment: "left",
          checked: true,
        },
        content: [
          {
            type: "text",
            text: "Completed checklist item",
            styles: {},
          },
        ],
        children: [],
      },
      {
        id: "7",
        type: "checkListItem",
        props: {
          backgroundColor: "default",
          textColor: "default",
          textAlignment: "left",
          checked: false,
        },
        content: [
          {
            type: "text",
            text: "Pending checklist item",
            styles: {},
          },
        ],
        children: [],
      },
    ];
    testConversion("complex mixed document", blocks);
  });
});

describe("yNodeToTransaction", () => {
  const editor = BlockNoteEditor.create({
    extensions: [AttributionExtension()],
  });
  const docs: Y.Doc[] = [];

  afterEach(() => {
    docs.splice(0).forEach((doc) => doc.destroy());
  });

  function paragraph(text: string) {
    return _blocksToProsemirrorNode(editor, [
      { id: "paragraph", type: "paragraph", content: text },
    ]);
  }

  function createDiff(before: Node, after: Node, author: string) {
    const baseline = new Y.Doc({ gc: false });
    const target = new Y.Doc({ gc: false });
    docs.push(baseline, target);
    baseline.get("prosemirror").applyDelta(docToDelta(before));
    Y.applyUpdateV2(target, Y.encodeStateAsUpdateV2(baseline));
    const attributions = Y.createContentMap();
    target.on("beforeObserverCalls", (tr) => {
      Y.insertIntoIdMap(
        attributions.inserts,
        Y.createIdMapFromIdSet(tr.insertSet, [
          Y.createContentAttribute("insert", author),
        ]),
      );
      Y.insertIntoIdMap(
        attributions.deletes,
        Y.createIdMapFromIdSet(tr.deleteSet, [
          Y.createContentAttribute("delete", author),
        ]),
      );
    });
    const node = target.get("prosemirror");
    node.applyDelta(docDiffToDelta(before, after));
    const renderer = Y.createDiffRenderer(baseline, target, { attributions });
    return { node, renderer };
  }

  function expectTextAttributions(
    doc: Node,
    expected: {
      plain: string;
      inserted: string;
      deleted: string;
      author: string;
    },
  ) {
    let plain = "";
    let inserted = "";
    let deleted = "";
    doc.descendants((node) => {
      if (!node.isText) {
        return;
      }
      const marks = node.marks.filter((mark) =>
        mark.type.name.startsWith("y-attributed-"),
      );
      if (marks.length === 0) {
        plain += node.text;
      } else {
        expect(marks).toHaveLength(1);
        const mark = marks[0];
        expect(mark.attrs.userIds).toEqual([expected.author]);
        expect(["y-attributed-insert", "y-attributed-delete"]).toContain(
          mark.type.name,
        );
        if (mark.type.name === "y-attributed-insert") {
          inserted += node.text;
        } else {
          deleted += node.text;
        }
      }
    });
    expect({ plain, inserted, deleted }).toEqual({
      plain: expected.plain,
      inserted: expected.inserted,
      deleted: expected.deleted,
    });
    doc.check();
  }

  it("renders insertions and deletions over a normal document without writing to Y", () => {
    const before = paragraph("kept old");
    const { node, renderer } = createDiff(
      before,
      paragraph("kept NEW"),
      "alice",
    );
    const update = Y.encodeStateAsUpdateV2(node.doc!);
    const state = EditorState.create({ doc: before });
    const tr = state.tr;

    expect(yNodeToTransaction(tr, node, { renderer })).toBe(tr);
    expectTextAttributions(state.apply(tr).doc, {
      plain: "kept ",
      inserted: "NEW",
      deleted: "old",
      author: "alice",
    });
    expect(tr.getMeta("y-sync-hydration")?.delta).toBeDefined();
    expect(Y.encodeStateAsUpdateV2(node.doc!)).toEqual(update);
    expect(state.doc.eq(before)).toBe(true);
  });

  it("replaces an attributed preview without retaining its content or marks", () => {
    const before = paragraph("kept old");
    const first = createDiff(before, paragraph("kept NEW"), "alice");
    const second = createDiff(before, paragraph("kept XYZ"), "bob");
    const initial = EditorState.create({ doc: before });
    const preview = initial.apply(
      yNodeToTransaction(initial.tr, first.node, first),
    );
    const tr = yNodeToTransaction(preview.tr, second.node, second);

    expectTextAttributions(preview.apply(tr).doc, {
      plain: "kept ",
      inserted: "XYZ",
      deleted: "old",
      author: "bob",
    });
    const fresh = yNodeToTransaction(initial.tr, second.node, second);
    expect(tr.doc.eq(fresh.doc)).toBe(true);
    expect(tr.doc.textContent).not.toContain("NEW");
    const next = preview.apply(tr);
    expect(yNodeToTransaction(next.tr, second.node, second).steps).toHaveLength(
      0,
    );
  });

  it("updates attribution when the rendered text is unchanged", () => {
    const before = paragraph("kept old");
    const after = paragraph("kept NEW");
    const first = createDiff(before, after, "alice");
    const second = createDiff(before, after, "bob");
    const initial = EditorState.create({ doc: before });
    const preview = initial.apply(
      yNodeToTransaction(initial.tr, first.node, first),
    );
    const tr = yNodeToTransaction(preview.tr, second.node, second);

    expect(tr.doc.textContent).toBe(preview.doc.textContent);
    expect(tr.docChanged).toBe(true);
    expectTextAttributions(preview.apply(tr).doc, {
      plain: "kept ",
      inserted: "NEW",
      deleted: "old",
      author: "bob",
    });
  });

  it("removes attribution for a plain render and is a no-op when rendered again", () => {
    const before = paragraph("kept old");
    const after = paragraph("kept NEW");
    const diff = createDiff(before, after, "alice");
    const initial = EditorState.create({ doc: before });
    const preview = initial.apply(
      yNodeToTransaction(initial.tr, diff.node, diff),
    );
    const tr = yNodeToTransaction(preview.tr, diff.node);

    expect(tr.doc.eq(after)).toBe(true);
    const restored = preview.apply(tr);
    expect(yNodeToTransaction(restored.tr, diff.node).steps).toHaveLength(0);
  });

  it("diffs from the transaction's current document and preserves existing steps and metadata", () => {
    const before = paragraph("kept old");
    const diff = createDiff(before, paragraph("kept NEW"), "alice");
    const state = EditorState.create({ doc: before });
    const tr = state.tr.insertText("temporary", 3).setMeta("caller", "preview");
    const firstStep = tr.steps[0];

    yNodeToTransaction(tr, diff.node, diff);

    expect(tr.steps[0]).toBe(firstStep);
    expect(tr.getMeta("caller")).toBe("preview");
    expectTextAttributions(state.apply(tr).doc, {
      plain: "kept ",
      inserted: "NEW",
      deleted: "old",
      author: "alice",
    });
  });

  it("switches attribution on replaced blocks while preserving their formatting", () => {
    const before = paragraph("kept old");
    const after = _blocksToProsemirrorNode(editor, [
      {
        id: "paragraph",
        type: "heading",
        props: { level: 2 },
        content: [{ type: "text", text: "NEW", styles: { bold: true } }],
      },
    ]);
    const first = createDiff(before, after, "alice");
    const second = createDiff(before, after, "bob");
    const state = EditorState.create({ doc: before });
    const preview = state.apply(
      yNodeToTransaction(state.tr, first.node, first),
    );
    const tr = yNodeToTransaction(preview.tr, second.node, second);

    tr.doc.check();
    const group = tr.doc.firstChild!;
    expect(group.childCount).toBe(2);
    const deleted = group.child(0);
    const inserted = group.child(1);
    expect(deleted.firstChild!.type.name).toBe("paragraph");
    expect(
      deleted.marks
        .filter((mark) => mark.type.name === "y-attributed-delete")
        .map((mark) => mark.toJSON()),
    ).toEqual([{ type: "y-attributed-delete", attrs: { userIds: ["bob"] } }]);
    expect(
      inserted.marks
        .filter((mark) => mark.type.name === "y-attributed-insert")
        .map((mark) => mark.toJSON()),
    ).toEqual([{ type: "y-attributed-insert", attrs: { userIds: ["bob"] } }]);
    const heading = inserted.firstChild!;
    expect(heading.type.name).toBe("heading");
    expect(heading.attrs.level).toBe(2);
    expect(heading.firstChild!.marks.map((mark) => mark.type.name)).toContain(
      "bold",
    );
    expect(heading.textContent).toBe("NEW");
    expect(
      tr.doc.eq(yNodeToTransaction(state.tr, second.node, second).doc),
    ).toBe(true);
  });
});
