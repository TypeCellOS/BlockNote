import { afterEach, describe, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import { normalizeOfficeHTML } from "./normalizeOfficeHTML.js";

// These tests exercise browser HTML parsing and native clipboard events.
const editors: BlockNoteEditor[] = [];
const containers: HTMLElement[] = [];

function createEditor(
  options: Parameters<typeof BlockNoteEditor.create>[0] = {},
) {
  const editor = BlockNoteEditor.create(options);
  editors.push(editor);
  return editor;
}

function mountEditor(
  options: Parameters<typeof BlockNoteEditor.create>[0] = {},
) {
  const editor = createEditor(options);
  const container = document.createElement("div");
  document.body.append(container);
  containers.push(container);
  editor.mount(container);
  return editor;
}

function parseOfficeHTML(html: string) {
  return createEditor().tryParseHTMLToBlocks(normalizeOfficeHTML(html));
}

afterEach(() => {
  for (const editor of editors.splice(0)) {
    editor._tiptapEditor.destroy();
  }
  for (const container of containers.splice(0)) {
    container.remove();
  }
});

function wordItem(text: string, level = 1, marker = "·", list = "l0") {
  return `<p style="mso-list: ${list} level${level} lfo1"><span style="mso-list:Ignore">${marker}&nbsp;</span>${text}<o:p></o:p></p>`;
}

function createPasteEvent(data: Record<string, string>) {
  const event = new ClipboardEvent("paste", {
    clipboardData: new DataTransfer(),
    bubbles: true,
    cancelable: true,
  });
  if (!event.clipboardData) {
    throw new Error(
      "Synthetic paste events must provide a clipboard data store",
    );
  }
  // Firefox creates its own store rather than retaining the constructor's store.
  for (const [type, value] of Object.entries(data)) {
    event.clipboardData.setData(type, value);
    expect(event.clipboardData.getData(type)).toBe(value);
  }
  return event;
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

  it("can replace the default behavior with an existing pasteHandler", () => {
    const editor = mountEditor({
      pasteHandler: ({ editor }) => {
        editor.pasteHTML("<h2>Replacement</h2>");
        return true;
      },
    });
    editor.prosemirrorView.dom.dispatchEvent(
      createPasteEvent({ "text/html": wordItem("Original") }),
    );
    expect(editor.document[0]).toMatchObject({
      type: "heading",
      props: { level: 2 },
      content: [{ text: "Replacement" }],
    });
  });

  it("keeps normalization when a custom pasteHandler delegates to the default", () => {
    const editor = mountEditor({
      pasteHandler: ({ defaultPasteHandler }) => defaultPasteHandler(),
    });
    editor.prosemirrorView.dom.dispatchEvent(
      createPasteEvent({ "text/html": wordItem("Original") }),
    );
    expect(editor.document[0]).toMatchObject({
      type: "bulletListItem",
      content: [{ text: "Original" }],
    });
  });

  it("normalizes Word HTML in the default clipboard handler", () => {
    const editor = mountEditor();
    const html = wordItem("Original");
    editor.prosemirrorView.dom.dispatchEvent(
      createPasteEvent({ "text/html": html, "text/plain": "Original" }),
    );
    expect(editor.document[0]).toMatchObject({
      type: "bulletListItem",
      content: [{ text: "Original" }],
    });
  });

  it("preserves Google Docs blank paragraphs in the default clipboard handler", () => {
    const editor = mountEditor();
    editor.prosemirrorView.dom.dispatchEvent(
      createPasteEvent({
        "text/html":
          '<b id="docs-internal-guid-test" style="font-weight:normal"><p>First</p><br><p>Last</p></b>',
      }),
    );
    expect(editor.document).toMatchObject([
      { type: "paragraph", content: [{ text: "First" }] },
      { type: "paragraph", content: [] },
      { type: "paragraph", content: [{ text: "Last" }] },
    ]);
  });

  it("does not normalize programmatic HTML pastes", () => {
    const editor = mountEditor();
    editor.pasteHTML(wordItem("Original"));
    expect(editor.document[0]).toMatchObject({
      type: "paragraph",
      content: [{ text: "·\u00a0Original" }],
    });
  });

  it("does not preprocess internal BlockNote clipboard HTML", () => {
    const editor = mountEditor();
    editor.prosemirrorView.dom.dispatchEvent(
      createPasteEvent({
        "blocknote/html": editor.blocksToFullHTML([
          { type: "paragraph", content: "Original" },
        ]),
        "text/html": "<p>Fallback</p>",
      }),
    );
    expect(editor.document[0]).toMatchObject({
      content: [{ text: "Original" }],
    });
  });
});
