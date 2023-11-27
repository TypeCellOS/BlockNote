import { describe, expect, it } from "vitest";
import { BlockNoteEditor } from "../../..";

async function parseHTMLAndCompareSnapshots(
  html: string,
  snapshotName: string
) {
  const editor = BlockNoteEditor.create();
  const blocks = await editor.HTMLToBlocks(html);

  const snapshotPath = "./__snapshots__/paste/" + snapshotName + ".json";
  expect(JSON.stringify(blocks, undefined, 2)).toMatchFileSnapshot(
    snapshotPath
  );
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

  it("Parse nested lists", async () => {
    const html = `<ul>
     <li>
        Bullet List Item
        <ul>
           <li>
              Nested Bullet List Item
           </li>
           <li>
              Nested Bullet List Item
           </li>
        </ul>
     </li>
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

  // TODO: doesn't work
  it.only("Parse divs", async () => {
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

  it("Parse fake image caption", async () => {
    const html = `<div>
    <img src="exampleURL">
    <p>Image Caption</p>
  </div>`;

    await parseHTMLAndCompareSnapshots(html, "parse-fake-image-caption");
  });

  it("Parse deep nested content", async () => {
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
});
