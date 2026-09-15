/**
 * @vitest-environment jsdom
 */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";

import {
  SCROLL_HIGHLIGHT_CLASS,
  scrollToFirstChange,
} from "./scrollToFirstChange.js";

// jsdom implements neither `scrollIntoView` nor layout, so both are installed
// here: `scrollIntoView` to observe the call, `getBoundingClientRect` per
// element to model which nodes have a box.
const hadScrollIntoView = "scrollIntoView" in Element.prototype;
let scrollIntoView: ReturnType<typeof vi.fn<Element["scrollIntoView"]>>;

/** Give `element` a non-empty layout box. */
function withBox(element: Element): Element {
  element.getBoundingClientRect = () => ({ width: 100, height: 20 }) as DOMRect;
  return element;
}

/** Give `element` a zero-sized box, as `display: contents` wrappers have. */
function withoutBox(element: Element): Element {
  element.getBoundingClientRect = () => ({ width: 0, height: 0 }) as DOMRect;
  return element;
}

function makeRoot(): HTMLElement {
  const root = document.createElement("div");
  document.body.appendChild(root);
  return root;
}

beforeEach(() => {
  scrollIntoView = vi.fn<Element["scrollIntoView"]>();
  Element.prototype.scrollIntoView = scrollIntoView;
});

afterEach(() => {
  document.body.innerHTML = "";
  if (!hadScrollIntoView) {
    Reflect.deleteProperty(Element.prototype, "scrollIntoView");
  }
});

