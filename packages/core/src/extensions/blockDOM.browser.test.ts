import { afterEach, describe, expect, it } from "vite-plus/test";

import { getBlockElement, getDirectChildBlocks } from "./blockDOM.js";

let root: HTMLElement | undefined;

afterEach(() => {
  root?.remove();
  root = undefined;
});

/** Attaches the markup to the document and returns a lookup by `data-id`. */
function mount(html: string) {
  root = document.createElement("div");
  root.innerHTML = html;
  document.body.append(root);
  return (id: string) =>
    root!.querySelector(
      `[data-id="${id}"]:not([data-node-type="blockOuter"])`,
    )!;
}

// A column list with one block per column, the way BlockNote renders it: each
// regular block is a `blockContainer` wrapped in `blockOuter` chrome.
const columns = `
  <div class="bn-editor">
    <div data-node-type="columnList" data-id="list">
      <div data-node-type="column" data-id="col-a">
        <div data-node-type="blockOuter" data-id="a">
          <div data-node-type="blockContainer" data-id="a"><span>A</span></div>
        </div>
      </div>
      <div data-node-type="column" data-id="col-b">
        <div data-node-type="blockOuter" data-id="b">
          <div data-node-type="blockContainer" data-id="b">B</div>
        </div>
      </div>
    </div>
  </div>`;

// A block that embeds another editor, with a block of its own.
const nestedEditor = `
  <div class="bn-editor">
    <div data-node-type="blockOuter" data-id="outer">
      <div data-node-type="blockContainer" data-id="outer">
        <div class="bn-editor" data-test="inner">
          <div data-node-type="blockOuter" data-id="inner">
            <div data-node-type="blockContainer" data-id="inner">inner</div>
          </div>
        </div>
      </div>
    </div>
  </div>`;

describe("getDirectChildBlocks", () => {
  it("returns direct child blocks, skipping nested grandchildren", () => {
    const byId = mount(columns);
    // The blocks inside each column must not come back as the list's own
    // children.
    expect(getDirectChildBlocks(byId("list"))).toEqual([
      byId("col-a"),
      byId("col-b"),
    ]);
  });

  it("sees through blockOuter wrappers to the blockContainer child", () => {
    const byId = mount(columns);
    expect(getDirectChildBlocks(byId("col-a"))).toEqual([byId("a")]);
  });

  it("skips the blocks of an editor nested in the block", () => {
    const byId = mount(nestedEditor);
    expect(getDirectChildBlocks(byId("outer"))).toEqual([]);
  });
});

describe("getBlockElement", () => {
  it("returns the block an element is in", () => {
    const byId = mount(columns);
    const editor = root!.querySelector<HTMLElement>(".bn-editor")!;
    const text = byId("a").querySelector("span")!;
    expect(getBlockElement(text, { dom: editor })).toBe(byId("a"));
    expect(getBlockElement(byId("col-a"), { dom: editor })).toBe(byId("col-a"));
  });

  it("returns nothing for the editor element itself", () => {
    mount(columns);
    const editor = root!.querySelector<HTMLElement>(".bn-editor")!;
    expect(getBlockElement(editor, { dom: editor })).toBeUndefined();
  });

  it("leaves the blocks of a nested editor to that editor", () => {
    const byId = mount(nestedEditor);
    const outer = root!.querySelector<HTMLElement>(".bn-editor")!;
    const inner = root!.querySelector<HTMLElement>('[data-test="inner"]')!;
    expect(getBlockElement(byId("inner"), { dom: outer })).toBeUndefined();
    expect(getBlockElement(byId("inner"), { dom: inner })).toBe(byId("inner"));
    // The inner editor's own padding is in the outer block, which belongs to
    // the outer editor.
    expect(getBlockElement(inner, { dom: inner })).toBeUndefined();
  });
});
