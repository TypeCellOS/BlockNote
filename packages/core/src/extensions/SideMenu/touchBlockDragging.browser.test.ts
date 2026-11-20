import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";

import "../../style.css";
import "../../../../react/src/editor/styles.css";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { BlockNoteSchema } from "../../blocks/BlockNoteSchema.js";
import { defaultBlockSpecs } from "../../blocks/defaultBlocks.js";

// Synthetic touch events exercise our recognizer and real editor/drop pipeline;
// viewport changes below are mocked inputs to our keyboard heuristic. These
// tests do not establish native scrolling, iOS selection-handle suppression, or
// software-keyboard behavior. Those require simulator/physical-device input.
let editor: BlockNoteEditor;
let root: HTMLDivElement;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  root = document.createElement("div");
  root.className = "bn-root";
  root.style.cssText = "width:400px;height:300px;overflow:auto";
  document.body.append(root);
  editor = BlockNoteEditor.create({
    initialContent: [
      {
        id: "a",
        type: "heading",
        props: { level: 1 },
        content: "A large heading",
      },
      { id: "b", type: "paragraph", content: "Second paragraph" },
      { id: "c", type: "paragraph", content: "Third paragraph" },
    ],
  });
  editor.mount(root);
});

afterEach(() => {
  editor._tiptapEditor.destroy();
  root.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function content(id = "a") {
  return root.querySelector<HTMLElement>(
    `[data-id="${id}"] .bn-block-content`,
  )!;
}

function point(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  return {
    clientX: rect.left + 30,
    clientY: rect.top + rect.height / 2,
    identifier: 1,
  };
}

function touch(
  type: string,
  target: HTMLElement,
  location = point(target),
  count = 1,
) {
  const event = Object.assign(
    new Event(type, { bubbles: true, cancelable: true }),
    {
      touches:
        type === "touchend" || type === "touchcancel"
          ? []
          : Array.from({ length: count }, (_, i) => ({
              ...location,
              identifier: i + 1,
            })),
      changedTouches: [location],
    },
  );
  target.dispatchEvent(event);
  return event;
}

it("lifts a heading after a hold with a bounded thumbnail, preserving edit permission", async () => {
  const target = content();
  touch("touchstart", target);
  expect(editor.isEditable).toBe(true);
  expect(editor.prosemirrorView.dom.contentEditable).toBe("false");
  await vi.advanceTimersByTimeAsync(449);
  expect(document.querySelector(".bn-drag-preview")).toBeNull();
  await vi.advanceTimersByTimeAsync(2);
  const preview = document.querySelector<HTMLElement>(".bn-drag-preview")!;
  expect(preview).not.toBeNull();
  expect(getComputedStyle(preview).pointerEvents).toBe("none");
  expect(editor.prosemirrorView.dom.contentEditable).toBe("false");
  const rect = preview.getBoundingClientRect();
  expect(rect.width).toBeGreaterThan(0);
  expect(rect.width).toBeLessThanOrEqual(242.1);
  expect(rect.height).toBeLessThanOrEqual(110.1);
  const source = target.closest<HTMLElement>(".bn-block-outer")!;
  const sourceRect = source.getBoundingClientRect();
  const pickup = point(target);
  expect(
    rect.left +
      ((pickup.clientX - sourceRect.left) / sourceRect.width) * rect.width,
  ).toBeCloseTo(pickup.clientX, 1);
  expect(
    rect.top +
      ((pickup.clientY - sourceRect.top) / sourceRect.height) * rect.height,
  ).toBeCloseTo(pickup.clientY, 1);
  const beforeMove = preview.getBoundingClientRect();
  touch("touchmove", target, {
    ...pickup,
    clientX: pickup.clientX + 20,
    clientY: pickup.clientY + 10,
  });
  const afterMove = preview.getBoundingClientRect();
  expect(afterMove.left - beforeMove.left).toBeCloseTo(20, 1);
  expect(afterMove.top - beforeMove.top).toBeCloseTo(10, 1);
  touch("touchcancel", target);
  expect(document.querySelector(".bn-drag-preview")).toBeNull();
  expect(editor.prosemirrorView.dragging).toBeNull();
  expect(editor.prosemirrorView.hasFocus()).toBe(false);
});

it("prevents selectstart during a lift but leaves it unclaimed while editing", async () => {
  const target = content();
  touch("touchstart", target);
  await vi.advanceTimersByTimeAsync(451);
  const selectionStart = new Event("selectstart", {
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(selectionStart);
  expect(selectionStart.defaultPrevented).toBe(true);
  touch("touchcancel", target);
  touch("touchstart", target);
  touch("touchend", target);
  const editingSelectionStart = new Event("selectstart", {
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(editingSelectionStart);
  expect(editingSelectionStart.defaultPrevented).toBe(false);
  expect(editor.prosemirrorView.dom.contentEditable).toBe("true");
});

it("disables DOM editing before contact and after blur on coarse pointers", () => {
  editor._tiptapEditor.destroy();
  const matchMedia = window.matchMedia.bind(window);
  vi.spyOn(window, "matchMedia").mockImplementation((query) => {
    const result = matchMedia(query);
    if (query === "(pointer: coarse)") {
      Object.defineProperty(result, "matches", { value: true });
    }
    return result;
  });
  editor = BlockNoteEditor.create({
    initialContent: [{ id: "a", type: "paragraph", content: "Touch browsing" }],
  });
  editor.mount(root);
  const dom = editor.prosemirrorView.dom;
  expect(dom.contentEditable).toBe("false");
  expect(editor.isEditable).toBe(true);
  touch("touchstart", content());
  touch("touchend", content());
  expect(dom.contentEditable).toBe("true");
  expect(editor.prosemirrorView.hasFocus()).toBe(true);
  dom.blur();
  expect(dom.contentEditable).toBe("false");
});

it("leaves pre-hold movement unprevented and cancels pickup", async () => {
  const target = content();
  touch("touchstart", target);
  const event = touch("touchmove", target, {
    ...point(target),
    clientY: point(target).clientY + 20,
  });
  expect(event.defaultPrevented).toBe(false);
  await vi.advanceTimersByTimeAsync(500);
  expect(document.querySelector(".bn-drag-preview")).toBeNull();
  expect(editor.document.map((block) => block.id)).toEqual(["a", "b", "c"]);
});

it("a tap enters text editing and a subsequent hold does not start block dragging", async () => {
  const target = content("b");
  touch("touchstart", target);
  touch("touchend", target);
  expect(editor.prosemirrorView.dom.contentEditable).toBe("true");
  expect(editor.prosemirrorView.hasFocus()).toBe(true);
  expect(editor.prosemirrorView.state.selection.toJSON().type).toBe("text");
  touch("touchstart", target);
  await vi.advanceTimersByTimeAsync(500);
  expect(document.querySelector(".bn-drag-preview")).toBeNull();
});

it("moves the actual held block without regenerating IDs or opening text editing", async () => {
  const before = editor.document;
  const source = content("c");
  touch("touchstart", source);
  await vi.advanceTimersByTimeAsync(451);
  const destination = {
    ...point(content("a")),
    clientY: content("a").getBoundingClientRect().top + 1,
  };
  expect(touch("touchmove", source, destination).defaultPrevented).toBe(true);
  touch("touchend", source, destination);
  expect(editor.document).toEqual([before[2], before[0], before[1]]);
  expect(editor.prosemirrorView.hasFocus()).toBe(false);
  expect(editor.prosemirrorView.dom.contentEditable).toBe("false");
  expect(editor.prosemirrorView.state.selection.toJSON().type).toBe("node");
});

it("a second finger cancels the hold without preventing the touch event", async () => {
  const target = content();
  touch("touchstart", target);
  expect(touch("touchstart", target, point(target), 2).defaultPrevented).toBe(
    false,
  );
  await vi.advanceTimersByTimeAsync(500);
  expect(document.querySelector(".bn-drag-preview")).toBeNull();
});

it("a second finger outside the editor cancels an active lift", async () => {
  touch("touchstart", content());
  await vi.advanceTimersByTimeAsync(451);
  expect(document.querySelector(".bn-drag-preview")).not.toBeNull();
  expect(touch("touchstart", root, point(root), 2).defaultPrevented).toBe(
    false,
  );
  expect(document.querySelector(".bn-drag-preview")).toBeNull();
  expect(editor.prosemirrorView.dragging).toBeNull();
  expect(editor.prosemirrorView.dom.contentEditable).toBe("false");
});

it.each(["a", "button", "input", "div"])(
  "does not lift an interactive %s element",
  async (tag) => {
    const control = document.createElement(tag);
    if (tag === "div") {
      control.contentEditable = "true";
    }
    content().append(control);
    touch("touchstart", control);
    await vi.advanceTimersByTimeAsync(500);
    expect(document.querySelector(".bn-drag-preview")).toBeNull();
    touch("touchend", control);
    expect(editor.prosemirrorView.hasFocus()).toBe(false);
  },
);

it("does not lift read-only content", async () => {
  editor.isEditable = false;
  touch("touchstart", content());
  await vi.advanceTimersByTimeAsync(500);
  expect(document.querySelector(".bn-drag-preview")).toBeNull();
});

it("allows tapping non-draggable blocks into editing without lifting them", async () => {
  editor._tiptapEditor.destroy();
  const matchMedia = window.matchMedia.bind(window);
  vi.spyOn(window, "matchMedia").mockImplementation((query) => {
    const result = matchMedia(query);
    if (query === "(pointer: coarse)") {
      Object.defineProperty(result, "matches", { value: true });
    }
    return result;
  });
  editor = BlockNoteEditor.create({
    schema: BlockNoteSchema.create({
      blockSpecs: {
        ...defaultBlockSpecs,
        paragraph: {
          ...defaultBlockSpecs.paragraph,
          implementation: {
            ...defaultBlockSpecs.paragraph.implementation,
            meta: { draggable: false },
          },
        },
      },
    }),
    initialContent: [
      { id: "a", type: "paragraph", content: "Editable, not draggable" },
    ],
  });
  editor.mount(root);
  expect(editor.prosemirrorView.dom.contentEditable).toBe("false");
  touch("touchstart", content());
  await vi.advanceTimersByTimeAsync(451);
  expect(document.querySelector(".bn-drag-preview")).toBeNull();
  touch("touchend", content());
  expect(editor.prosemirrorView.hasFocus()).toBe(true);
  expect(editor.prosemirrorView.dom.contentEditable).toBe("true");
});

it("routes a touch drop inside dropMargin to the real editor, not its preview", async () => {
  const before = editor.document;
  const source = content("c");
  touch("touchstart", source);
  await vi.advanceTimersByTimeAsync(451);
  const destination = {
    ...point(source),
    clientX: root.getBoundingClientRect().right + 20,
    // Aim below the heading, so all engines resolve the same insertion side
    // rather than choosing between its start/end at the far right of its line.
    clientY: content("a").getBoundingClientRect().bottom - 1,
  };
  touch("touchmove", source, destination);
  touch("touchend", source, destination);
  expect(editor.document).toEqual([before[0], before[2], before[1]]);
});

it("keeps browsing across document updates without overriding application read-only permission", () => {
  touch("touchstart", content());
  touch("touchcancel", content());
  editor.insertBlocks(
    [{ type: "paragraph", content: "Remote update" }],
    "c",
    "after",
  );
  expect(editor.prosemirrorView.dom.contentEditable).toBe("false");
  expect(editor.isEditable).toBe(true);
  editor.isEditable = false;
  content().dispatchEvent(
    new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse" }),
  );
  expect(editor.prosemirrorView.dom.contentEditable).toBe("false");
  expect(editor.isEditable).toBe(false);
});

it("keeps mouse editing focused after a desktop-sized viewport shrink and recovery", () => {
  const viewport = window.visualViewport!;
  const height = viewport.height;
  const mockHeight = vi
    .spyOn(viewport, "height", "get")
    .mockReturnValue(height);
  content().dispatchEvent(
    new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse" }),
  );
  editor.prosemirrorView.focus();
  mockHeight.mockReturnValue(height - 300);
  viewport.dispatchEvent(new Event("resize"));
  mockHeight.mockReturnValue(height);
  viewport.dispatchEvent(new Event("resize"));
  expect(editor.prosemirrorView.hasFocus()).toBe(true);
  expect(editor.prosemirrorView.dom.contentEditable).toBe("true");
});

it("isolates preview sizing from later application editor layout rules", async () => {
  // Supply the outer themed root normally provided by UI integrations.
  const themedRoot = document.createElement("div");
  themedRoot.className = "bn-root";
  root.before(themedRoot);
  themedRoot.append(root);
  const style = document.createElement("style");
  style.textContent =
    ".bn-root .bn-editor { min-height: 500px; padding: 40px; }";
  try {
    touch("touchstart", content());
    await vi.advanceTimersByTimeAsync(451);
    document.head.append(style);
    const previewEditor = document.querySelector<HTMLElement>(
      ".bn-drag-preview > .bn-editor",
    )!;
    expect(previewEditor.matches(".bn-root .bn-editor")).toBe(true);
    expect(getComputedStyle(previewEditor).minHeight).toBe("0px");
    expect(getComputedStyle(previewEditor).padding).toBe("0px");
  } finally {
    touch("touchcancel", content());
    style.remove();
    themedRoot.replaceWith(root);
  }
});

it.each([false, true])(
  "clears drop feedback when a touch lift over a toggle (%s) is canceled",
  async (toggle) => {
    if (toggle) {
      editor.updateBlock("b", { type: "toggleListItem" });
    }
    const source = content("c");
    touch("touchstart", source);
    await vi.advanceTimersByTimeAsync(451);
    const destination = point(content("b"));
    touch("touchmove", source, {
      ...destination,
      clientY: toggle
        ? destination.clientY
        : content("b").getBoundingClientRect().bottom - 1,
    });
    const feedback = '[data-drop-target], [class*="prosemirror-dropcursor-"]';
    expect(document.querySelector(feedback)).not.toBeNull();
    touch("touchcancel", source);
    await vi.advanceTimersByTimeAsync(21);
    expect(document.querySelector(feedback)).toBeNull();
  },
);

it("disables DOM editing after a mocked viewport shrink and recovery", () => {
  const viewport = window.visualViewport!;
  const height = viewport.height;
  const mockHeight = vi
    .spyOn(viewport, "height", "get")
    .mockReturnValue(height);
  const target = content("b");
  touch("touchstart", target);
  touch("touchend", target);
  mockHeight.mockReturnValue(height - 300);
  viewport.dispatchEvent(new Event("resize"));
  expect(editor.prosemirrorView.hasFocus()).toBe(true);
  mockHeight.mockReturnValue(height);
  viewport.dispatchEvent(new Event("resize"));
  expect(editor.prosemirrorView.hasFocus()).toBe(false);
  expect(editor.prosemirrorView.dom.contentEditable).toBe("false");
  expect(editor.isEditable).toBe(true);
});

it("keeps DOM editing enabled for small or zoomed mocked viewport resizes", () => {
  const viewport = window.visualViewport!;
  const height = viewport.height;
  const mockHeight = vi
    .spyOn(viewport, "height", "get")
    .mockReturnValue(height);
  const mockScale = vi.spyOn(viewport, "scale", "get").mockReturnValue(1);
  const target = content("b");
  touch("touchstart", target);
  touch("touchend", target);
  mockHeight.mockReturnValue(height - 50);
  viewport.dispatchEvent(new Event("resize"));
  mockHeight.mockReturnValue(height);
  viewport.dispatchEvent(new Event("resize"));
  expect(editor.prosemirrorView.hasFocus()).toBe(true);
  mockScale.mockReturnValue(2);
  mockHeight.mockReturnValue(height / 2);
  viewport.dispatchEvent(new Event("resize"));
  mockScale.mockReturnValue(1);
  mockHeight.mockReturnValue(height);
  viewport.dispatchEvent(new Event("resize"));
  expect(editor.prosemirrorView.hasFocus()).toBe(true);
});

it("restores DOM editing for mouse input after touch browsing", () => {
  touch("touchstart", content());
  touch("touchcancel", content());
  expect(editor.prosemirrorView.dom.contentEditable).toBe("false");
  content().dispatchEvent(
    new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse" }),
  );
  expect(editor.prosemirrorView.dom.contentEditable).toBe("true");
});

it("scrolls at the visible edge while lifted, then stops on cancellation", async () => {
  editor.insertBlocks(
    Array.from({ length: 20 }, (_, i) => ({
      type: "paragraph" as const,
      content: `Block ${i}`,
    })),
    "c",
    "after",
  );
  const frames: FrameRequestCallback[] = [];
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    frames.push(callback);
    return frames.length;
  });
  const cancel = vi.spyOn(window, "cancelAnimationFrame");
  const target = content();
  touch("touchstart", target);
  await vi.advanceTimersByTimeAsync(451);
  touch("touchmove", target, {
    ...point(target),
    clientY: root.getBoundingClientRect().bottom - 1,
  });
  frames.shift()!(0);
  expect(root.scrollTop).toBeGreaterThan(0);
  touch("touchcancel", target);
  expect(cancel).toHaveBeenCalled();
  const scrollTop = root.scrollTop;
  frames.shift()!(16);
  expect(root.scrollTop).toBe(scrollTop);
});

it.each([100, 451])(
  "cleans up on unmount after %i ms without a delayed lift",
  async (delay) => {
    touch("touchstart", content());
    await vi.advanceTimersByTimeAsync(delay);
    expect(document.querySelector(".bn-drag-preview") !== null).toBe(
      delay >= 450,
    );
    editor.unmount();
    expect(document.querySelector(".bn-drag-preview")).toBeNull();
    await vi.advanceTimersByTimeAsync(500);
    expect(document.querySelector(".bn-drag-preview")).toBeNull();
  },
);
