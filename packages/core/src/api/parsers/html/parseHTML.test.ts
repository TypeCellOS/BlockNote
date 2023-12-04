import { describe, expect, it } from "vitest";
import { BlockNoteEditor } from "../../..";
import { nestedListsToBlockNoteStructure } from "./util/nestedLists";

async function parseHTMLAndCompareSnapshots(
  html: string,
  snapshotName: string
) {
  // use a dynamic import because we want to access
  // __parseFromClipboard which is not exposed in types
  const view: any = await import("prosemirror-view");

  const editor = BlockNoteEditor.create();
  const blocks = await editor.tryParseHTMLToBlocks(html);

  const snapshotPath = "./__snapshots__/paste/" + snapshotName + ".json";
  expect(JSON.stringify(blocks, undefined, 2)).toMatchFileSnapshot(
    snapshotPath
  );

  // Now, we also want to test actually pasting in the editor, and not just calling
  // tryParseHTMLToBlocks directly.
  // The reason is that the prosemirror logic for pasting can be a bit different, because
  // it's related to the context of where the user is pasting exactly (selection)
  //
  // The internal difference come that in tryParseHTMLToBlocks, we use DOMParser.parse,
  // while when pasting, Prosemirror uses DOMParser.parseSlice, and then tries to fit the
  // slice in the document. This fitting might change the structure / interpretation of the pasted blocks

  // Simulate a paste event (this uses DOMParser.parseSlice internally)

  (window as any).__TEST_OPTIONS.mockID = 0; // reset id counter
  const htmlNode = nestedListsToBlockNoteStructure(html);
  const tt = editor._tiptapEditor;

  const slice = view.__parseFromClipboard(
    tt.view,
    "",
    htmlNode.innerHTML,
    false,
    tt.view.state.selection.$from
  );
  tt.view.dispatch(tt.view.state.tr.replaceSelection(slice));

  // alternative paste simulation doesn't work in a non-browser vitest env
  //   editor._tiptapEditor.view.pasteHTML(html, {
  //     preventDefault: () => {
  //       // noop
  //     },
  //     clipboardData: {
  //       types: ["text/html"],
  //       getData: () => html,
  //     },
  //   } as any);

  const pastedBlocks = editor.topLevelBlocks;
  pastedBlocks.pop(); // trailing paragraph
  expect(pastedBlocks).toStrictEqual(blocks);
}

