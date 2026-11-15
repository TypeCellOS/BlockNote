import { DOMParser } from "prosemirror-model";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";

describe("importing HTML tables", () => {
  let editor: BlockNoteEditor;

  afterEach(() => {
    editor?.unmount();
  });

  // The five malformed tables reported in #3289 must not discard the paste.
  describe.each(["td", "th"])("pasting spans on %s", (tag) => {
    it.each([
      ["zero rowspan", `<tr><${tag} rowspan="0">a</${tag}></tr>`, ["a"]],
      ["zero colspan", `<tr><${tag} colspan="0">a</${tag}></tr>`, ["a"]],
      [
        "fully covered row",
        `<tr><${tag} rowspan="2">a</${tag}></tr><tr></tr>`,
        ["a"],
      ],
      [
        "rowspan crossing row groups",
        `<thead><tr><${tag} rowspan="2">a</${tag}></tr></thead><tbody><tr><td>b</td></tr></tbody>`,
        ["a", "b"],
      ],
      [
        "overlapping colspan",
        `<tr><${tag}>a</${tag}><${tag} rowspan="2">b</${tag}></tr><tr><${tag} colspan="2">c</${tag}></tr>`,
        ["a", "b", "c"],
      ],
    ])(
      "repairs %s and preserves surrounding paragraphs",
      (name, rows, texts) => {
        editor = BlockNoteEditor.create();
        editor.mount(document.createElement("div"));
        const html = `<p>Before</p><table>${rows}</table><p>After</p>`;
        const imported = editor.tryParseHTMLToBlocks(html);
        editor.pasteHTML(html);
        for (const blocks of [imported, editor.document]) {
          expect(blocks.slice(0, 3)).toMatchObject([
            { type: "paragraph", content: [{ text: "Before" }] },
            { type: "table" },
            { type: "paragraph", content: [{ text: "After" }] },
          ]);
          const table = blocks.find((block) => block.type === "table")!;
          expect(
            table.content.rows.flatMap((row) =>
              row.cells.flatMap((cell) => {
                const content = "content" in cell ? cell.content : cell;
                return content.flatMap((inline) =>
                  inline.type === "text" ? [inline.text] : [],
                );
              }),
            ),
          ).toEqual(texts);

          if (name === "fully covered row") {
            expect(table.content.rows.map((row) => row.cells.length)).toEqual([
              1, 0,
            ]);
            expect(table.content.rows[0].cells[0]).toMatchObject({
              props: { rowspan: 2 },
            });
          } else if (name === "overlapping colspan") {
            expect(table.content.rows[1].cells.at(-1)).toMatchObject({
              props: { colspan: 1 },
              content: [{ text: "c" }],
            });
          } else {
            expect(table.content.rows[0].cells[0]).toMatchObject({
              props: { rowspan: 1, colspan: 1 },
            });
          }
        }
      },
    );
  });

  it("preserves valid merged cells, including a covered row before more content", () => {
    editor = BlockNoteEditor.create();
    const imported = editor.tryParseHTMLToBlocks(`
      <table>
        <tr><td colspan="002" rowspan="2" colwidth="120,160"><strong>Merged</strong></td></tr>
        <tr></tr>
        <tr><td>Left</td><td>Right</td></tr>
      </table>
    `);
    expect(imported).toMatchObject([
      {
        type: "table",
        content: {
          rows: [
            {
              cells: [
                {
                  props: { colspan: 2, rowspan: 2 },
                  content: [{ text: "Merged", styles: { bold: true } }],
                },
              ],
            },
            { cells: [] },
            {
              cells: [
                { content: [{ text: "Left" }] },
                { content: [{ text: "Right" }] },
              ],
            },
          ],
        },
      },
    ]);
    expect(
      editor.tryParseHTMLToBlocks(editor.blocksToFullHTML(imported)),
    ).toMatchObject(imported.map(({ id: _id, ...block }) => block));
  });

  it("repairs multiple empty and malformed tables without reordering content", () => {
    editor = BlockNoteEditor.create();
    expect(
      editor.tryParseHTMLToBlocks(`
      <p>Before</p>
      <table></table>
      <table><tr><td colspan="0">Middle</td></tr></table>
      <table><tr></tr><tr></tr></table>
      <p>After</p>
    `),
    ).toMatchObject([
      { type: "paragraph", content: [{ text: "Before" }] },
      {
        type: "table",
        content: {
          rows: [
            { cells: [{ content: [], props: { colspan: 1, rowspan: 1 } }] },
          ],
        },
      },
      {
        type: "table",
        content: { rows: [{ cells: [{ content: [{ text: "Middle" }] }] }] },
      },
      {
        type: "table",
        content: {
          rows: [
            { cells: [{ content: [], props: { colspan: 1, rowspan: 1 } }] },
          ],
        },
      },
      { type: "paragraph", content: [{ text: "After" }] },
    ]);
  });

  it("preserves inherited formatting through import and paste", () => {
    editor = BlockNoteEditor.create();
    editor.mount(document.createElement("div"));
    const html = `<div style="font-weight: bold"><table><tr><td>Bold</td></tr></table></div>`;
    const expected = {
      type: "table",
      content: {
        rows: [
          { cells: [{ content: [{ text: "Bold", styles: { bold: true } }] }] },
        ],
      },
    };
    expect(editor.tryParseHTMLToBlocks(html)[0]).toMatchObject(expected);
    editor.pasteHTML(html);
    expect(editor.document[0]).toMatchObject(expected);
  });

  it("preserves cell formatting and column widths when shrinking an overlap", () => {
    editor = BlockNoteEditor.create();
    const imported = editor.tryParseHTMLToBlocks(`
      <table>
        <tr><td>a</td><td rowspan="2">b</td></tr>
        <tr><td colspan="2" colwidth="120,160"><strong>c</strong></td></tr>
      </table>
    `);
    const container = document.createElement("div");
    container.innerHTML = editor.blocksToFullHTML(imported);
    const cell = Array.from(container.querySelectorAll("td")).find(
      (cell) => cell.textContent === "c",
    )!;
    expect(cell.getAttribute("colspan")).toBe("1");
    expect(cell.getAttribute("colwidth")).toBe("120");
    expect(cell.querySelector("strong")?.textContent).toBe("c");
  });

  it.each(["-1", "1.5", "", "invalid", "Infinity", "2e0", "0x2", " 2"])(
    "defaults invalid span %j to one",
    (span) => {
      editor = BlockNoteEditor.create();
      expect(
        editor.tryParseHTMLToBlocks(`
        <table><tr><td colspan="${span}" rowspan="${span}">First</td><td>Other</td></tr><tr><td>Second</td><td>Last</td></tr></table>
      `)[0],
      ).toMatchObject({
        content: {
          rows: [
            {
              cells: [
                {
                  props: { colspan: 1, rowspan: 1 },
                  content: [{ text: "First" }],
                },
                {},
              ],
            },
            {
              cells: [
                { content: [{ text: "Second" }] },
                { content: [{ text: "Last" }] },
              ],
            },
          ],
        },
      });
    },
  );

  // Import repair can shrink an oversized colspan again; inspect parsing to
  // distinguish the HTML limit (1000) from integer overflow or invalid input.
  it.each([
    ["9007199254740992", 1],
    ["1001", 1000],
    ["4294967296", 1000],
  ])("sanitizes colspan %s to %s before table repair", (span, expected) => {
    editor = BlockNoteEditor.create();
    const container = document.createElement("div");
    container.innerHTML = `<table><tr><td colspan="${span}">Cell</td></tr></table>`;
    const colspans: number[] = [];
    DOMParser.fromSchema(editor.pmSchema)
      .parse(container)
      .descendants((node) => {
        if (node.type.spec.tableRole === "cell") {
          colspans.push(node.attrs.colspan);
        }
      });
    expect(colspans).toEqual([expected]);
  });

  it("clamps rowspans to the remaining row-group height", () => {
    editor = BlockNoteEditor.create();
    expect(
      editor.tryParseHTMLToBlocks(`
      <table>
        <thead><tr><th>First</th><th>Other</th></tr></thead>
        <tbody>
          <tr><td rowspan="100">Merged</td><td>Middle</td></tr>
          <tr><td rowspan="100">Last</td></tr>
        </tbody>
      </table>
    `)[0],
    ).toMatchObject({
      content: {
        rows: [
          {
            cells: [
              { content: [{ text: "First" }] },
              { content: [{ text: "Other" }] },
            ],
          },
          {
            cells: [
              { props: { rowspan: 2 }, content: [{ text: "Merged" }] },
              { content: [{ text: "Middle" }] },
            ],
          },
          { cells: [{ props: { rowspan: 1 }, content: [{ text: "Last" }] }] },
        ],
      },
    });
  });

  it("does not count nested rows toward the outer rowspan or lose surrounding cell text", () => {
    editor = BlockNoteEditor.create();
    expect(
      editor.tryParseHTMLToBlocks(`
      <table><tr><td rowspan="100">Before<table>
        <tr><td>a</td><td rowspan="2">b</td></tr>
        <tr><td colspan="2">c</td></tr>
      </table>After</td></tr></table>
    `)[0],
    ).toMatchObject({
      content: {
        rows: [
          {
            cells: [
              { props: { rowspan: 1 }, content: [{ text: "BeforeabcAfter" }] },
            ],
          },
        ],
      },
    });
  });

  it.each([
    ["0", [120, 200]],
    ["2", [120, 160, 200]],
  ])(
    "aligns column widths after sanitizing colspan %s",
    (span, columnWidths) => {
      editor = BlockNoteEditor.create();
      expect(
        editor.tryParseHTMLToBlocks(`
        <table><tr><td colspan="${span}" colwidth="120,160">a</td><td colwidth="200">b</td></tr></table>
      `)[0],
      ).toMatchObject({ content: { columnWidths } });
    },
  );

  it.each([
    [
      "rows",
      `<tr><th><strong>A</strong></th><th><strong>B</strong></th></tr><tr><th><em>C</em></th><th>D</th></tr><tr><td>E</td><td>F</td></tr>`,
      { headerRows: 1, headerCols: undefined },
      [
        ["A", "B"],
        ["C", "D"],
        ["E", "F"],
      ],
    ],
    [
      "columns",
      `<tr><th><strong>A</strong></th><th><strong>B</strong></th><td>C</td></tr><tr><th><em>D</em></th><th>E</th><td>F</td></tr>`,
      { headerRows: undefined, headerCols: 1 },
      [
        ["A", "B", "C"],
        ["D", "E", "F"],
      ],
    ],
    [
      "rows and columns",
      `<tr><th><strong>A</strong></th><th><strong>B</strong></th><th>C</th></tr><tr><th><em>D</em></th><th>E</th><th>F</th></tr><tr><th>G</th><th>H</th><td>I</td></tr>`,
      { headerRows: 1, headerCols: 1 },
      [
        ["A", "B", "C"],
        ["D", "E", "F"],
        ["G", "H", "I"],
      ],
    ],
  ])(
    "limits imported header %s to the first without losing content or formatting",
    (_name, rows, headers, texts) => {
      editor = BlockNoteEditor.create();
      editor.mount(document.createElement("div"));
      const html = `<table>${rows}</table>`;
      const imported = editor.tryParseHTMLToBlocks(html);
      expect(imported[0]).toMatchObject({ content: headers });
      expect(imported[0]).toMatchObject({
        content: {
          rows: texts.map((row) => ({
            cells: row.map((text) => ({ content: [{ text }] })),
          })),
        },
      });
      const table = imported.find((block) => block.type === "table")!;
      expect(table.content.rows[0].cells[0]).toMatchObject({
        content: [{ styles: { bold: true } }],
      });
      expect(table.content.rows[0].cells[1]).toMatchObject({
        content: [{ styles: { bold: true } }],
      });
      expect(table.content.rows[1].cells[0]).toMatchObject({
        content: [{ styles: { italic: true } }],
      });
      editor.pasteHTML(html);
      expect(editor.document[0]).toMatchObject({
        content: imported[0].content,
      });
      expect(
        editor.tryParseHTMLToBlocks(editor.blocksToFullHTML(imported))[0],
      ).toMatchObject({ content: { ...headers, rows: table.content.rows } });
    },
  );

  it("does not limit programmatically created table headers", () => {
    editor = BlockNoteEditor.create({
      initialContent: [
        {
          type: "table",
          content: {
            type: "tableContent",
            headerRows: 2,
            headerCols: 2,
            rows: [
              { cells: ["a", "b", "c"] },
              { cells: ["d", "e", "f"] },
              { cells: ["g", "h", "i"] },
            ],
          },
        },
      ],
    });
    expect(editor.document[0]).toMatchObject({
      content: { headerRows: 2, headerCols: 2 },
    });
  });
});
