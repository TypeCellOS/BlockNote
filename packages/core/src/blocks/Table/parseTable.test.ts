import { DOMParser } from "prosemirror-model";
import { TableMap } from "prosemirror-tables";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";

describe.each(["td", "th"])("pasting HTML table spans on %s", (tag) => {
  let editor: BlockNoteEditor | undefined;

  afterEach(() => {
    editor?.unmount();
  });

  it.each([
    ["zero rowspan", `<tr><${tag} rowspan="0">a</${tag}></tr>`, ["a"]],
    ["zero colspan", `<tr><${tag} colspan="0">a</${tag}></tr>`, ["a"]],
    [
      "fully spanned empty row",
      `<tr><${tag} rowspan="2">a</${tag}></tr><tr></tr>`,
      ["a"],
    ],
    [
      "rowspan across row groups",
      `<thead><tr><${tag} rowspan="2">a</${tag}></tr></thead><tbody><tr><${tag}>b</${tag}></tr></tbody>`,
      ["a", "b"],
    ],
    [
      "overlapping colspan",
      `<tr><${tag}>a</${tag}><${tag} rowspan="2">b</${tag}></tr><tr><${tag} colspan="2">c</${tag}></tr>`,
      ["a", "b", "c"],
    ],
  ])("pastes %s without losing surrounding paragraphs", (name, rows, texts) => {
    editor = BlockNoteEditor.create();
    editor.mount(document.createElement("div"));

    const problems: unknown[] = [];
    editor.onChange(() => {
      editor!.prosemirrorState.doc.descendants((node) => {
        if (node.type.spec.tableRole === "table") {
          problems.push(TableMap.get(node).problems);
        }
      });
    });
    editor.pasteHTML(`<p>Before</p><table>${rows}</table><p>After</p>`);

    expect(problems.length).toBeGreaterThan(0);
    expect(problems.every((problem) => problem === null)).toBe(true);
    expect(() => editor!.blocksToFullHTML()).not.toThrow();
    const table = editor.document.find((block) => block.type === "table");
    expect(table).toBeDefined();
    const cellTexts = table?.content.rows.flatMap((row) =>
      row.cells.flatMap((cell) => {
        const content = "content" in cell ? cell.content : cell;
        return content.flatMap((inline) =>
          inline.type === "text" ? [inline.text] : [],
        );
      }),
    );
    expect(cellTexts).toEqual(texts);
    if (name === "fully spanned empty row") {
      expect(table?.content.rows.map((row) => row.cells.length)).toEqual([
        1, 0,
      ]);
      expect(table?.content.rows[0].cells[0]).toMatchObject({
        props: { colspan: 1, rowspan: 2 },
      });
    }
    if (name === "rowspan across row groups") {
      expect(table?.content.rows[0].cells[0]).toMatchObject({
        props: { rowspan: 1 },
      });
    }
    if (name === "overlapping colspan") {
      expect(table?.content.rows[1].cells.at(-1)).toMatchObject({
        props: { colspan: 1 },
        content: [{ text: "c" }],
      });
    }
    expect(editor.document).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "paragraph",
          content: [expect.objectContaining({ text: "Before" })],
        }),
        expect.objectContaining({
          type: "paragraph",
          content: [expect.objectContaining({ text: "After" })],
        }),
      ]),
    );

    // Standalone imports use the same repair without touching the live editor.
    const imported = editor.tryParseHTMLToBlocks(`<table>${rows}</table>`);
    const serialized = editor.blocksToFullHTML(imported);
    expect(editor.tryParseHTMLToBlocks(serialized)).toMatchObject(
      imported.map(({ id: _id, ...block }) => block),
    );
  });

  it.each(["", "<tr></tr>", "<tr></tr><tr></tr>"])(
    "imports a zero-width table %j as one editable cell",
    (rows) => {
      editor = BlockNoteEditor.create();
      const imported = editor.tryParseHTMLToBlocks(`<table>${rows}</table>`);
      expect(imported).toMatchObject([
        {
          type: "table",
          content: {
            rows: [
              { cells: [{ content: [], props: { colspan: 1, rowspan: 1 } }] },
            ],
          },
        },
      ]);
      expect(() => editor!.blocksToFullHTML(imported)).not.toThrow();
    },
  );

  it("keeps cell attributes and inline marks while repairing a collision", () => {
    editor = BlockNoteEditor.create();
    const container = document.createElement("div");
    container.innerHTML = `<table><tr><${tag}>a</${tag}><${tag} rowspan="2">b</${tag}></tr><tr><${tag} colspan="2" colwidth="120,160"><strong>c</strong></${tag}></tr></table>`;
    const imported = editor.tryParseHTMLToBlocks(container.innerHTML);
    container.innerHTML = editor.blocksToFullHTML(imported);
    const parsed = DOMParser.fromSchema(editor.pmSchema).parse(container);
    parsed.check();
    const cells: {
      colspan: number;
      colwidth: number[];
      marks: string[];
      type: string;
    }[] = [];
    parsed.descendants((node) => {
      if (node.type.spec.tableRole === "table") {
        expect(TableMap.get(node).problems).toBeNull();
      }
      if (
        node.type.spec.tableRole === "cell" ||
        node.type.spec.tableRole === "header_cell"
      ) {
        if (node.textContent === "c") {
          cells.push({
            colspan: node.attrs.colspan,
            colwidth: node.attrs.colwidth,
            marks: node.firstChild!.firstChild!.marks.map(
              (mark) => mark.type.name,
            ),
            type: node.type.name,
          });
        }
      }
    });
    expect(cells).toEqual([
      {
        colspan: 1,
        colwidth: [120],
        marks: ["bold"],
        type: tag === "th" ? "tableHeader" : "tableCell",
      },
    ]);
  });

  it.each([
    `<table style="font-weight: bold"><tr><${tag}>a</${tag}></tr></table>`,
    `<div style="font-weight: bold"><table><tr><${tag}>a</${tag}></tr></table></div>`,
  ])("preserves inherited formatting for %s", (html) => {
    editor = BlockNoteEditor.create();
    editor.mount(document.createElement("div"));
    const imported = editor.tryParseHTMLToBlocks(html);
    expect(imported[0]).toMatchObject({
      type: "table",
      content: {
        rows: [
          { cells: [{ content: [{ text: "a", styles: { bold: true } }] }] },
        ],
      },
    });
    editor.pasteHTML(html);
    expect(editor.document[0]).toMatchObject({
      type: "table",
      content: {
        rows: [
          { cells: [{ content: [{ text: "a", styles: { bold: true } }] }] },
        ],
      },
    });
  });

  it("preserves a covered row followed by a populated row", () => {
    editor = BlockNoteEditor.create();
    const html = `<table><tr><${tag} rowspan="2">a</${tag}></tr><tr></tr><tr><${tag}>b</${tag}></tr></table>`;
    const imported = editor.tryParseHTMLToBlocks(html);
    const table = imported.find((block) => block.type === "table")!;
    expect(table.content.rows.map((row) => row.cells.length)).toEqual([
      1, 0, 1,
    ]);
    expect(
      editor.tryParseHTMLToBlocks(editor.blocksToFullHTML(imported)),
    ).toMatchObject(imported.map(({ id: _id, ...block }) => block));
    const container = document.createElement("div");
    container.innerHTML = editor.blocksToFullHTML(imported);
    DOMParser.fromSchema(editor.pmSchema).parse(container).check();
  });

  it("repairs multiple tables without changing their order or surrounding text", () => {
    editor = BlockNoteEditor.create();
    const imported = editor.tryParseHTMLToBlocks(
      `<p>Before</p><table></table><table><tr><${tag}>a</${tag}><${tag} rowspan="2">b</${tag}></tr><tr><${tag} colspan="2">c</${tag}></tr></table><table></table><p>After</p>`,
    );
    expect(imported).toMatchObject([
      { type: "paragraph", content: [{ text: "Before" }] },
      { type: "table", content: { rows: [{ cells: [{ content: [] }] }] } },
      { type: "table" },
      { type: "table", content: { rows: [{ cells: [{ content: [] }] }] } },
      { type: "paragraph", content: [{ text: "After" }] },
    ]);
    const tables = imported.filter((block) => block.type === "table");
    expect(
      tables.flatMap((table) =>
        table.content.rows.flatMap((row) =>
          row.cells.flatMap((cell) => {
            const content = "content" in cell ? cell.content : cell;
            return content.flatMap((inline) =>
              inline.type === "text" ? [inline.text] : [],
            );
          }),
        ),
      ),
    ).toEqual(["a", "b", "c"]);
    const container = document.createElement("div");
    container.innerHTML = editor.blocksToFullHTML(imported);
    const parsed = DOMParser.fromSchema(editor.pmSchema).parse(container);
    parsed.check();
    const problems: unknown[] = [];
    parsed.descendants((node) => {
      if (node.type.spec.tableRole === "table") {
        problems.push(TableMap.get(node).problems);
      }
    });
    expect(problems).toEqual([null, null, null]);
  });

  it("preserves text around a nested malformed table", () => {
    editor = BlockNoteEditor.create();
    const imported = editor.tryParseHTMLToBlocks(
      `<table><tr><${tag}>Before<table><tr><td>a</td><td rowspan="2">b</td></tr><tr><td colspan="2">c</td></tr></table>After</${tag}></tr></table>`,
    );
    expect(imported[0]).toMatchObject({
      type: "table",
      content: {
        rows: [{ cells: [{ content: [{ text: "BeforeabcAfter" }] }] }],
      },
    });
    expect(() => editor!.blocksToFullHTML(imported)).not.toThrow();
  });

  it.each([
    "0",
    "1.5",
    "-1",
    "",
    "invalid",
    "NaN",
    "Infinity",
    "2e0",
    "0x2",
    " 2",
    "2 ",
  ])("defaults invalid span %j to 1", (span) => {
    editor = BlockNoteEditor.create();
    editor.mount(document.createElement("div"));
    editor.pasteHTML(
      `<table><tr><${tag} colspan="${span}" rowspan="${span}">First</${tag}></tr><tr><${tag}>Second</${tag}></tr></table>`,
    );

    const table = editor.document.find((block) => block.type === "table");
    expect(table?.content.rows[0].cells[0]).toMatchObject({
      props: { colspan: 1, rowspan: 1 },
      content: [{ type: "text", text: "First" }],
    });
  });

  it.each([
    ["0", 1],
    ["9007199254740992", 1],
    ["1001", 1000],
    ["4294967296", 1000],
  ])("parses numeric colspan %j as %j", (span, expected) => {
    editor = BlockNoteEditor.create();
    const container = document.createElement("div");
    container.innerHTML = `<table><tr><${tag} colspan="${span}">Cell</${tag}></tr></table>`;
    const colspans: number[] = [];
    DOMParser.fromSchema(editor.pmSchema)
      .parse(container)
      .descendants((node) => {
        if (
          node.type.name === "tableCell" ||
          node.type.name === "tableHeader"
        ) {
          colspans.push(node.attrs.colspan);
        }
      });
    expect(colspans).toEqual([expected]);
  });

  it.each(["100", "00100"])(
    "clamps rowspan %j to the remaining table height",
    (span) => {
      editor = BlockNoteEditor.create();
      editor.mount(document.createElement("div"));

      editor.pasteHTML(
        `<table><thead><tr><${tag}>First</${tag}><${tag}>Other</${tag}></tr></thead><tbody><tr><${tag} rowspan="${span}">Merged</${tag}><${tag}>Middle</${tag}></tr><tr><${tag} rowspan="${span}">Last</${tag}></tr></tbody></table>`,
      );

      const table = editor.document.find((block) => block.type === "table");
      expect(table?.content.rows).toHaveLength(3);
      expect(table?.content.rows[1].cells[0]).toMatchObject({
        props: { rowspan: 2 },
        content: [{ type: "text", text: "Merged" }],
      });
      expect(table?.content.rows[2].cells).toHaveLength(1);
      expect(table?.content.rows[2].cells[0]).toMatchObject({
        props: { rowspan: 1 },
        content: [{ type: "text", text: "Last" }],
      });
    },
  );

  it("clamps a rowspan in a single-row table", () => {
    editor = BlockNoteEditor.create();
    editor.mount(document.createElement("div"));

    editor.pasteHTML(
      `<table><tr><${tag} rowspan="100">Only</${tag}></tr></table>`,
    );

    const table = editor.document.find((block) => block.type === "table");
    expect(table?.content.rows).toHaveLength(1);
    expect(table?.content.rows[0].cells[0]).toMatchObject({
      props: { rowspan: 1 },
      content: [{ type: "text", text: "Only" }],
    });
  });

  it("does not count nested table rows toward the remaining height", () => {
    editor = BlockNoteEditor.create();
    editor.mount(document.createElement("div"));

    editor.pasteHTML(
      `<table><tr><${tag} rowspan="100">Outer<table><tr><td>Nested</td></tr><tr><td>Nested</td></tr></table></${tag}></tr></table>`,
    );

    const table = editor.document.find((block) => block.type === "table");
    expect(table?.content.rows).toHaveLength(1);
    expect(table?.content.rows[0].cells[0]).toMatchObject({
      props: { rowspan: 1 },
    });
  });

  it("uses the current table height when reparsing edited DOM", () => {
    editor = BlockNoteEditor.create();
    const container = document.createElement("div");
    container.innerHTML = `<table><tr><${tag} rowspan="100">Merged</${tag}><${tag} rowspan="1">Top</${tag}></tr><tr><${tag} rowspan="1">Bottom</${tag}></tr></table>`;
    const table = container.querySelector("table")!;
    const parser = DOMParser.fromSchema(editor.pmSchema);

    function parseRowspans() {
      const rowspans: number[] = [];
      parser.parse(container).descendants((node) => {
        if (
          node.type.name === "tableCell" ||
          node.type.name === "tableHeader"
        ) {
          rowspans.push(node.attrs.rowspan);
        }
      });
      return rowspans;
    }

    expect(parseRowspans()).toEqual([2, 1, 1]);

    table
      .querySelector("tbody")!
      .insertAdjacentHTML(
        "beforeend",
        `<tr><${tag} rowspan="1">Added</${tag}></tr>`,
      );
    expect(parseRowspans()).toEqual([3, 1, 1, 1]);
  });

  it.each(["2", "002"])(
    "preserves merged cells with span %j and their content",
    (span) => {
      editor = BlockNoteEditor.create();
      editor.mount(document.createElement("div"));

      editor.pasteHTML(
        `<table><tr><${tag} colspan="${span}" rowspan="${span}">Merged</${tag}><${tag}>Top</${tag}></tr><tr><${tag}>Bottom</${tag}></tr></table>`,
      );

      const table = editor.document.find((block) => block.type === "table");
      expect(table?.content.rows).toHaveLength(2);
      expect(table?.content.rows[0].cells[0]).toMatchObject({
        props: { colspan: 2, rowspan: 2 },
        content: [{ type: "text", text: "Merged" }],
      });
      expect(table?.content.rows[1].cells).toHaveLength(1);
      expect(table?.content.rows[1].cells[0]).toMatchObject({
        content: [{ type: "text", text: "Bottom" }],
      });
    },
  );
});
