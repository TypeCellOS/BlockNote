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

import { scrollToFirstChange } from "./scrollToFirstChange.js";

// jsdom implements neither `scrollIntoView` nor layout, so both are installed
// here: `scrollIntoView` to observe the call, `getBoundingClientRect` per
// element to model which nodes have a box.
const originalAnimate = Object.getOwnPropertyDescriptor(
  Element.prototype,
  "animate",
);
const animate = vi.fn(
  (
    _frames: Keyframe[] | PropertyIndexedKeyframes | null,
    _options?: number | KeyframeAnimationOptions,
  ): { cancel: ReturnType<typeof vi.fn>; onfinish?: () => void } => ({
    cancel: vi.fn(),
  }),
);
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
  animate.mockClear();
  Object.defineProperty(Element.prototype, "animate", {
    configurable: true,
    value: animate,
  });
  scrollIntoView = vi.fn<Element["scrollIntoView"]>();
  Element.prototype.scrollIntoView = scrollIntoView;
});

afterEach(() => {
  document.body.innerHTML = "";
  if (originalAnimate) {
    Object.defineProperty(Element.prototype, "animate", originalAnimate);
  } else {
    Reflect.deleteProperty(Element.prototype, "animate");
  }
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

    const frames = animate.mock.calls.at(-1)?.[0];
    expect(frames).toEqual([
      expect.not.objectContaining({ transform: expect.anything() }),
      expect.not.objectContaining({ transform: expect.anything() }),
    ]);

    Reflect.deleteProperty(window, "matchMedia");
  });

  it("highlights without DOM mutations and releases the finished animation", () => {
    const root = makeRoot();
    const block = document.createElement("div");
    block.className = "bn-block-content";
    const wrapper = document.createElement("span");
    wrapper.dataset["userIds"] = '["u1"]';
    wrapper.appendChild(withBox(document.createElement("span")));
    block.appendChild(wrapper);
    root.appendChild(block);

    const observer = new MutationObserver(() => {});
    observer.observe(root, {
      attributes: true,
      childList: true,
      subtree: true,
    });
    scrollToFirstChange(root);
    expect(observer.takeRecords()).toEqual([]);
    observer.disconnect();
    // The whole block, not the mark that was scrolled to.
    expect(animate.mock.instances[0]).toBe(block);
    expect(block.className).toBe("bn-block-content");
    expect(block.hasAttribute("style")).toBe(false);
    expect(animate).toHaveBeenCalledWith(expect.any(Array), {
      duration: 1500,
      fill: "none",
    });

    const animation = animate.mock.results[0]!.value;
    animation.onfinish?.();
    scrollToFirstChange(root);
    expect(animation.cancel).not.toHaveBeenCalled();
  });

  it("highlights the scrolled-to element when it is in no block", () => {
    const root = makeRoot();
    const wrapper = document.createElement("span");
    wrapper.dataset["userIds"] = '["u1"]';
    const content = withBox(document.createElement("span"));
    wrapper.appendChild(content);
    root.appendChild(wrapper);

    scrollToFirstChange(root);
    expect(animate.mock.instances.at(-1)).toBe(content);
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
    expect(animate.mock.instances.at(-1)).toBe(toggleContent);
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
    expect(animate.mock.instances.at(-1)).toBe(blockContent);
    expect(animate).toHaveBeenCalledTimes(1);
  });

  it("moves the highlight when a new preview scrolls elsewhere", () => {
    const root = makeRoot();
    const first = withBox(document.createElement("span"));
    root.appendChild(makeMark("ins", first));
    scrollToFirstChange(root);
    expect(animate.mock.instances.at(-1)).toBe(first);

    root.replaceChildren();
    const second = withBox(document.createElement("span"));
    root.appendChild(makeMark("ins", second));
    scrollToFirstChange(root);

    expect(animate.mock.results[0]!.value.cancel).toHaveBeenCalledOnce();
    expect(animate.mock.instances.at(-1)).toBe(second);
    // A late finish event from the cancelled pulse must not clear its successor.
    animate.mock.results[0]!.value.onfinish?.();
    scrollToFirstChange(root);
    expect(animate.mock.results[1]!.value.cancel).toHaveBeenCalledOnce();
  });
});
