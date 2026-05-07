import { describe, expect, it } from "vitest";
import { nestedListsToBlockNoteStructure } from "./nestedLists.js";

async function testHTML(html: string) {
  const htmlNode = nestedListsToBlockNoteStructure(html);
  expect(htmlNode.innerHTML).toMatchSnapshot();
}

describe("Lift nested lists", () => {
  it("Lifts nested bullet lists", async () => {
    const html = `<ul>
    <li>
       Bullet List Item 1
       <ul>
          <li>
             Nested Bullet List Item 1
          </li>
          <li>
             Nested Bullet List Item 2
          </li>
       </ul>
    </li>
    <li>
    Bullet List Item 2
    </li>
 </ul>`;
    await testHTML(html);
  });

  it("Lifts nested bullet lists without li", async () => {
    const html = `<ul>
       Bullet List Item 1
       <ul>
          <li>
             Nested Bullet List Item 1
          </li>
          <li>
             Nested Bullet List Item 2
          </li>
       </ul>
    <li>
    Bullet List Item 2
    </li>
 </ul>`;
    await testHTML(html);
  });

  it("Lifts nested bullet lists with content after nested list", async () => {
    const html = `<ul>
    <li>
       Bullet List Item 1
       <ul>
          <li>
             Nested Bullet List Item 1
          </li>
          <li>
             Nested Bullet List Item 2
          </li>
       </ul>
       More content in list item 1
    </li>
    <li>
    Bullet List Item 2
    </li>
 </ul>`;
    await testHTML(html);
  });

  it("Lifts multiple bullet lists", async () => {
    const html = `<ul>
    <li>
       Bullet List Item 1
       <ul>
          <li>
             Nested Bullet List Item 1
          </li>
          <li>
             Nested Bullet List Item 2
          </li>
       </ul>
       <ul>
          <li>
             Nested Bullet List Item 3
          </li>
          <li>
             Nested Bullet List Item 4
          </li>
       </ul>
    </li>
    <li>
    Bullet List Item 2
    </li>
 </ul>`;
    await testHTML(html);
  });

  it("Lifts multiple bullet lists with content in between", async () => {
    const html = `<ul>
    <li>
       Bullet List Item 1
       <ul>
          <li>
             Nested Bullet List Item 1
          </li>
          <li>
             Nested Bullet List Item 2
          </li>
       </ul>
       In between content
       <ul>
          <li>
             Nested Bullet List Item 3
          </li>
          <li>
             Nested Bullet List Item 4
          </li>
       </ul>
    </li>
    <li>
    Bullet List Item 2
    </li>
 </ul>`;
    await testHTML(html);
  });

  it("Lifts nested numbered lists", async () => {
    const html = `<ol>
    <li>
       Numbered List Item 1
       <ol>
          <li>
             Nested Numbered List Item 1
          </li>
          <li>
             Nested Numbered List Item 2
          </li>
       </ol>
    </li>
    <li>
       Numbered List Item 2
    </li>
 </ol>`;
    await testHTML(html);
  });

  it("Wraps consecutive bare <li> elements in a <ul>", async () => {
    const html = `<li>a</li><li>b</li>`;
    await testHTML(html);
  });

  it("Wraps a single bare <li> in a <ul>", async () => {
    const html = `<li>only</li>`;
    await testHTML(html);
  });

  it("Wraps bare <li>s mixed with other top-level content", async () => {
    const html = `<p>before</p><li>x</li><li>y</li><p>after</p>`;
    await testHTML(html);
  });

  it("Leaves <li>s already inside a <ul> alone", async () => {
    const html = `<ul><li>existing</li></ul><li>orphan</li>`;
    await testHTML(html);
  });

  it("Wraps nested orphan <li>s as inner lists", async () => {
    const html = `<li>outer<li>inner</li></li>`;
    await testHTML(html);
  });

  it("Lifts nested mixed lists", async () => {
    const html = `<ol>
    <li>
       Numbered List Item 1
       <ul>
          <li>
             Bullet List Item 1
          </li>
          <li>
          Bullet List Item 2
          </li>
       </ul>
    </li>
    <li>
       Numbered List Item 2
    </li>
 </ol>`;
    await testHTML(html);
  });
});
