import { describe, expect, vi } from "vite-plus/test";
import { detachedDoc } from "../../../../util/detachedDoc.js";
import { normalizeNestedLists } from "./nestedLists.js";

// Makes the element for the HTML as `HTMLToBlocks` does, and runs the steps.
function parse(html: string) {
  const element = detachedDoc().createElement("div");
  element.innerHTML = html;
  normalizeNestedLists(element);
  return element;
}

async function testHTML(html: string) {
  expect(parse(html).innerHTML).toMatchSnapshot();
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

describe("custom inline content in a nested list item", () => {
  const mention =
    '<span data-inline-content-type="mention"><img src="avatar.png"></span>';

  it("keeps a mention as the only inline content of the list item", () => {
    const htmlNode = parse(
      `<ul><li>${mention}<p>Child paragraph</p><ul><li>Nested</li></ul></li></ul>`,
    );

    expect(htmlNode.querySelector("li")?.innerHTML).toBe(mention);
    const group = htmlNode.querySelector('[data-node-type="blockGroup"]');
    expect(
      Array.from(group?.children ?? [], (child) => child.outerHTML),
    ).toEqual(["<p>Child paragraph</p>", "<ul><li>Nested</li></ul>"]);
  });

  it.for([false, true])(
    "keeps an image-only mention with the list item (wrapped: %s)",
    (wrapped) => {
      const inlineContent = wrapped ? `<em>${mention}</em>` : mention;
      const htmlNode = parse(
        `<ul><li>Ask ${inlineContent} for help<ul><li>Nested</li></ul></li></ul>`,
      );

      expect(htmlNode.querySelector("li")?.innerHTML).toBe(
        `Ask ${inlineContent} for help`,
      );
      expect(
        htmlNode.querySelector('[data-node-type="blockGroup"] li')?.textContent,
      ).toBe("Nested");
    },
  );
});

describe("content after a nested list", () => {
  // The HTML is in a document without a browsing context. In the active
  // document, an element of the HTML can load a resource and run an event
  // handler.
  it("stays out of the active document", ({ onTestFinished }) => {
    // The code must make no element in the active document: a node that
    // goes into such an element is in the active document from then on.
    const createElement = vi.spyOn(document, "createElement");
    onTestFinished(() => {
      createElement.mockRestore();
    });

    const htmlNode = parse(
      `<ul><li>Item<ul><li>Nested item</li></ul><img src="image.png"></li></ul>`,
    );

    // The content after the nested list is a child of the list item: it is in
    // the block group, after the nested list.
    expect(htmlNode.innerHTML).toMatchInlineSnapshot(
      `"<ul><div><li>Item</li><div data-node-type="blockGroup"><ul><li>Nested item</li></ul><img src="image.png"></div></div></ul>"`,
    );
    expect(createElement).not.toHaveBeenCalled();
  });
});