describe("Parse HTML", () => {
  it("Parse basic block types", async () => {
    const html = `<h1>Heading 1</h1>
  <h2>Heading 2</h2>
  <h3>Heading 3</h3>
  <p>Paragraph</p>
  <figure><img src="exampleURL" /><figcaption>Image Caption</figcaption></figure>
  <p>None <strong>Bold </strong><em>Italic </em><u>Underline </u><s>Strikethrough </s><strong><em><s><u>All</u></s></em></strong></p>`;

    await parseHTMLAndCompareSnapshots(html, "parse-basic-block-types");
  });

  it("list test", async () => {
    const html = `<ul>
   <li>First</li>
   <li>Second</li>
   <li>Third</li>
   <li>Five Parent
   <ul>
   <li>Child 1</li>
   <li>Child 2</li>
   </ul>
   </li>
   </ul>`;
    await parseHTMLAndCompareSnapshots(html, "list-test");
  });

  it("Parse nested lists", async () => {
    const html = `<ul>
    <li>Bullet List Item</li>
      <li>Bullet List Item</li>
        <ul>
           <li>
              Nested Bullet List Item
           </li>
           <li>
              Nested Bullet List Item
           </li>
        </ul>
     <li>
        Bullet List Item
     </li>
  </ul>
  <ol>
     <li>
        Numbered List Item
        <ol>
           <li>
              Nested Numbered List Item
           </li>
           <li>
              Nested Numbered List Item
           </li>
        </ol>
     </li>
     <li>
        Numbered List Item
     </li>
  </ol>`;

    await parseHTMLAndCompareSnapshots(html, "parse-nested-lists");
  });

  it("Parse nested lists with paragraphs", async () => {
    const html = `<ul>
     <li>
        <p>Bullet List Item</p>
        <ul>
           <li>
              <p>Nested Bullet List Item</p>
           </li>
           <li>
              <p>Nested Bullet List Item</p>
           </li>
        </ul>
     </li>
     <li>
        <p>Bullet List Item</p>
     </li>
  </ul>
  <ol>
     <li>
        <p>Numbered List Item</p>
        <ol>
           <li>
              <p>Nested Numbered List Item</p>
           </li>
           <li>
              <p>Nested Numbered List Item</p>
           </li>
        </ol>
     </li>
     <li>
        <p>Numbered List Item</p>
     </li>
  </ol>`;

    await parseHTMLAndCompareSnapshots(
      html,
      "parse-nested-lists-with-paragraphs"
    );
  });

  it("Parse mixed nested lists", async () => {
    const html = `<ul>
     <li>
        Bullet List Item
        <ol>
           <li>
              Nested Numbered List Item
           </li>
           <li>
              Nested Numbered List Item
           </li>
        </ol>
     </li>
     <li>
        Bullet List Item
     </li>
  </ul>
  <ol>
     <li>
        Numbered List Item
        <ul>
           <li>
              <p>Nested Bullet List Item</p>
           </li>
           <li>
              <p>Nested Bullet List Item</p>
           </li>
        </ul>
     </li>
     <li>
        Numbered List Item
     </li>
  </ol>`;

    await parseHTMLAndCompareSnapshots(html, "parse-mixed-nested-lists");
  });

  it("Parse divs", async () => {
    const html = `<div>Single Div</div>
  <div>
    Div
    <div>Nested Div</div>
    <div>Nested Div</div>
  </div>
  <div>Single Div 2</div>
  <div>
    <div>Nested Div</div>
    <div>Nested Div</div>
  </div>`;

    await parseHTMLAndCompareSnapshots(html, "parse-divs");
  });

  it("Parse two divs", async () => {
    const html = `<div>Single Div</div><div>second Div</div>`;

    await parseHTMLAndCompareSnapshots(html, "parse-two-divs");
  });

  it("Parse fake image caption", async () => {
    const html = `<div>
    <img src="exampleURL">
    <p>Image Caption</p>
  </div>`;

    await parseHTMLAndCompareSnapshots(html, "parse-fake-image-caption");
  });

  // TODO: this one fails
  it.skip("Parse deep nested content", async () => {
    const html = `<div>
      Outer 1 Div Before
    <div>
      Outer 2 Div Before
      <div>
        Outer 3 Div Before
        <div>
          Outer 4 Div Before
          <h1>Heading 1</h1>
          <h2>Heading 2</h2>
          <h3>Heading 3</h3>
          <p>Paragraph</p>
          <figure><img src="exampleURL"><figcaption>Image Caption</figcaption></figure>
          <p><strong>Bold</strong> <em>Italic</em> <u>Underline</u> <s>Strikethrough</s> <strong><em><s><u>All</u></s></em></strong></p>
          Outer 4 Div After
        </div>
        Outer 3 Div After
      </div>
      Outer 2 Div After
    </div>
    Outer 1 Div After
  </div>`;

    await parseHTMLAndCompareSnapshots(html, "parse-deep-nested-content");
  });

  it("Parse div with inline content and nested blocks", async () => {
    const html = `<div>
    None <strong>Bold </strong><em>Italic </em><u>Underline </u><s>Strikethrough </s><strong><em><s><u>All</u></s></em></strong>
    <div>Nested Div</div>
    <p>Nested Paragraph</p>
  </div>`;

    await parseHTMLAndCompareSnapshots(html, "parse-div-with-inline-content");
  });

  it("Parse Notion HTML", async () => {
    // A few notes on Notion output HTML:
    // - Does not preserve text/background colors
    // - Does not preserve non-list-item block nesting
    // - Hard breaks are represented using white space, not `<br>` elements
    // - Images are converted to links with a "!" at the start
    // - Cells in first row of a table are converted to `th` elements, regardless
    // of if the row is set as a header row

    const html = `<meta charset='utf-8'><h1>Heading 1</h1>
<h2>Heading 2</h2>
<h3>Heading 3</h3>
<p>Paragraph 1</p>
<p>Nested Paragraph 1</p>
<p>Nested Paragraph 2</p>
<p>Paragraph
With Hard Break</p>
<p><strong>Bold</strong> <em>Italic</em> Underline <s>Strikethrough</s> <em><strong><s>All</s></strong></em></p>
<ul>
<li>Bullet List Item 1
<ul>
<li>Nested Bullet List Item 1
<ol>
<li>Nested Numbered List Item 1</li>
<li>Nested Numbered List Item 2</li>
</ol>
</li>
<li>Nested Bullet List Item 2</li>
</ul>
</li>
<li>Bullet List Item 2</li>
</ul>
<ol>
<li>Numbered List Item 1</li>
<li>Numbered List Item 2</li>
</ol>
<p>Background Color Paragraph</p>
<p>!<a href="https://www.pulsecarshalton.co.uk/wp-content/uploads/2016/08/jk-placeholder-image.jpg">https://www.pulsecarshalton.co.uk/wp-content/uploads/2016/08/jk-placeholder-image.jpg</a></p>
<table>
<thead>
<tr>
<th>Cell 1</th>
<th>Cell 2</th>
<th>Cell 3</th>
</tr>
</thead>
<tbody>
<tr>
<td>Cell 4</td>
<td>Cell 5</td>
<td>Cell 6</td>
</tr>
<tr>
<td>Cell 7</td>
<td>Cell 8</td>
<td>Cell 9</td>
</tr>
</tbody>
</table>
<p>Paragraph</p>
<!-- notionvc: 7cb7968f-b969-4795-af7a-d41b5481c675 -->`;

    await parseHTMLAndCompareSnapshots(html, "parse-notion-html");
  });

  // Currently breaking, seems related to parsing `</br>` elements
  it.skip("Parse Google Docs HTML", async () => {
    // A few notes on Google Docs output HTML:
    // - All inline markup is represented as `<span>` elements with inline
    // styles (bold, italic, etc.)
    // - The nested list structure is not valid, i.e. `<ul/ol>` elements are not
    // placed within `<li>` elements
    // - Images are wrapped in two spans and a paragraph
    // - Everything is nested within a `<b>` element

    const html = `<meta charset='utf-8'>
<meta charset="utf-8">
<b style="font-weight:normal;" id="docs-internal-guid-fdf86189-7fff-f50a-2bef-c048469db8a9">
<h1 dir="ltr" style="line-height:1.38;margin-left: 18pt;text-indent: -18pt;margin-top:24pt;margin-bottom:6pt;padding:0pt 0pt 0pt 18pt;"><span style="font-size:23pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Heading 1</span></h1>
<h2 dir="ltr" style="line-height:1.38;margin-left: 18pt;text-indent: -18pt;margin-top:18pt;margin-bottom:4pt;padding:0pt 0pt 0pt 18pt;"><span style="font-size:17pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Heading 2</span></h2>
<h3 dir="ltr" style="line-height:1.38;margin-left: 18pt;text-indent: -18pt;margin-top:14pt;margin-bottom:4pt;padding:0pt 0pt 0pt 18pt;"><span style="font-size:13pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Heading 3</span></h3>
<p dir="ltr" style="line-height:1.38;margin-top:12pt;margin-bottom:12pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Paragraph 1</span></p>
<p dir="ltr" style="line-height:1.38;margin-top:12pt;margin-bottom:12pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Paragraph 2</span></p>
<p dir="ltr" style="line-height:1.38;margin-top:12pt;margin-bottom:12pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Paragraph 3</span></p>
<p dir="ltr" style="line-height:1.38;margin-top:12pt;margin-bottom:12pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Paragraph With </span><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"><br /></span><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Hard Break</span></p>
<p dir="ltr" style="line-height:1.38;margin-top:12pt;margin-bottom:12pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Bold</span><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"> </span><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:italic;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Italic</span><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"> Underline </span><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:line-through;-webkit-text-decoration-skip:none;text-decoration-skip-ink:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Strikethrough</span><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"> </span><span style="font-size:11pt;font-family:Arial,sans-serif;color:#ff0000;background-color:transparent;font-weight:700;font-style:italic;font-variant:normal;text-decoration:line-through;-webkit-text-decoration-skip:none;text-decoration-skip-ink:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">All</span></p>
<ul style="margin-top:0;margin-bottom:0;padding-inline-start:48px;">
<li dir="ltr" style="list-style-type:disc;font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="1">
<p dir="ltr" style="line-height:1.38;margin-top:12pt;margin-bottom:0pt;" role="presentation"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Bullet List Item 1</span></p>
</li>
<ul style="margin-top:0;margin-bottom:0;padding-inline-start:48px;">
<li dir="ltr" style="list-style-type:circle;font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="2">
<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" role="presentation"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Nested Bullet List Item 1</span></p>
</li>
<ol style="margin-top:0;margin-bottom:0;padding-inline-start:48px;">
<li dir="ltr" style="list-style-type:decimal;font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="3">
<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" role="presentation"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Nested Numbered List Item 1</span></p>
</li>
<li dir="ltr" style="list-style-type:decimal;font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="3">
<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" role="presentation"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Nested Numbered List Item 2</span></p>
</li>
</ol>
<li dir="ltr" style="list-style-type:circle;font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="2">
<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" role="presentation"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Nested Bullet List Item 2</span></p>
</li>
</ul>
<li dir="ltr" style="list-style-type:disc;font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="1">
<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" role="presentation"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Bullet List Item 2</span></p>
</li>
</ul>
<ol style="margin-top:0;margin-bottom:0;padding-inline-start:48px;">
<li dir="ltr" style="list-style-type:decimal;font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="1">
<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" role="presentation"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Numbered List Item 1</span></p>
</li>
<li dir="ltr" style="list-style-type:decimal;font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="1">
<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:12pt;" role="presentation"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Numbered List Item 2</span></p>
</li>
</ol>
<p dir="ltr" style="line-height:1.38;margin-top:12pt;margin-bottom:12pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"><span style="border:none;display:inline-block;overflow:hidden;width:447px;height:301px;"><img src="https://lh7-us.googleusercontent.com/SGyYp6hfLvNkli62NKFJB6NQz-fNa2Sjy8QxfUuqipW--qCCXmCz-dJmeZUGaDXIF9TEZHzbhNJsw4_w-B09eaFOn0oUChKsrSt3cwAIFu6d4SoSjHTR_DRTPr415_P7an7Lue-EwlUcVBk1WCzcoVQ" width="447" height="301" style="margin-left:0px;margin-top:0px;" /></span></span></p>
<br />
<div dir="ltr" style="margin-left:0pt;" align="left">
<table style="border:none;border-collapse:collapse;table-layout:fixed;width:468pt">
<colgroup>
<col />
<col />
<col />
</colgroup>
<tbody>
<tr style="height:0pt">
<td style="border-left:solid #000000 1pt;border-right:solid #000000 1pt;border-bottom:solid #000000 1pt;border-top:solid #000000 1pt;vertical-align:top;padding:5pt 5pt 5pt 5pt;overflow:hidden;overflow-wrap:break-word;">
<p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Cell 1</span></p>
</td>
<td style="border-left:solid #000000 1pt;border-right:solid #000000 1pt;border-bottom:solid #000000 1pt;border-top:solid #000000 1pt;vertical-align:top;padding:5pt 5pt 5pt 5pt;overflow:hidden;overflow-wrap:break-word;">
<p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Cell 2</span></p>
</td>
<td style="border-left:solid #000000 1pt;border-right:solid #000000 1pt;border-bottom:solid #000000 1pt;border-top:solid #000000 1pt;vertical-align:top;padding:5pt 5pt 5pt 5pt;overflow:hidden;overflow-wrap:break-word;">
<p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Cell 3</span></p>
</td>
</tr>
<tr style="height:0pt">
<td style="border-left:solid #000000 1pt;border-right:solid #000000 1pt;border-bottom:solid #000000 1pt;border-top:solid #000000 1pt;vertical-align:top;padding:5pt 5pt 5pt 5pt;overflow:hidden;overflow-wrap:break-word;">
<p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Cell 4</span></p>
</td>
<td style="border-left:solid #000000 1pt;border-right:solid #000000 1pt;border-bottom:solid #000000 1pt;border-top:solid #000000 1pt;vertical-align:top;padding:5pt 5pt 5pt 5pt;overflow:hidden;overflow-wrap:break-word;">
<p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Cell 5</span></p>
</td>
<td style="border-left:solid #000000 1pt;border-right:solid #000000 1pt;border-bottom:solid #000000 1pt;border-top:solid #000000 1pt;vertical-align:top;padding:5pt 5pt 5pt 5pt;overflow:hidden;overflow-wrap:break-word;">
<p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Cell 6</span></p>
</td>
</tr>
<tr style="height:0pt">
<td style="border-left:solid #000000 1pt;border-right:solid #000000 1pt;border-bottom:solid #000000 1pt;border-top:solid #000000 1pt;vertical-align:top;padding:5pt 5pt 5pt 5pt;overflow:hidden;overflow-wrap:break-word;">
<p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Cell 7</span></p>
</td>
<td style="border-left:solid #000000 1pt;border-right:solid #000000 1pt;border-bottom:solid #000000 1pt;border-top:solid #000000 1pt;vertical-align:top;padding:5pt 5pt 5pt 5pt;overflow:hidden;overflow-wrap:break-word;">
<p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Cell 8</span></p>
</td>
<td style="border-left:solid #000000 1pt;border-right:solid #000000 1pt;border-bottom:solid #000000 1pt;border-top:solid #000000 1pt;vertical-align:top;padding:5pt 5pt 5pt 5pt;overflow:hidden;overflow-wrap:break-word;">
<p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Cell 9</span></p>
</td>
</tr>
</tbody>
</table>
</div>
<p dir="ltr" style="line-height:1.38;margin-top:12pt;margin-bottom:12pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Paragraph</span></p>
</b>
<br class="Apple-interchange-newline">`;

    await parseHTMLAndCompareSnapshots(html, "parse-google-docs-html");
  });
});
