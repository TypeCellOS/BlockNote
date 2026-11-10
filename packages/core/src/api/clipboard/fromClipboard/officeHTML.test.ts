import { afterEach, describe, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import { normalizeOfficeHTML } from "./normalizeOfficeHTML.js";

// DOM parsing tests run in the core package's jsdom environment.
const editors: BlockNoteEditor[] = [];

function createEditor(
  options: Parameters<typeof BlockNoteEditor.create>[0] = {},
) {
  const editor = BlockNoteEditor.create(options);
  editors.push(editor);
  return editor;
}

function parseOfficeHTML(html: string) {
  return createEditor().tryParseHTMLToBlocks(normalizeOfficeHTML(html));
}

afterEach(() => {
  for (const editor of editors.splice(0)) {
    editor._tiptapEditor.destroy();
  }
});

function wordItem(text: string, level = 1, marker = "·", list = "l0") {
  return `<p style="mso-list: ${list} level${level} lfo1"><span style="mso-list:Ignore">${marker}&nbsp;</span>${text}<o:p></o:p></p>`;
}

describe("Office clipboard HTML", () => {
  // Clipboard samples from CKEditor 5's paste-from-office/tests/_data at
  // https://github.com/ckeditor/ckeditor5/tree/e7c72a94f7cc6be9dff5ae0bfb81af3eaa42f62d/packages/ckeditor5-paste-from-office/tests/_data
  // Word captures omit the generated head except for source identification.
  // Keep fragment whitespace intact. Snapshots omit only generated block IDs.
  // Copyright (c) 2003-2026, CKSource Holding sp. z o.o.
  // Upstream license notice (GPL-2.0-or-later or commercial):
  // https://github.com/ckeditor/ckeditor5/blob/e7c72a94f7cc6be9dff5ae0bfb81af3eaa42f62d/packages/ckeditor5/LICENSE.md
  it.each([
    [
      "Word formatting",
      // basic-styles/multiple-styles-multiline/input.word2016.html
      `<meta name=ProgId content=Word.Document>
<!--StartFragment-->

<p class=MsoNormal><span lang=PL style='mso-ansi-language:PL'>Line <b
	style='mso-bidi-font-weight:normal'>bold</b> and <i style='mso-bidi-font-style:
normal'>italics</i><o:p></o:p></span></p>

<p class=MsoNormal><span lang=PL style='mso-ansi-language:PL'>Line <b
	style='mso-bidi-font-weight:normal'><u>foo</u></b><u> bar</u><o:p></o:p></span></p>

<p class=MsoNormal><s>Third</s> line <b style='mso-bidi-font-weight:normal'>styling,
	<i style='mso-bidi-font-style:normal'>space on e</i>nd </b><o:p></o:p></p>

<!--EndFragment-->
`,
    ],
    [
      "Word mixed lists",
      // list/mixed-elements/input.word.html
      `<!--StartFragment-->

<p class=MsoNormal style='margin-left:22.8pt;text-indent:-14.15pt;mso-list:
l0 level1 lfo1;tab-stops:list 22.8pt'><![if !supportLists]><span lang=EN-US
                                                                 style='font-size:10.0pt;mso-bidi-font-size:11.0pt;line-height:107%;font-family:
Symbol;mso-fareast-font-family:Symbol;mso-bidi-font-family:Symbol'><span
        style='mso-list:Ignore'>·<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;&nbsp;&nbsp;
</span></span></span><![endif]><span lang=EN-US style='font-family:"Arial",sans-serif'>One
Asdlkfj alksdfj <o:p></o:p></span></p>

<p class=MsoNormal style='margin-left:22.8pt;text-indent:-14.15pt;mso-list:
l0 level1 lfo1;tab-stops:list 22.8pt'><![if !supportLists]><span lang=EN-US
                                                                 style='font-size:10.0pt;mso-bidi-font-size:11.0pt;line-height:107%;font-family:
Symbol;mso-fareast-font-family:Symbol;mso-bidi-font-family:Symbol'><span
        style='mso-list:Ignore'>·<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;&nbsp;&nbsp;
</span></span></span><![endif]><span lang=EN-US style='font-family:"Arial",sans-serif'>Two
Asdlkfjalksdfj lkasjdf lkasj dflka sdf<o:p></o:p></span></p>

<p class=MsoNormal style='margin-left:23.05pt;text-indent:-14.2pt;mso-list:
l0 level1 lfo1;tab-stops:list 23.05pt'><![if !supportLists]><span lang=EN-US
                                                                  style='font-size:10.0pt;mso-bidi-font-size:11.0pt;line-height:107%;font-family:
Symbol;mso-fareast-font-family:Symbol;mso-bidi-font-family:Symbol'><span
        style='mso-list:Ignore'>·<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;&nbsp;&nbsp;
</span></span></span><![endif]><span lang=EN-US style='font-family:"Arial",sans-serif'>Three
Alskdfj alksdfj lkasj df<o:p></o:p></span></p>

<ul style='margin-top:0cm' type=disc>
    <ul style='margin-top:0cm' type=circle>
        <li class=MsoNormal style='mso-list:l0 level2 lfo1;tab-stops:list 72.0pt'><span
                lang=EN-US style='font-family:"Arial",sans-serif'>Three sub one Asldkfjalksdfj
laksjdf<o:p></o:p></span></li>
        <li class=MsoNormal style='mso-list:l0 level2 lfo1;tab-stops:list 72.0pt'><span
                lang=EN-US style='font-family:"Arial",sans-serif'>Three sub two Alskdfjlaksjfd
lkasd f<o:p></o:p></span></li>
    </ul>
</ul>

<p class=MsoNormal style='margin-left:22.8pt;text-indent:-14.15pt;mso-list:
l0 level1 lfo1;tab-stops:list 22.8pt'><![if !supportLists]><span lang=EN-US
                                                                 style='font-size:10.0pt;mso-bidi-font-size:11.0pt;line-height:107%;font-family:
Symbol;mso-fareast-font-family:Symbol;mso-bidi-font-family:Symbol'><span
        style='mso-list:Ignore'>·<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;&nbsp;&nbsp;
</span></span></span><![endif]><span lang=EN-US style='font-family:"Arial",sans-serif'>Four
Asldkfjalkfdj lkasd<o:p></o:p></span></p>

<p class=MsoNormal style='margin-left:22.8pt;text-indent:-14.15pt;mso-list:
l0 level1 lfo1;tab-stops:list 23.05pt'><![if !supportLists]><span lang=EN-US
                                                                  style='font-size:10.0pt;mso-bidi-font-size:11.0pt;line-height:107%;font-family:
Symbol;mso-fareast-font-family:Symbol;mso-bidi-font-family:Symbol'><span
        style='mso-list:Ignore'>·<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;&nbsp;&nbsp;
</span></span></span><![endif]><span lang=EN-US style='font-family:"Arial",sans-serif'>Five
Alskdfj laksdfjlak jd<o:p></o:p></span></p>

<p class=MsoNormal style='margin-left:22.8pt;text-indent:-14.15pt;mso-list:
l0 level1 lfo1;tab-stops:list 22.8pt'><![if !supportLists]><span lang=EN-US
                                                                 style='font-size:10.0pt;mso-bidi-font-size:11.0pt;line-height:107%;font-family:
Symbol;mso-fareast-font-family:Symbol;mso-bidi-font-family:Symbol'><span
        style='mso-list:Ignore'>·<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;&nbsp;&nbsp;
</span></span></span><![endif]><span lang=EN-US style='font-family:"Arial",sans-serif'>Six
Alskdfj laksjdf lak<o:p></o:p></span></p>

<p class=MsoNormal style='margin-left:58.25pt;text-indent:-14.2pt;mso-list:
l0 level2 lfo1;tab-stops:list 58.25pt'><![if !supportLists]><span lang=EN-US
                                                                  style='font-size:10.0pt;mso-bidi-font-size:11.0pt;line-height:107%;font-family:
"Courier New";mso-fareast-font-family:"Courier New"'><span style='mso-list:
Ignore'>o<span style='font:7.0pt "Times New Roman"'>&nbsp; </span></span></span><![endif]><span
        lang=EN-US style='font-family:"Arial",sans-serif'>Six sub one Alsdkfj <o:p></o:p></span></p>

<p class=MsoNormal style='margin-left:22.8pt;text-indent:-14.15pt;mso-list:
l0 level1 lfo1;tab-stops:list 22.8pt'><![if !supportLists]><span lang=EN-US
                                                                 style='font-size:10.0pt;mso-bidi-font-size:11.0pt;line-height:107%;font-family:
Symbol;mso-fareast-font-family:Symbol;mso-bidi-font-family:Symbol'><span
        style='mso-list:Ignore'>·<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;&nbsp;&nbsp;
</span></span></span><![endif]><span lang=EN-US style='font-family:"Arial",sans-serif'>Seven
asdfasdfadf alksd flaksjdf laksjd alksjdf askljd f</span><span lang=EN-US><o:p></o:p></span></p>

<!--EndFragment-->
`,
    ],
    [
      "Google Docs paragraphs",
      // paste-from-google-docs/br-paragraph/simple-paragraphs/input.html
      `<meta charset='utf-8'><meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-795b8732-7fff-0188-0241-50e6b4f4fe0f"><br /><h1 dir="ltr" style="line-height:1.38;margin-top:10pt;margin-bottom:0pt;"><span style="font-size:16pt;font-family:'Trebuchet MS';color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">A</span></h1><br /><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">B</span></p><br /></b>
`,
    ],
    [
      "Google Docs mixed lists",
      // paste-from-google-docs/lists/mixed-list/input.html
      `<meta charset='utf-8'><meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-6aba46e4-7fff-ffbf-43f7-6080e7ecadb8"><ol style="margin-top:0pt;margin-bottom:0pt;"><li dir="ltr" style="list-style-type:decimal;font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">1</span></p></li><ul style="margin-top:0pt;margin-bottom:0pt;"><li dir="ltr" style="list-style-type:circle;font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">A</span></p></li><ol style="margin-top:0pt;margin-bottom:0pt;"><li dir="ltr" style="list-style-type:lower-roman;font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">1</span></p></li></ol></ul><li dir="ltr" style="list-style-type:decimal;font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">2</span></p></li><li dir="ltr" style="list-style-type:decimal;font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">3</span></p></li><ul style="margin-top:0pt;margin-bottom:0pt;"><li dir="ltr" style="list-style-type:circle;font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">A</span></p></li><li dir="ltr" style="list-style-type:circle;font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">B</span></p></li></ul></ol><ul style="margin-top:0pt;margin-bottom:0pt;"><li dir="ltr" style="list-style-type:disc;font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">A</span></p></li><ol style="margin-top:0pt;margin-bottom:0pt;"><li dir="ltr" style="list-style-type:lower-alpha;font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">1</span></p></li><li dir="ltr" style="list-style-type:lower-alpha;font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">2</span></p></li></ol></ul></b>
`,
    ],
  ])("parses captured clipboard HTML: %s", (_name, html) => {
    const blocks = parseOfficeHTML(html);

    function withoutIds(blocks: ReturnType<typeof parseOfficeHTML>): object[] {
      return blocks.map(({ id: _id, children, ...block }) => ({
        ...block,
        children: withoutIds(children),
      }));
    }

    expect(withoutIds(blocks)).toMatchSnapshot();
  });

  it("reconstructs Word lists, retaining formatting and nesting", () => {
    const blocks = parseOfficeHTML(
      wordItem("<strong>First</strong>").replace(
        'style="mso-list:',
        'style="text-align:center;mso-list:',
      ) +
        wordItem("Nested", 2, "1.") +
        wordItem("Second"),
    );
    expect(blocks).toMatchObject([
      {
        type: "bulletListItem",
        props: { textAlignment: "center" },
        content: [{ text: "First", styles: { bold: true } }],
        children: [
          {
            type: "numberedListItem",
            content: [{ text: "Nested" }],
          },
        ],
      },
      { type: "bulletListItem", content: [{ text: "Second" }], children: [] },
    ]);
    expect(blocks).toHaveLength(2);
  });

  it("separates Word lists across paragraphs, list IDs and marker types", () => {
    const blocks = parseOfficeHTML(
      wordItem("One", 1, "4.") +
        "<p>Between</p>" +
        wordItem("Two", 1, "7.") +
        wordItem("Bullet") +
        wordItem("New list", 1, "2.", "l1") +
        wordItem("Another list", 2, "1.", "l2"),
    );
    expect(blocks.map((block) => block.type)).toEqual([
      "numberedListItem",
      "paragraph",
      "numberedListItem",
      "bulletListItem",
      "numberedListItem",
      "numberedListItem",
    ]);
    expect(blocks).toHaveLength(6);
    expect(blocks[4].children).toEqual([]);
  });

  it("removes Word paragraph-end placeholders without removing empty paragraphs", () => {
    const blocks = parseOfficeHTML(
      '<meta name="ProgId" content="Word.Document"><p>Text<o:p>&nbsp;</o:p></p><p><span lang="en"><o:p>&nbsp;</o:p></span></p>',
    );
    expect(blocks).toMatchObject([
      { type: "paragraph", content: [{ text: "Text" }] },
      { type: "paragraph", content: [] },
    ]);
    expect(blocks).toHaveLength(2);
  });

  it("parses nested numbered lists", () => {
    const blocks = parseOfficeHTML(
      wordItem("Parent", 1, "1.") +
        wordItem("Child", 2, "1.") +
        wordItem("Next", 1, "2."),
    );
    expect(blocks).toMatchObject([
      {
        type: "numberedListItem",
        content: [{ text: "Parent" }],
        children: [{ type: "numberedListItem", content: [{ text: "Child" }] }],
      },
      { type: "numberedListItem", content: [{ text: "Next" }] },
    ]);
    expect(blocks).toHaveLength(2);
  });

  it("recognizes parenthesized numbers and retains unsupported Word labels", () => {
    const blocks = parseOfficeHTML(
      wordItem("Number", 1, "(3)") +
        wordItem("Multilevel", 1, "1.2.") +
        wordItem("Unknown", 1, "Section A:") +
        wordItem("Roman", 1, "iv.") +
        wordItem("Letter", 1, "c."),
    );
    expect(blocks).toMatchObject([
      {
        type: "numberedListItem",
        content: [{ text: "Number" }],
      },
      { type: "paragraph", content: [{ text: "1.2.\u00a0Multilevel" }] },
      { type: "paragraph", content: [{ text: "Section A:\u00a0Unknown" }] },
      { type: "paragraph", content: [{ text: "iv.\u00a0Roman" }] },
      { type: "paragraph", content: [{ text: "c.\u00a0Letter" }] },
    ]);
  });

  it("does not move intervening text into a Word list", () => {
    const blocks = parseOfficeHTML(
      wordItem("First") + "Between" + wordItem("Second"),
    );
    expect(blocks).toMatchObject([
      { type: "bulletListItem", content: [{ text: "First" }] },
      { type: "paragraph", content: [{ text: "Between" }] },
      { type: "bulletListItem", content: [{ text: "Second" }] },
    ]);
    expect(blocks).toHaveLength(3);
  });

  it("preserves Google Docs blank paragraphs but leaves inline breaks alone", () => {
    const blocks = parseOfficeHTML(
      '<b id="docs-internal-guid-test" style="font-weight:normal"><p>First<br>line</p>\n<!-- gap --><br>\n<br><!-- gap -->\n<p>Last</p></b>',
    );
    expect(blocks).toMatchObject([
      { type: "paragraph", content: [{ text: "First\nline", styles: {} }] },
      { type: "paragraph", content: [] },
      { type: "paragraph", content: [] },
      { type: "paragraph", content: [{ text: "Last", styles: {} }] },
    ]);
    expect(blocks).toHaveLength(4);
  });

  it("leaves programmatic HTML imports unchanged", () => {
    const blocks = createEditor().tryParseHTMLToBlocks(wordItem("Unchanged"));
    expect(blocks).toMatchObject([
      { type: "paragraph", content: [{ text: "·\u00a0Unchanged" }] },
    ]);
  });

  it.each([
    ["First<br>Last", "First\nLast"],
    ["First<br><br><br>Last", "First\n\n\nLast"],
    ["<span>First</span><br><span>Last</span>", "First\nLast"],
    ["First \n<br>\n Last", "First \nLast"],
  ])(
    "keeps hard breaks in Google Docs inline fragments: %s",
    (fragment, text) => {
      const blocks = parseOfficeHTML(
        `<b id="docs-internal-guid-test" style="font-weight:normal">${fragment}</b>`,
      );
      expect(blocks).toHaveLength(1);
      expect(blocks[0]).toMatchObject({
        type: "paragraph",
        content: [{ text }],
      });
    },
  );

  it("leaves unrelated HTML unchanged", () => {
    const html = "<div><p>Original</p><br><p>Last</p></div>";
    expect(normalizeOfficeHTML(html)).toBe(html);
  });
});

function normalizedDOM(html: string) {
  const root = document.createElement("div");
  root.innerHTML = normalizeOfficeHTML(html);
  return root;
}

function paragraph(text: string, level = 1, list = "l0", lfo = 1) {
  return `<p style="mso-list:${list} level${level} lfo${lfo}"><span style="mso-list:Ignore">·&nbsp;</span>${text}</p>`;
}

function nativeItem(text: string, level = 2, list = "l0", lfo = 1) {
  return `<li style="mso-list:${list} level${level} lfo${lfo}">${text}</li>`;
}

function expectedItem(
  text: string,
  children: object[] = [],
  type = "bulletListItem",
) {
  return { type, content: [{ text }], children };
}

describe("Word clipboard list transitions", () => {
  // Reduced from the captured list/mixed-elements/input.word.html sample above:
  // a level-one paragraph followed by <ul><ul> whose li elements explicitly
  // identify the same list and level two.
  it("attaches wrapped native subitems to the preceding paragraph item", () => {
    const blocks = parseOfficeHTML(
      paragraph("One") +
        paragraph("Three") +
        `<ul>\n<!-- Word wrapper --><ul>${nativeItem("Three sub one")}${nativeItem("Three sub two")}</ul>\n</ul>` +
        paragraph("Four"),
    );
    expect(blocks).toHaveLength(3);
    expect(blocks).toMatchObject([
      expectedItem("One"),
      expectedItem("Three", [
        expectedItem("Three sub one"),
        expectedItem("Three sub two"),
      ]),
      expectedItem("Four"),
    ]);
  });

  it("continues native siblings and lets later paragraphs nest under the last one", () => {
    const blocks = parseOfficeHTML(
      paragraph("First") +
        `<ul>${nativeItem("Second", 1)}${nativeItem("Third", 1)}</ul>` +
        paragraph("Third child", 2) +
        paragraph("Last"),
    );
    expect(blocks).toHaveLength(4);
    expect(blocks).toMatchObject([
      expectedItem("First"),
      expectedItem("Second"),
      expectedItem("Third", [expectedItem("Third child")]),
      expectedItem("Last"),
    ]);
  });

  it("uses an existing native item as the parent of a following paragraph item", () => {
    const blocks = parseOfficeHTML(
      `<ol>${nativeItem("Parent", 1)}</ol>` +
        paragraph("Child", 2) +
        paragraph("Sibling"),
    );
    expect(blocks).toHaveLength(2);
    expect(blocks).toMatchObject([
      expectedItem("Parent", [expectedItem("Child")], "numberedListItem"),
      expectedItem("Sibling"),
    ]);
  });

  it("preserves native ordered child lists and inline formatting", () => {
    const blocks = parseOfficeHTML(
      paragraph("Parent") +
        `<ul><ol>${nativeItem("<strong>Child</strong>")}</ol></ul>` +
        paragraph("Grandchild", 3) +
        paragraph("Next child", 2),
    );
    expect(blocks).toHaveLength(1);
    expect(blocks).toMatchObject([
      expectedItem("Parent", [
        {
          ...expectedItem(
            "Child",
            [expectedItem("Grandchild")],
            "numberedListItem",
          ),
          content: [{ text: "Child", styles: { bold: true } }],
        },
        expectedItem("Next child"),
      ]),
    ]);
  });

  it.each([
    ["different list", `<ul><ul>${nativeItem("Child", 2, "l1")}</ul></ul>`],
    [
      "different instance",
      `<ul><ul>${nativeItem("Child", 2, "l0", 2)}</ul></ul>`,
    ],
    ["skipped level", `<ul><ul>${nativeItem("Child", 3)}</ul></ul>`],
    ["missing metadata", "<ul><ul><li>Child</li></ul></ul>"],
    [
      "inconsistent metadata",
      `<ul><ul>${nativeItem("Child")}${nativeItem("Other", 2, "l1")}</ul></ul>`,
    ],
    ["wrapper text", `<ul>Keep me<ul>${nativeItem("Child")}</ul></ul>`],
  ])("does not guess a native parent with %s", (_name, native) => {
    const root = normalizedDOM(paragraph("Parent") + native);
    expect(root.querySelectorAll(":scope > ul")).toHaveLength(2);
    expect(root.firstElementChild?.querySelector("li > ul")).toBeNull();
    // The uncertain native fragment is preserved, rather than flattened here.
    const original = document.createElement("div");
    original.innerHTML = native;
    expect(root.lastElementChild?.outerHTML).toBe(original.innerHTML);
  });

  it.each(["<p>Boundary</p>", "Boundary", "<p><o:p>&nbsp;</o:p></p>"])(
    "does not attach native subitems across a content boundary: %s",
    (boundary) => {
      const root = normalizedDOM(
        paragraph("Parent") +
          boundary +
          `<ul><ul>${nativeItem("Child")}</ul></ul>` +
          paragraph("Last"),
      );
      expect(root.querySelectorAll(":scope > ul")).toHaveLength(3);
      expect(root.firstElementChild?.querySelector("li > ul")).toBeNull();
      expect(root.lastElementChild?.textContent).toBe("Last");
    },
  );

  it("keeps transitions local to a table cell", () => {
    const root = normalizedDOM(
      `<table><tbody><tr><td>${paragraph("Cell parent")}<ul><ul>${nativeItem("Cell child")}</ul></ul></td><td><ul><ul>${nativeItem("Other cell")}</ul></ul>${paragraph("Other parent")}</td></tr></tbody></table>` +
        paragraph("Outside"),
    );
    const cells = root.querySelectorAll("td");
    expect(cells[0].querySelectorAll(":scope > ul")).toHaveLength(1);
    expect(cells[0].querySelector("li > ul > li")?.textContent).toBe(
      "Cell child",
    );
    expect(cells[1].querySelectorAll(":scope > ul")).toHaveLength(2);
    expect(root.querySelector(":scope > ul")?.textContent).toBe("Outside");
    expect(root.textContent).toBe(
      "Cell parentCell childOther cellOther parentOutside",
    );
  });

  it("does not create a second list around a native item's styled paragraph", () => {
    const html = `<ul>${nativeItem('<p style="mso-list:l0 level1 lfo1">Content</p>', 1)}</ul>`;
    const root = normalizedDOM(html);
    expect(root.querySelectorAll("li")).toHaveLength(1);
    expect(root.querySelector("li > ul")).toBeNull();
    expect(root.textContent).toBe("Content");
    expect(parseOfficeHTML(html)).toMatchObject([expectedItem("Content")]);
  });
});

describe("Google Docs clipboard normalization", () => {
  // Source shapes are reduced from the repository's googleDocs parse fixture
  // (tests/src/unit/core/formatConversion/parse/parseTestInstances.ts), plus
  // CKEditor 5's captured Firefox paragraph wrapper:
  // https://github.com/ckeditor/ckeditor5/blob/e7c72a94f7cc6be9dff5ae0bfb81af3eaa42f62d/packages/ckeditor5-paste-from-office/tests/_data/paste-from-google-docs/bold-wrapper/simple-text/input.firefox.html
  // Copyright (c) 2003-2026, CKSource Holding sp. z o.o.
  // Upstream license (GPL-2.0-or-later or commercial):
  // https://github.com/ckeditor/ckeditor5/blob/e7c72a94f7cc6be9dff5ae0bfb81af3eaa42f62d/packages/ckeditor5/LICENSE.md
  // Break-only selections below are synthetic boundary cases using those shapes.
  it.each(["p", "h1", "span"])(
    "preserves hard breaks in a source-marked %s without adding paragraphs",
    (tag) => {
      const blocks = parseOfficeHTML(
        `<${tag} id="docs-internal-guid-test"><br><br></${tag}>`,
      );
      expect(blocks).toMatchObject([
        {
          type: tag === "h1" ? "heading" : "paragraph",
          ...(tag === "h1" ? { props: { level: 1 } } : {}),
          content: [{ text: "\n\n", styles: {} }],
          children: [],
        },
      ]);
      expect(blocks).toHaveLength(1);
    },
  );

  it("keeps a Firefox paragraph wrapper's inline styles and hard breaks", () => {
    const blocks = parseOfficeHTML(
      '<meta charset="utf-8"><p dir="ltr" id="docs-internal-guid-firefox"><span style="font-weight:400;white-space:pre-wrap">Plain</span><br><span style="font-weight:700;font-style:italic">Bold italic</span></p>',
    );
    expect(blocks).toMatchObject([
      {
        type: "paragraph",
        content: [
          { text: "Plain\n", styles: {} },
          { text: "Bold italic", styles: { bold: true, italic: true } },
        ],
        children: [],
      },
    ]);
    expect(blocks).toHaveLength(1);
  });

  it("keeps hard breaks when a source wrapper is inside a paragraph", () => {
    const blocks = parseOfficeHTML(
      '<p><b id="docs-internal-guid-test" style="font-weight:normal"><br><br></b></p>',
    );
    expect(blocks).toMatchObject([
      {
        type: "paragraph",
        content: [{ text: "\n\n", styles: {} }],
        children: [],
      },
    ]);
    expect(blocks).toHaveLength(1);
  });

  it("preserves blank paragraphs around lists and tables without expanding their hard breaks", () => {
    const blocks = parseOfficeHTML(
      '<b id="docs-internal-guid-test" style="font-weight:normal"><br><ul><li><p>Bullet<br>line</p><ol><li>Number</li></ol></li></ul><br><div><table><tbody><tr><td><p>Cell<br>line</p></td></tr></tbody></table></div><br></b>',
    );
    expect(blocks).toMatchObject([
      { type: "paragraph", content: [] },
      {
        type: "bulletListItem",
        content: [{ text: "Bullet\nline", styles: {} }],
        children: [
          {
            type: "numberedListItem",
            content: [{ text: "Number", styles: {} }],
            children: [],
          },
        ],
      },
      { type: "paragraph", content: [] },
      {
        type: "table",
        content: {
          rows: [
            { cells: [{ content: [{ text: "Cell\nline", styles: {} }] }] },
          ],
        },
      },
      { type: "paragraph", content: [] },
    ]);
    expect(blocks).toHaveLength(5);
  });
});