describe("scrollToFirstChange", () => {
  it("returns false when there is no root", () => {
    expect(scrollToFirstChange(undefined)).toBe(false);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("returns false when the document has no attribution marks", () => {
    expect(scrollToFirstChange(makeRoot())).toBe(false);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("scrolls to the content element of the first mark", () => {
    const root = makeRoot();
    const wrapper = document.createElement("span");
    wrapper.dataset["userIds"] = '["u1"]';
    const content = withBox(document.createElement("span"));
    wrapper.appendChild(content);
    root.appendChild(wrapper);

    expect(scrollToFirstChange(root)).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.instances[0]).toBe(content);
  });

  it("descends one level further when the content element has no box", () => {
    const root = makeRoot();
    const wrapper = document.createElement("div");
    wrapper.dataset["userIds"] = '["u1"]';
    const content = withoutBox(document.createElement("div"));
    const inner = withBox(document.createElement("p"));
    content.appendChild(inner);
    wrapper.appendChild(content);
    root.appendChild(wrapper);

    expect(scrollToFirstChange(root)).toBe(true);
    expect(scrollIntoView.mock.instances[0]).toBe(inner);
  });

  it("picks the first mark in document order", () => {
    const root = makeRoot();
    for (const id of ["u1", "u2"]) {
      const wrapper = document.createElement("span");
      wrapper.dataset["userIds"] = `["${id}"]`;
      wrapper.appendChild(withBox(document.createElement("span")));
      root.appendChild(wrapper);
    }

    scrollToFirstChange(root);

    expect(scrollIntoView.mock.instances[0]).toBe(
      root.firstElementChild!.firstElementChild,
    );
  });

  it("scrolls smoothly by default and instantly under reduced motion", () => {
    const root = makeRoot();
    const wrapper = document.createElement("span");
    wrapper.dataset["userIds"] = '["u1"]';
    wrapper.appendChild(withBox(document.createElement("span")));
    root.appendChild(wrapper);

    // jsdom has no `matchMedia`; the helper optional-calls it, so the
    // no-preference default is exercised by simply leaving it out.
    scrollToFirstChange(root);
    expect(scrollIntoView).toHaveBeenLastCalledWith({
      block: "center",
      behavior: "smooth",
    });

    window.matchMedia = vi.fn(() => ({ matches: true }) as MediaQueryList);
    scrollToFirstChange(root);
    expect(scrollIntoView).toHaveBeenLastCalledWith({
      block: "center",
      behavior: "auto",
    });

    Reflect.deleteProperty(window, "matchMedia");
  });

  it("highlights the changed block, then stops", () => {
    vi.useFakeTimers();
    const root = makeRoot();
    const block = document.createElement("div");
    block.className = "bn-block-content";
    const wrapper = document.createElement("span");
    wrapper.dataset["userIds"] = '["u1"]';
    wrapper.appendChild(withBox(document.createElement("span")));
    block.appendChild(wrapper);
    root.appendChild(block);

    scrollToFirstChange(root);
    // The whole block, not the mark that was scrolled to.
    expect(block.classList.contains(SCROLL_HIGHLIGHT_CLASS)).toBe(true);

    vi.advanceTimersByTime(1500);
    expect(block.classList.contains(SCROLL_HIGHLIGHT_CLASS)).toBe(false);
    vi.useRealTimers();
  });

  it("highlights the scrolled-to element when it is in no block", () => {
    vi.useFakeTimers();
    const root = makeRoot();
    const wrapper = document.createElement("span");
    wrapper.dataset["userIds"] = '["u1"]';
    const content = withBox(document.createElement("span"));
    wrapper.appendChild(content);
    root.appendChild(wrapper);

    scrollToFirstChange(root);
    expect(content.classList.contains(SCROLL_HIGHLIGHT_CLASS)).toBe(true);
    vi.useRealTimers();
  });

  /** A mark wrapper of the given element type around a content span. */
  function makeMark(tag: "ins" | "del" | "span", content: Element): Element {
    const wrapper = document.createElement(tag);
    wrapper.dataset["userIds"] = '["u1"]';
    wrapper.appendChild(content);
    return wrapper;
  }

  it("skips marks with no layout box, such as inside a collapsed toggle", () => {
    const root = makeRoot();
    // A block-level mark whose whole subtree is hidden: nothing below it has a
    // box, so descending would never find one.
    const hiddenContent = withoutBox(document.createElement("span"));
    hiddenContent.appendChild(withoutBox(document.createElement("div")));
    root.appendChild(makeMark("ins", hiddenContent));
    const visible = withBox(document.createElement("span"));
    root.appendChild(makeMark("ins", visible));

    expect(scrollToFirstChange(root)).toBe(true);
    expect(scrollIntoView.mock.instances[0]).toBe(visible);
  });

  it("falls back to the containing block when every mark is hidden", () => {
    const root = makeRoot();
    // A collapsed toggle: its content is laid out, its child group is not.
    const outer = withBox(document.createElement("div"));
    outer.className = "bn-block-outer";
    const block = withBox(document.createElement("div"));
    block.className = "bn-block";
    const toggleContent = withBox(document.createElement("div"));
    toggleContent.className = "bn-block-content";
    const hiddenGroup = withoutBox(document.createElement("div"));
    hiddenGroup.className = "bn-block-group";
    hiddenGroup.appendChild(
      makeMark("ins", withoutBox(document.createElement("span"))),
    );
    block.append(toggleContent, hiddenGroup);
    outer.appendChild(block);
    root.appendChild(outer);

    expect(scrollToFirstChange(root)).toBe(true);
    expect(scrollIntoView.mock.instances[0]).toBe(toggleContent);
    expect(toggleContent.classList.contains(SCROLL_HIGHLIGHT_CLASS)).toBe(true);
  });

  it("returns false when a hidden mark has no laid-out ancestor below the root", () => {
    const root = makeRoot();
    root.appendChild(
      makeMark("ins", withoutBox(document.createElement("span"))),
    );

    expect(scrollToFirstChange(root)).toBe(false);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("prefers the first insertion over an earlier deletion", () => {
    const root = makeRoot();
    root.appendChild(makeMark("del", withBox(document.createElement("span"))));
    const inserted = withBox(document.createElement("span"));
    root.appendChild(makeMark("ins", inserted));

    scrollToFirstChange(root);

    expect(scrollIntoView.mock.instances[0]).toBe(inserted);
  });

  it("falls back to a format change, then a deletion", () => {
    const root = makeRoot();
    const deleted = withBox(document.createElement("span"));
    root.appendChild(makeMark("del", deleted));
    const formatted = withBox(document.createElement("span"));
    root.appendChild(makeMark("span", formatted));

    scrollToFirstChange(root);
    expect(scrollIntoView.mock.instances[0]).toBe(formatted);

    root.removeChild(root.lastElementChild!);
    scrollToFirstChange(root);
    expect(scrollIntoView.mock.instances[1]).toBe(deleted);
  });

  it("scrolls to and highlights the block's own content for a block-level mark", () => {
    const root = makeRoot();
    // `<ins>` > content span (display: contents) > .bn-block-outer > .bn-block >
    // .bn-block-content, with a nested child block group after the content.
    const content = withoutBox(document.createElement("span"));
    const outer = withBox(document.createElement("div"));
    outer.className = "bn-block-outer";
    const block = withBox(document.createElement("div"));
    block.className = "bn-block";
    const blockContent = withBox(document.createElement("div"));
    blockContent.className = "bn-block-content";
    const childContent = withBox(document.createElement("div"));
    childContent.className = "bn-block-content";
    block.append(blockContent, childContent);
    outer.appendChild(block);
    content.appendChild(outer);
    root.appendChild(makeMark("ins", content));

    scrollToFirstChange(root);

    expect(scrollIntoView.mock.instances[0]).toBe(blockContent);
    expect(blockContent.classList.contains(SCROLL_HIGHLIGHT_CLASS)).toBe(true);
    expect(outer.classList.contains(SCROLL_HIGHLIGHT_CLASS)).toBe(false);
    expect(childContent.classList.contains(SCROLL_HIGHLIGHT_CLASS)).toBe(false);
  });

  it("moves the highlight when a new preview scrolls elsewhere", () => {
    vi.useFakeTimers();
    const root = makeRoot();
    const first = withBox(document.createElement("span"));
    root.appendChild(makeMark("ins", first));
    scrollToFirstChange(root);
    expect(first.classList.contains(SCROLL_HIGHLIGHT_CLASS)).toBe(true);

    root.replaceChildren();
    const second = withBox(document.createElement("span"));
    root.appendChild(makeMark("ins", second));
    scrollToFirstChange(root);

    expect(first.classList.contains(SCROLL_HIGHLIGHT_CLASS)).toBe(false);
    expect(second.classList.contains(SCROLL_HIGHLIGHT_CLASS)).toBe(true);
    // The earlier highlight's timer must not cut the new one short.
    vi.advanceTimersByTime(1400);
    expect(second.classList.contains(SCROLL_HIGHLIGHT_CLASS)).toBe(true);
    vi.advanceTimersByTime(100);
    expect(second.classList.contains(SCROLL_HIGHLIGHT_CLASS)).toBe(false);
    vi.useRealTimers();
  });
});
