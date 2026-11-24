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

  it("gives an error for a prop value that the schema does not have, and does not change the document", () => {
    const editor = createEditor([
      {
        id: "p",
        type: "paragraph",
        props: { textAlignment: "center" },
        content: "Text",
      },
    ]);
    const html = getDocumentText(editor, htmlFormat);
    expect(html).toContain('data-text-alignment="center"');
    const before = editor.document;

    expect(
      updateDocument(editor, {
        format: htmlFormat,
        text: html.replace(
          'data-text-alignment="center"',
          'data-text-alignment="diagonal"',
        ),
      }),
    ).toEqual({ error: "invalid-document" });
    expect(editor.document).toEqual(before);
  });
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
        format: htmlFormat,
        text,
      }),
    );

    expect(
      valid(
        computeOperations(editor, {
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
        format: htmlFormat,
        text,
      }),
    );

    expect(
      valid(
        computeOperations(editor, {
          format: htmlFormat,
          text,
        }),
      ).operations,
    ).toEqual([]);
  });
});

/** The props of a block of the editor, as a record (the props of all block types). */
function propsOf(
  editor: { getBlock: (id: string) => { props: object } | undefined },
  id: string,
): Record<string, unknown> {
  return (editor.getBlock(id)?.props ?? {}) as Record<string, unknown>;
}

describe("HTML, props that the client removes", () => {
  // HTML shows a color and an alignment two times: as a data attribute and
  // in the style. The parse reads the attribute, else the style.
  function edited(
    props: Record<string, string>,
    edit: (text: string) => string,
  ) {
    const editor = createEditor([
      { id: "p", type: "paragraph", props, content: "Hello" },
    ]);
    writeText(editor, htmlFormat, edit);
    return propsOf(editor, "p");
  }

  it("gives the default color if the client removes the attribute and the style", () => {
    expect(
      edited({ textColor: "red" }, (text) =>
        text
          .replace(' data-text-color="red"', "")
          .replace(/color: [^;"]+;? ?/, ""),
      ).textColor,
    ).toBe("default");
  });

  // Before the fix in core, the color was the CSS value "rgb(224, 62, 62)",
  // which the editor does not show.
  it("keeps the color of the style if the client removes only the data attribute", () => {
    expect(
      edited({ textColor: "red" }, (text) =>
        text.replace(' data-text-color="red"', ""),
      ).textColor,
    ).toBe("red");
  });

  it("keeps the alignment of the style if the client removes only the data attribute (the HTML still shows it)", () => {
    expect(
      edited({ textAlignment: "center" }, (text) =>
        text.replace(' data-text-alignment="center"', ""),
      ).textAlignment,
    ).toBe("center");
  });

  it("gives the default alignment if the client removes the attribute and the style", () => {
    expect(
      edited({ textAlignment: "center" }, (text) =>
        text
          .replace(' data-text-alignment="center"', "")
          .replace(/text-align: center;? ?/, ""),
      ).textAlignment,
    ).toBe("left");
  });

  it("removes the preview width of an image if the client removes the width", () => {
    const editor = createEditor([
      {
        id: "i",
        type: "image",
        props: { url: "https://example.com/x.png", previewWidth: 200 },
      },
    ]);
    writeText(editor, htmlFormat, (text) =>
      text.replace(/ (data-preview-width|width)="200"/g, ""),
    );
    expect(propsOf(editor, "i").previewWidth).toBeUndefined();
  });
});

describe("HTML, links", () => {
  const linkedEditor = () =>
    createEditor([
      {
        id: "p",
        type: "paragraph",
        content: [
          "see ",
          { type: "link", href: "https://a.example", content: "docs" },
          " now",
        ],
      },
    ]);

  it("changes the URL of a link", () => {
    const editor = linkedEditor();
    writeText(editor, htmlFormat, (text) =>
      replaceOnce(text, 'href="https://a.example"', 'href="https://b.example"'),
    );
    expect(editor.getBlock("p")?.content).toMatchObject([
      { text: "see " },
      { type: "link", href: "https://b.example", content: [{ text: "docs" }] },
      { text: " now" },
    ]);
  });

  it("removes a link and keeps its text", () => {
    const editor = linkedEditor();
    writeText(editor, htmlFormat, (text) =>
      text.replace(/<a [^>]*>docs<\/a>/, "docs"),
    );
    expect(editor.getBlock("p")?.content).toEqual([
      { type: "text", text: "see docs now", styles: {} },
    ]);
  });
});
