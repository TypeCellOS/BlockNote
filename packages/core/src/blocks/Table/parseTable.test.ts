import { afterEach, describe, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";

describe.each(["td", "th"])("pasting HTML table spans on %s", (tag) => {
  let editor: BlockNoteEditor | undefined;

  afterEach(() => {
    editor?.unmount();
  });

  it.each(["1.5", "-1", "0", "", "invalid", "NaN", "Infinity", "4294967296"])(
    "normalizes malformed spans %j before serializing pasted HTML",
    (span) => {
      editor = BlockNoteEditor.create();
      editor.mount(document.createElement("div"));

      // A valid first row lets parsing reach the occupancy-grid allocation,
      // matching the WEBSITE-2DM stack trace during pasteHTML.
      editor.pasteHTML(
        `<table><tr><${tag}>First</${tag}></tr><tr><${tag} colspan="${span}" rowspan="${span}">Second</${tag}></tr></table>`,
      );

      const table = editor.document.find((block) => block.type === "table");
      expect(table?.content.rows).toHaveLength(2);
      expect(table?.content.rows[1].cells[0]).toMatchObject({
        props: { colspan: 1, rowspan: 1 },
        content: [{ type: "text", text: "Second" }],
      });
    },
  );

  it.each(["100", "1e2"])(
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

  it("preserves valid merged cells and their content", () => {
    editor = BlockNoteEditor.create();
    editor.mount(document.createElement("div"));

    editor.pasteHTML(
      `<table><tr><${tag} colspan="2" rowspan="2">Merged</${tag}><${tag}>Top</${tag}></tr><tr><${tag}>Bottom</${tag}></tr></table>`,
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
  });
});
