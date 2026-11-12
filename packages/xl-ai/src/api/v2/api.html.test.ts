import { describe, expect, it } from "vite-plus/test";

import {
  computeOperations,
  getDocumentText,
  htmlFormat,
  updateDocument,
} from "./index.js";
import { createEditor, replaceOnce, writeText } from "./testUtil/fixtures.js";
import { valid } from "./testUtil/valid.js";

describe("HTML", () => {
  it("changes a prop that HTML shows", () => {
    const editor = createEditor([
      {
        id: "p",
        type: "paragraph",
        props: { textColor: "red" },
        content: "Hello",
      },
    ]);
    // The HTML of the same paragraph in blue. The export writes a color in
    // the style and in a data attribute; the client changes both.
    const blue = getDocumentText(
      createEditor([
        {
          id: "p",
          type: "paragraph",
          props: { textColor: "blue" },
          content: "Hello",
        },
      ]),
      htmlFormat,
    );
    writeText(editor, htmlFormat, () => blue);

    expect(editor.getBlock("p")?.props).toMatchObject({ textColor: "blue" });
  });

  it("changes a style that HTML shows, and keeps the other text", () => {
    const editor = createEditor([
      { id: "p", type: "paragraph", content: "Hello world" },
    ]);
    writeText(editor, htmlFormat, (html) =>
      replaceOnce(html, "world", "<u>world</u>"),
    );

    expect(editor.getBlock("p")?.content).toEqual([
      { type: "text", text: "Hello ", styles: {} },
      { type: "text", text: "world", styles: { underline: true } },
    ]);
  });

  it("keeps a toggle and its child when the text of the toggle changes", () => {
    const editor = createEditor([
      {
        id: "toggle",
        type: "toggleListItem",
        content: "Toggle",
        children: [{ id: "child", type: "paragraph", content: "Child" }],
      },
    ]);
    writeText(editor, htmlFormat, (html) =>
      replaceOnce(html, ">Toggle<", ">Toggle, edited<"),
    );

    const toggle = editor.getBlock("toggle");
    expect(toggle?.type).toBe("toggleListItem");
    expect(toggle?.children.map((child) => child.id)).toEqual(["child"]);
  });

  it.each([
    [
      "a row span beyond the table",
      'rowspan="1"><p>c</p>',
      'rowspan="3"><p>c</p>',
    ],
    [
      "a row span that covers a cell",
      'rowspan="1"><p>A</p>',
      'rowspan="2"><p>A</p>',
    ],
    [
      "a column span of 0",
      'colspan="1" rowspan="1"><p>c</p>',
      'colspan="0" rowspan="1"><p>c</p>',
    ],
  ])(
    "gives an error for a table with %s, and does not change the document",
    (_, from, to) => {
      const editor = createEditor([
        {
          id: "t",
          type: "table",
          content: {
            type: "tableContent",
            rows: [{ cells: ["A", "B"] }, { cells: ["c", "d"] }],
          },
        },
      ]);
      const html = getDocumentText(editor, htmlFormat);
      expect(html).toContain(from);
      const before = editor.document;

      expect(
        updateDocument(editor, {
          base: "current",
          format: htmlFormat,
          text: html.replace(from, to),
        }),
      ).toEqual({ error: "invalid-document" });
      expect(editor.document).toEqual(before);
    },
  );
});

describe("HTML, a change of the type of a parent", () => {
  it("gives no operations for a second write of the same text, after a toggle becomes a bullet", () => {
    const editor = createEditor([
      {
        type: "toggleListItem",
        content: "Alpha",
        children: [
          {
            type: "heading",
            content: "Gamma",
            children: [{ type: "numberedListItem", content: "Zeta" }],
          },
        ],
      },
    ]);
    const text = getDocumentText(editor, htmlFormat)
      .replace('<details open=""><summary>', "")
      .replace("</summary>", "")
      .replace("</details>", "");

    valid(
      updateDocument(editor, {
        base: "current",
        format: htmlFormat,
        text,
      }),
    );

    expect(
      valid(
        computeOperations(editor, {
          base: "current",
          format: htmlFormat,
          text,
        }),
      ).operations,
    ).toEqual([]);
  });
});

describe("HTML, a parse in a form that the document does not store", () => {
  it("gives no operations for a second write of the same text", () => {
    const editor = createEditor([{ id: "p", type: "paragraph", content: "x" }]);
    // The quote joins its paragraphs with hard breaks. The parse gives
    // "note\n" (italic) and "\nipsum". The document stores "note\n\n"
    // (italic) and "ipsum".
    const text =
      "<blockquote><p><em>note</em></p><p>￼</p><p>ipsum</p></blockquote>";

    valid(
      updateDocument(editor, {
        base: "current",
        format: htmlFormat,
        text,
      }),
    );

    expect(
      valid(
        computeOperations(editor, {
          base: "current",
          format: htmlFormat,
          text,
        }),
      ).operations,
    ).toEqual([]);
  });
});
