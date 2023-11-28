import { describe, expect, it } from "vitest";
import { BlockNoteEditor } from "../../..";
import { nestedListsToBlockNoteStructure } from "./util/nestedLists";

async function parseHTMLAndCompareSnapshots(
  html: string,
  snapshotName: string
) {
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

  // Simulate a paste event

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
});
