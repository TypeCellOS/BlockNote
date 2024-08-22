import { describe, expect, it } from "vitest";
import { nestedListsToBlockNoteStructure } from "./nestedLists";

async function testHTML(html: string) {
  const rehypeParse = await import("rehype-parse");
  const rehypeStringify = await import("rehype-stringify");
  const rehypeFormat = await import("rehype-format");

  const unified = await import("unified");

  const htmlNode = nestedListsToBlockNoteStructure(html);

  const pretty = await unified
    .unified()
    .use(rehypeParse.default, { fragment: true })
    .use(rehypeFormat.default)
    .use(rehypeStringify.default)
    .process(htmlNode.innerHTML);

  expect(pretty.value).toMatchSnapshot();
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
